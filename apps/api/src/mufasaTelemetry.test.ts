import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { buildPaymentTelemetry, deterministicTelemetryEventId, emitMufasaTelemetry } from './mufasaTelemetry.js';

afterEach(() => { delete (globalThis as { fetch?: typeof fetch }).fetch; });

test('builds pseudonymous stable payment telemetry without raw phone', () => {
  const event = buildPaymentTelemetry({ paymentRequestId: 'pay-1', succeeded: true, occurredAt: '2026-07-10T20:00:00.000Z', accountId: 'account-1', phone: '0712345678', amountKshCents: 25000, method: 'mpesa', providerEventId: 'receipt-1', phoneHmacSecret: 'phone-secret' });
  assert.equal(event.type, 'payment.succeeded');
  assert.equal(event.payload.amount, 250);
  assert.match(event.payload.phone_hash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(event).includes('0712345678'), false);
  assert.equal(event.event_id, deterministicTelemetryEventId('pay-1:succeeded'));
});

test('signs and sends exact raw envelope', async () => {
  let request: RequestInit | undefined;
  (globalThis as { fetch?: typeof fetch }).fetch = (async (_url, init) => { request = init; return new Response('{}', { status: 202 }); }) as typeof fetch;
  const result = await emitMufasaTelemetry({ contract: 'kitabu-telemetry/v1', event_id: deterministicTelemetryEventId('test'), ts: new Date().toISOString(), type: 'usage.session', payload: { account_id: 'a', duration_seconds: 1 } }, { endpoint: 'https://mufasa.example/ingest/kitabu/v1', hmacSecret: 'secret' });
  assert.equal(result.ok, true);
  assert.match(String((request?.headers as Record<string, string>)['x-kitabu-signature']), /^v1=[0-9a-f]{64}$/);
});
