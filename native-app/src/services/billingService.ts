import {
  BillingPlansResponse,
  BillingStatus,
  FreeTrialResponse,
  MpesaCheckoutResponse,
  MpesaCheckoutStatus,
  BillingPlanCode,
} from '../types/app';
import { apiRequest } from './apiClient';

export async function getBillingPlans(): Promise<BillingPlansResponse> {
  return apiRequest<BillingPlansResponse>('/billing/plans', {
    method: 'GET',
  });
}

export async function getBillingStatus(): Promise<BillingStatus> {
  return apiRequest<BillingStatus>('/billing/subscription', {
    method: 'GET',
  });
}

export async function startFreeTrial() {
  return apiRequest<FreeTrialResponse>('/billing/free-trial', {
    method: 'POST',
  });
}

export async function startMpesaCheckout(input: {
  planCode: BillingPlanCode;
  phoneNumber: string;
  returnTo: string;
}) {
  return apiRequest<MpesaCheckoutResponse>('/billing/checkout/mpesa', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getMpesaCheckoutStatus(paymentRequestId: string) {
  return apiRequest<MpesaCheckoutStatus>(`/billing/checkout/${paymentRequestId}`, {
    method: 'GET',
  });
}
