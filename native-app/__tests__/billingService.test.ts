import { apiRequest } from '../src/services/apiClient';
import { startFreeTrial } from '../src/services/billingService';

jest.mock('../src/services/apiClient', () => ({
  apiRequest: jest.fn(),
}));

const mockedApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('billing service free trial', () => {
  beforeEach(() => {
    mockedApiRequest.mockReset();
    mockedApiRequest.mockResolvedValue({
      subscription: {
        id: 'subscription-1',
        code: 'trial_monthly_1bob',
        name: 'Free 1-Month Trial',
        billingCycle: 'monthly',
        priceKsh: 0,
        periodEnd: '2026-09-18T00:00:00.000Z',
      },
    });
  });

  it('starts the trial through the authenticated direct endpoint without payment details', async () => {
    await startFreeTrial();

    expect(mockedApiRequest).toHaveBeenCalledWith('/billing/free-trial', {
      method: 'POST',
    });
    expect(mockedApiRequest.mock.calls[0][1]).not.toHaveProperty('body');
  });
});
