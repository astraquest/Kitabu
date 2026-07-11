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
});
