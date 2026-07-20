import assert from 'node:assert/strict';
import test, { afterEach, before } from 'node:test';

before(() => {
  process.env.KITABU_DATABASE_URL = 'postgres://kitabu:kitabu@localhost:5432/kitabu';
  process.env.KITABU_REDIS_URL = 'redis://localhost:6379';
  process.env.KITABU_JWT_ISSUER = 'kitabu-test';
  process.env.KITABU_JWT_AUDIENCE = 'kitabu-test';
  process.env.KITABU_JWT_PRIVATE_KEY = 'test-private-key';
  process.env.KITABU_JWT_PUBLIC_KEY = 'test-public-key';
  process.env.KITABU_MPESA_ENV = 'sandbox';
  process.env.KITABU_MPESA_CONSUMER_KEY = ' consumer-key ';
  process.env.KITABU_MPESA_CONSUMER_SECRET = ' consumer-secret ';
  process.env.KITABU_MPESA_SHORTCODE = ' 174379 ';
  process.env.KITABU_MPESA_PASSKEY = ' passkey ';
});

afterEach(() => {
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

test('initiates STK push with trimmed M-Pesa credentials', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  (globalThis as { fetch?: typeof fetch }).fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    if (String(url).includes('/oauth/')) {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }

    return new Response(JSON.stringify({
      MerchantRequestID: 'merchant-1',
      CheckoutRequestID: 'checkout-1',
      ResponseCode: '0',
      ResponseDescription: 'Accepted',
      CustomerMessage: 'Success'
    }), { status: 200 });
  }) as typeof fetch;

  const { initiateStkPush } = await import('./payments.js');
  const response = await initiateStkPush({
    amountKsh: 250,
    phoneNumber: '254712345678',
    reference: 'KITABU-WEEKLY',
    description: 'Kitabu Subscription'
  });

  assert.equal(response.checkoutRequestId, 'checkout-1');
  assert.equal(calls.length, 2);
  assert.equal(
    calls[0].init?.headers && (calls[0].init.headers as Record<string, string>).Authorization,
    `Basic ${Buffer.from('consumer-key:consumer-secret').toString('base64')}`
  );

  const stkBody = JSON.parse(String(calls[1].init?.body)) as { BusinessShortCode: string; PartyB: string };
  assert.equal(stkBody.BusinessShortCode, '174379');
  assert.equal(stkBody.PartyB, '174379');
});

test('includes Daraja OAuth status in provider errors', async () => {
  (globalThis as { fetch?: typeof fetch }).fetch = (async () => new Response(
    JSON.stringify({ errorCode: '400.002.02', errorMessage: 'Bad Request - Invalid Credentials' }),
    { status: 401 }
  )) as typeof fetch;

  const { initiateStkPush, MpesaProviderError } = await import('./payments.js');

  await assert.rejects(
    () => initiateStkPush({
      amountKsh: 250,
      phoneNumber: '254712345678',
      reference: 'KITABU-WEEKLY',
      description: 'Kitabu Subscription'
    }),
    error => {
      assert.ok(error instanceof MpesaProviderError);
      assert.equal(error.message, 'Daraja OAuth failed with HTTP 401');
      assert.equal(error.providerStatus, 401);
      assert.match(error.providerResponse ?? '', /Invalid Credentials/);
      return true;
    }
  );
});

test('queries Daraja before accepting an STK result', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  (globalThis as { fetch?: typeof fetch }).fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/oauth/')) {
      return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
    }
    return new Response(JSON.stringify({
      MerchantRequestID: 'merchant-1',
      CheckoutRequestID: 'checkout-1',
      ResponseCode: '0',
      ResponseDescription: 'The service request has been accepted successfully',
      ResultCode: '0',
      ResultDesc: 'The service request is processed successfully.'
    }), { status: 200 });
  }) as typeof fetch;

  const { queryStkPushStatus } = await import('./payments.js');
  const response = await queryStkPushStatus('checkout-1');

  assert.equal(response.resultCode, 0);
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /\/mpesa\/stkpushquery\/v1\/query$/);
  const queryBody = JSON.parse(String(calls[1].init?.body)) as { CheckoutRequestID: string };
  assert.equal(queryBody.CheckoutRequestID, 'checkout-1');
});

test('verifies successful callback identity, amount, phone and receipt', async () => {
  const { verifyMpesaCallback } = await import('./payments.js');
  const verified = verifyMpesaCallback({
    expectedMerchantRequestId: 'merchant-1',
    expectedCheckoutRequestId: 'checkout-1',
    expectedAmountKshCents: 25000,
    expectedPhoneNumber: '254712345678',
    callbackMerchantRequestId: 'merchant-1',
    callbackCheckoutRequestId: 'checkout-1',
    callbackResultCode: 0,
    callbackResultDescription: 'Success',
    callbackAmount: 250,
    callbackPhoneNumber: 254712345678,
    callbackReceiptNumber: 'tq123abc45',
    providerResponse: {
      merchantRequestId: 'merchant-1',
      checkoutRequestId: 'checkout-1',
      responseCode: '0',
      responseDescription: 'Accepted',
      resultCode: 0,
      resultDescription: 'Processed successfully'
    }
  });

  assert.equal(verified.receiptNumber, 'TQ123ABC45');
  assert.equal(verified.resultDescription, 'Processed successfully');
});

test('rejects a successful callback whose amount does not match the stored checkout', async () => {
  const { verifyMpesaCallback } = await import('./payments.js');
  assert.throws(() => verifyMpesaCallback({
    expectedMerchantRequestId: 'merchant-1',
    expectedCheckoutRequestId: 'checkout-1',
    expectedAmountKshCents: 25000,
    expectedPhoneNumber: '254712345678',
    callbackMerchantRequestId: 'merchant-1',
    callbackCheckoutRequestId: 'checkout-1',
    callbackResultCode: 0,
    callbackResultDescription: 'Success',
    callbackAmount: 1,
    callbackPhoneNumber: 254712345678,
    callbackReceiptNumber: 'TQ123ABC45',
    providerResponse: {
      merchantRequestId: 'merchant-1',
      checkoutRequestId: 'checkout-1',
      responseCode: '0',
      responseDescription: 'Accepted',
      resultCode: 0,
      resultDescription: 'Processed successfully'
    }
  }), /amount did not match/);
});

test('normalizes multiple school plans and keeps monthly as the default primary plan', async () => {
  const { normalizeSchoolPlanSelection } = await import('./payments.js');

  assert.deepEqual(
    normalizeSchoolPlanSelection(['weekly', 'monthly', 'annual', 'monthly']),
    {
      availablePlanCodes: ['weekly', 'monthly', 'annual'],
      assignedPlanCode: 'monthly'
    }
  );
  assert.equal(
    normalizeSchoolPlanSelection(['weekly', 'annual'], 'annual').assignedPlanCode,
    'annual'
  );
});

test('uses a school override only for its primary plan', async () => {
  const { schoolManagedPlanPriceKshCents } = await import('./payments.js');

  assert.equal(schoolManagedPlanPriceKshCents({
    planCode: 'monthly',
    assignedPlanCode: 'monthly',
    assignedPlanPriceKshCents: 45000,
    standardPlanPriceKshCents: 50000
  }), 45000);
  assert.equal(schoolManagedPlanPriceKshCents({
    planCode: 'weekly',
    assignedPlanCode: 'monthly',
    assignedPlanPriceKshCents: 45000,
    standardPlanPriceKshCents: 15000
  }), 15000);
  assert.equal(schoolManagedPlanPriceKshCents({
    planCode: 'weekly',
    assignedPlanCode: 'monthly',
    assignedPlanPriceKshCents: 45000,
    standardPlanPriceKshCents: 15000,
    planPricesKshCents: { weekly: 12500, monthly: 45000, annual: 180000 }
  }), 12500);
});
