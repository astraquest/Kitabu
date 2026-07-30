import { apiJsonRequest } from './requestHelpers';
import { getKitabuApiBaseUrl } from './runtimeConfig';

export interface LearningAssetSummary {
  assetId: string;
  version: string;
  displayName: string;
  kind: 'model-3d' | 'vector';
  status: string;
  category?: string;
  collectionId?: string;
  uses?: string[];
}

export interface LearningAssetCollectionProgress {
  id: string;
  label: string;
  target: number;
  registered: number;
  ready: number;
}

export interface LearningAssetCatalog {
  assets: LearningAssetSummary[];
  totalReady: number;
  totalRegistered: number;
  collections: LearningAssetCollectionProgress[];
}

export const getLearningAssets = () =>
  apiJsonRequest<LearningAssetCatalog>('/admin/interactive-learning/assets');

export function getLearningAssetViewerUrl(asset: Pick<LearningAssetSummary, 'assetId' | 'version' | 'kind'>) {
  const baseUrl = getKitabuApiBaseUrl();
  if (!baseUrl) throw new Error('Kitabu API is unavailable');
  const path = asset.kind === 'vector' ? 'preview' : 'runtime/';
  return `${baseUrl}/learning-assets/${encodeURIComponent(asset.assetId)}/${encodeURIComponent(asset.version)}/${path}`;
}
