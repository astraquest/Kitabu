import { apiJsonRequest } from './requestHelpers';
import { getKitabuApiBaseUrl } from './runtimeConfig';

export interface LearningAssetSummary {
  assetId: string;
  version: string;
  displayName: string;
  kind: 'model-3d';
  status: string;
}

export interface LearningAssetCatalog {
  assets: LearningAssetSummary[];
  totalReady: number;
  totalRegistered: number;
}

export const getLearningAssets = () =>
  apiJsonRequest<LearningAssetCatalog>('/admin/interactive-learning/assets');

export function getLearningAssetViewerUrl(asset: Pick<LearningAssetSummary, 'assetId' | 'version'>) {
  const baseUrl = getKitabuApiBaseUrl();
  if (!baseUrl) throw new Error('Kitabu API is unavailable');
  return `${baseUrl}/learning-assets/${encodeURIComponent(asset.assetId)}/${encodeURIComponent(asset.version)}/runtime/`;
}
