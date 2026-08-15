import { loadJson, saveJson } from '../services/storage';

export type ParentOnboardingOrderState = {
  referral: Record<string, number>;
  subject: Record<string, number>;
};

export const PARENT_ONBOARDING_ORDER_STORAGE_KEY = 'parent-onboarding-order-v1';

const EMPTY_ORDER: ParentOnboardingOrderState = { referral: {}, subject: {} };

export function orderByLocalAggregate<T extends { value: string }>(
  options: readonly T[],
  counts: Record<string, number>,
): T[] {
  return [...options].sort((left, right) =>
    (counts[right.value] ?? 0) - (counts[left.value] ?? 0) ||
    options.indexOf(left) - options.indexOf(right),
  );
}

export async function loadParentOnboardingOrder(): Promise<ParentOnboardingOrderState> {
  return loadJson(PARENT_ONBOARDING_ORDER_STORAGE_KEY, EMPTY_ORDER);
}

export function recordParentOnboardingSelection(
  state: ParentOnboardingOrderState,
  kind: keyof ParentOnboardingOrderState,
  value: string,
): ParentOnboardingOrderState {
  const next = {
    ...state,
    [kind]: { ...state[kind], [value]: (state[kind][value] ?? 0) + 1 },
  };
  saveJson(PARENT_ONBOARDING_ORDER_STORAGE_KEY, next).catch(() => undefined);
  return next;
}

export const emptyParentOnboardingOrder = EMPTY_ORDER;
