import { createHash, createHmac } from 'node:crypto';

export type MufasaTelemetryType = 'payment.succeeded' | 'payment.failed' | 'usage.session';

function canonicalizePhone(phone: string) {
  const value = phone.replace(/[\s()-]/g, '');
  const e164 = value.startsWith('+') ? value : value.startsWith('254') ? `+${value}` : value.startsWith('0') ? `+254${value.slice(1)}` : value;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) throw new Error('MUFASA telemetry requires a valid E.164 phone');
  return e164;
}

export function deterministicTelemetryEventId(subject: string) {
  const hex = createHash('sha256').update(subject).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ['8', '9', 'a', 'b'][parseInt(hex[16], 16) % 4];
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function kitabuTelemetryPhoneHash(phone: string, secret: string) {
  if (!secret) throw new Error('KITABU_MUFASA_PHONE_HMAC_SECRET is required');
  return createHmac('sha256', secret).update(canonicalizePhone(phone)).digest('hex');
}

export function buildPaymentTelemetry(input: { paymentRequestId: string; succeeded: boolean; occurredAt: string; accountId: string; phone: string; amountKshCents: number; method: string; providerEventId: string; phoneHmacSecret: string }) {
  return {
    contract: 'kitabu-telemetry/v1',
    event_id: deterministicTelemetryEventId(`${input.paymentRequestId}:${input.succeeded ? 'succeeded' : 'failed'}`),
    ts: input.occurredAt,
    type: input.succeeded ? 'payment.succeeded' : 'payment.failed',
    payload: {
      amount: input.amountKshCents / 100,
      currency: 'KES',
      method: input.method,
      account_id: input.accountId,
      phone_hash: kitabuTelemetryPhoneHash(input.phone, input.phoneHmacSecret),
      provider_event_id: input.providerEventId
    }
  } as const;
}

export async function emitMufasaTelemetry(envelope: object, config: { endpoint?: string; hmacSecret?: string; timeoutMs?: number }) {
  if (!config.endpoint || !config.hmacSecret) return { ok: false, skipped: true, reason: 'mufasa_telemetry_not_configured' } as const;
  const raw = JSON.stringify(envelope);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', config.hmacSecret).update(`${timestamp}.${raw}`).digest('hex');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 5000);
  try {
    const response = await fetch(config.endpoint, { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', 'x-kitabu-timestamp': timestamp, 'x-kitabu-signature': `v1=${signature}` }, body: raw });
    if (!response.ok) throw new Error(`mufasa_telemetry_http_${response.status}`);
    return { ok: true, skipped: false, status: response.status } as const;
  } finally {
    clearTimeout(timeout);
  }
}
