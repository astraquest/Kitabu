import { createHash } from 'node:crypto';
import { appConfig } from './config.js';

export type BillingPlanCode =
  | 'weekly'
  | 'monthly'
  | 'annual'
  | 'admin_weekly'
  | 'trial_monthly_1bob';

export const SCHOOL_BILLING_PLAN_CODES = ['weekly', 'monthly', 'annual'] as const;
export type SchoolBillingPlanCode = (typeof SCHOOL_BILLING_PLAN_CODES)[number];

export function normalizeSchoolPlanSelection(
  availablePlanCodes: SchoolBillingPlanCode[],
  requestedPrimaryPlanCode?: SchoolBillingPlanCode
) {
  const normalizedPlanCodes = Array.from(new Set(availablePlanCodes));
  const assignedPlanCode = requestedPrimaryPlanCode && normalizedPlanCodes.includes(requestedPrimaryPlanCode)
    ? requestedPrimaryPlanCode
    : normalizedPlanCodes.includes('monthly')
      ? 'monthly'
      : normalizedPlanCodes[0];

  return { availablePlanCodes: normalizedPlanCodes, assignedPlanCode };
}

export function schoolManagedPlanPriceKshCents(input: {
  planCode: BillingPlanCode;
  assignedPlanCode: BillingPlanCode;
  assignedPlanPriceKshCents: number;
  standardPlanPriceKshCents: number;
  planPricesKshCents?: Record<string, number>;
}) {
  const configuredPrice = Number(input.planPricesKshCents?.[input.planCode]);
  if (Number.isFinite(configuredPrice) && configuredPrice >= 0) {
    return configuredPrice;
  }

  return input.planCode === input.assignedPlanCode
    ? input.assignedPlanPriceKshCents
    : input.standardPlanPriceKshCents;
}

export interface DarajaStkPushRequest {
  amountKsh: number;
  phoneNumber: string;
  reference: string;
  description: string;
}

export interface DarajaStkPushResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  customerMessage: string;
}

export interface DarajaStkQueryResponse {
  merchantRequestId: string;
  checkoutRequestId: string;
  responseCode: string;
  responseDescription: string;
  resultCode: number;
  resultDescription: string;
}

export interface VerifiedMpesaCallback {
  resultCode: number;
  resultDescription: string;
  receiptNumber: string | null;
  providerResponse: DarajaStkQueryResponse;
}

export class MpesaProviderError extends Error {
  public readonly providerStatus?: number;
  public readonly providerResponse?: string;

  constructor(message: string, options: { providerStatus?: number; providerResponse?: string } = {}) {
    super(message);
    this.name = 'MpesaProviderError';
    this.providerStatus = options.providerStatus;
    this.providerResponse = options.providerResponse;
  }
}

const darajaBaseUrl =
  appConfig.KITABU_MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

function trimProviderResponse(input: string) {
  return input.replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function readProviderResponse(response: Response) {
  const responseText = trimProviderResponse(await response.text());
  if (!responseText) {
    return {};
  }

  try {
    return JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    return { rawResponse: responseText };
  }
}

function darajaTimestamp() {
  return new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function darajaPassword(timestamp: string) {
  return Buffer.from(
    `${appConfig.KITABU_MPESA_SHORTCODE}${appConfig.KITABU_MPESA_PASSKEY}${timestamp}`
  ).toString('base64');
}

function providerFetchOptions(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    signal: AbortSignal.timeout(appConfig.KITABU_MPESA_PROVIDER_TIMEOUT_MS)
  };
}

function requireDarajaConfig() {
  const missing = [
    ['KITABU_MPESA_CONSUMER_KEY', appConfig.KITABU_MPESA_CONSUMER_KEY],
    ['KITABU_MPESA_CONSUMER_SECRET', appConfig.KITABU_MPESA_CONSUMER_SECRET],
    ['KITABU_MPESA_SHORTCODE', appConfig.KITABU_MPESA_SHORTCODE],
    ['KITABU_MPESA_PASSKEY', appConfig.KITABU_MPESA_PASSKEY]
  ].filter(([, value]) => !value);

  if (missing.length > 0) {
    throw new Error(`Missing M-Pesa config: ${missing.map(([key]) => key).join(', ')}`);
  }
}

export function formatKenyanPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('254') && digits.length === 12) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `254${digits.slice(1)}`;
  }

  if (digits.length === 9 && digits.startsWith('7')) {
    return `254${digits}`;
  }

  throw new Error('Enter a valid Safaricom M-Pesa number');
}

export function maskKenyanPhoneNumber(input: string | null) {
  if (!input) {
    return null;
  }

  const normalized = formatKenyanPhoneNumber(input);
  return `${normalized.slice(0, 6)}***${normalized.slice(-3)}`;
}

export function buildSubscriptionReference(userId: string, planCode: BillingPlanCode) {
  const compactUserId = createHash('sha1').update(userId).digest('hex').slice(0, 10).toUpperCase();
  return `${appConfig.KITABU_MPESA_ACCOUNT_REFERENCE}-${planCode.toUpperCase()}-${compactUserId}`;
}

async function getDarajaAccessToken() {
  requireDarajaConfig();

  const credentials = Buffer.from(
    `${appConfig.KITABU_MPESA_CONSUMER_KEY}:${appConfig.KITABU_MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const response = await fetch(`${darajaBaseUrl}/oauth/v1/generate?grant_type=client_credentials`, providerFetchOptions({
    headers: {
      Authorization: `Basic ${credentials}`
    }
  }));

  const payload = (await readProviderResponse(response)) as { access_token?: string };

  if (!response.ok) {
    const providerResponse = trimProviderResponse(JSON.stringify(payload));
    throw new MpesaProviderError(`Daraja OAuth failed with HTTP ${response.status}`, {
      providerStatus: response.status,
      providerResponse
    });
  }

  if (!payload.access_token) {
    throw new MpesaProviderError('Daraja OAuth response did not include an access token', {
      providerStatus: response.status,
      providerResponse: trimProviderResponse(JSON.stringify(payload))
    });
  }

  return payload.access_token;
}

export async function initiateStkPush(input: DarajaStkPushRequest): Promise<DarajaStkPushResponse> {
  requireDarajaConfig();

  const accessToken = await getDarajaAccessToken();
  const timestamp = darajaTimestamp();
  const password = darajaPassword(timestamp);

  const response = await fetch(`${darajaBaseUrl}/mpesa/stkpush/v1/processrequest`, providerFetchOptions({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: appConfig.KITABU_MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.max(1, Math.round(input.amountKsh)),
      PartyA: input.phoneNumber,
      PartyB: appConfig.KITABU_MPESA_SHORTCODE,
      PhoneNumber: input.phoneNumber,
      CallBackURL: appConfig.KITABU_MPESA_CALLBACK_URL,
      AccountReference: input.reference,
      TransactionDesc: input.description
    })
  }));

  const payload = (await readProviderResponse(response)) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    CustomerMessage?: string;
    errorMessage?: string;
  };

  if (!response.ok || payload.ResponseCode !== '0') {
    const providerMessage = payload.errorMessage || payload.ResponseDescription || 'Unable to start M-Pesa checkout';
    throw new MpesaProviderError(providerMessage, {
      providerStatus: response.status,
      providerResponse: trimProviderResponse(JSON.stringify(payload))
    });
  }

  if (!payload.MerchantRequestID || !payload.CheckoutRequestID) {
    throw new MpesaProviderError('M-Pesa checkout response is incomplete', {
      providerStatus: response.status,
      providerResponse: trimProviderResponse(JSON.stringify(payload))
    });
  }

  return {
    merchantRequestId: payload.MerchantRequestID,
    checkoutRequestId: payload.CheckoutRequestID,
    responseCode: payload.ResponseCode,
    responseDescription: payload.ResponseDescription ?? 'STK Push sent',
    customerMessage: payload.CustomerMessage ?? 'Check your phone to complete payment'
  };
}

function parseProviderResultCode(value: unknown) {
  const resultCode = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(resultCode)) {
    throw new MpesaProviderError('M-Pesa query response did not include a valid result code');
  }
  return resultCode;
}

export async function queryStkPushStatus(checkoutRequestId: string): Promise<DarajaStkQueryResponse> {
  requireDarajaConfig();

  const normalizedCheckoutRequestId = checkoutRequestId.trim();
  if (!normalizedCheckoutRequestId) {
    throw new Error('Checkout request ID is required');
  }

  const accessToken = await getDarajaAccessToken();
  const timestamp = darajaTimestamp();
  const response = await fetch(`${darajaBaseUrl}/mpesa/stkpushquery/v1/query`, providerFetchOptions({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      BusinessShortCode: appConfig.KITABU_MPESA_SHORTCODE,
      Password: darajaPassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: normalizedCheckoutRequestId
    })
  }));

  const payload = (await readProviderResponse(response)) as {
    MerchantRequestID?: string;
    CheckoutRequestID?: string;
    ResponseCode?: string;
    ResponseDescription?: string;
    ResultCode?: string | number;
    ResultDesc?: string;
    errorMessage?: string;
  };

  if (!response.ok || payload.ResponseCode !== '0') {
    const providerMessage = payload.errorMessage || payload.ResponseDescription || 'Unable to verify M-Pesa checkout';
    throw new MpesaProviderError(providerMessage, {
      providerStatus: response.status,
      providerResponse: trimProviderResponse(JSON.stringify(payload))
    });
  }

  if (!payload.MerchantRequestID || !payload.CheckoutRequestID) {
    throw new MpesaProviderError('M-Pesa query response is incomplete', {
      providerStatus: response.status,
      providerResponse: trimProviderResponse(JSON.stringify(payload))
    });
  }

  return {
    merchantRequestId: payload.MerchantRequestID,
    checkoutRequestId: payload.CheckoutRequestID,
    responseCode: payload.ResponseCode,
    responseDescription: payload.ResponseDescription ?? 'M-Pesa checkout verified',
    resultCode: parseProviderResultCode(payload.ResultCode),
    resultDescription: payload.ResultDesc ?? 'M-Pesa checkout status verified'
  };
}

export function verifyMpesaCallback(input: {
  expectedMerchantRequestId: string;
  expectedCheckoutRequestId: string;
  expectedAmountKshCents: number;
  expectedPhoneNumber: string;
  callbackMerchantRequestId?: string;
  callbackCheckoutRequestId: string;
  callbackResultCode: number;
  callbackResultDescription: string;
  callbackAmount?: string | number;
  callbackPhoneNumber?: string | number;
  callbackReceiptNumber?: string | number;
  providerResponse: DarajaStkQueryResponse;
}): VerifiedMpesaCallback {
  const merchantRequestId = input.callbackMerchantRequestId?.trim();
  if (
    !merchantRequestId ||
    merchantRequestId !== input.expectedMerchantRequestId ||
    input.providerResponse.merchantRequestId !== input.expectedMerchantRequestId
  ) {
    throw new Error('M-Pesa merchant request ID did not match the stored checkout');
  }

  if (
    input.callbackCheckoutRequestId !== input.expectedCheckoutRequestId ||
    input.providerResponse.checkoutRequestId !== input.expectedCheckoutRequestId
  ) {
    throw new Error('M-Pesa checkout request ID did not match the stored checkout');
  }

  if (input.providerResponse.resultCode !== input.callbackResultCode) {
    throw new Error('M-Pesa callback result did not match the provider query');
  }

  if (input.callbackResultCode !== 0) {
    return {
      resultCode: input.providerResponse.resultCode,
      resultDescription: input.providerResponse.resultDescription || input.callbackResultDescription,
      receiptNumber: null,
      providerResponse: input.providerResponse
    };
  }

  const amount = Number(input.callbackAmount);
  if (!Number.isFinite(amount) || Math.round(amount * 100) !== input.expectedAmountKshCents) {
    throw new Error('M-Pesa callback amount did not match the checkout amount');
  }

  const callbackPhoneNumber = formatKenyanPhoneNumber(String(input.callbackPhoneNumber ?? ''));
  if (callbackPhoneNumber !== formatKenyanPhoneNumber(input.expectedPhoneNumber)) {
    throw new Error('M-Pesa callback phone number did not match the checkout phone number');
  }

  const receiptNumber = String(input.callbackReceiptNumber ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,40}$/.test(receiptNumber)) {
    throw new Error('M-Pesa callback did not include a valid receipt number');
  }

  return {
    resultCode: input.providerResponse.resultCode,
    resultDescription: input.providerResponse.resultDescription || input.callbackResultDescription,
    receiptNumber,
    providerResponse: input.providerResponse
  };
}
