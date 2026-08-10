import { apiJsonRequest } from './requestHelpers';

export type InteractiveBundleDraft = { manifest: Record<string, unknown>; scenes: unknown[]; assetManifest: Record<string, unknown> };

export const validateInteractiveBundle = (bundle: InteractiveBundleDraft) =>
  apiJsonRequest<{ valid: boolean; issues: Array<{ path: string; message: string }> }>('/admin/interactive-learning/bundles/validate', { method: 'POST', body: JSON.stringify(bundle) });

export const saveInteractiveBundleDraft = (bundle: InteractiveBundleDraft) =>
  apiJsonRequest<{ created: boolean; issues: Array<{ path: string; message: string }> }>('/admin/interactive-learning/bundles', { method: 'POST', body: JSON.stringify(bundle) });

export const approveInteractiveBundle = (bundleId: string, revision: string) =>
  apiJsonRequest(`/admin/interactive-learning/bundles/${encodeURIComponent(bundleId)}/${encodeURIComponent(revision)}/approve`, { method: 'POST', body: '{}' });

export const moveInteractiveRelease = (action: 'publish' | 'rollback', input: { channel: string; bundleId: string; revision: string }) =>
  apiJsonRequest(`/admin/interactive-learning/releases/${action}`, { method: 'POST', body: JSON.stringify(input) });

export const getInteractiveBundle = (bundleId: string, revision: string) =>
  apiJsonRequest<{ release_id: string; payload: InteractiveBundleDraft }>(`/admin/interactive-learning/bundles/${encodeURIComponent(bundleId)}/${encodeURIComponent(revision)}`);
