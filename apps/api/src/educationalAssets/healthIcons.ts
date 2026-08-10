import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';

const REPOSITORY = 'resolvetosavelives/healthicons';
const BRANCH = 'main';
const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;
const LICENSE_URL = `https://github.com/${REPOSITORY}/blob/${BRANCH}/LICENSE`;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class HealthIconsAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'health-icons';
  readonly displayName = 'Health Icons';
  readonly homepageUrl = 'https://healthicons.org';
  readonly capabilities = { supportsResume: true, supportsPng: true, supportsSvg: true };

  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {}

  async discover(options: DiscoveryOptions) {
    const response = await this.fetcher(TREE_URL, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Kitabu-Educational-Assets/1.0' }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Health Icons discovery failed with ${response.status}`);
    const body = await response.json() as { tree?: Array<{ path?: string; type?: string }> };
    const candidates = (body.tree ?? [])
      .flatMap(entry => {
        const path = entry.path;
        if (entry.type !== 'blob' || !path?.startsWith('public/icons/') || !/\.(svg|png)$/i.test(path)) return [];
        const extension = path.endsWith('.svg') ? 'svg' : 'png';
        const rawUrl = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`;
        return [{
          providerKey: this.providerKey, providerAssetId: path, title: path.split('/').pop()!.replace(/\.(svg|png)$/i, '').replace(/[-_]+/g, ' '),
          mediaType: extension === 'svg' ? 'vector' as const : 'image' as const, mimeType: extension === 'svg' ? 'image/svg+xml' : 'image/png',
          sourcePageUrl: `https://github.com/${REPOSITORY}/blob/${BRANCH}/${path}`, rawUrl,
          license: 'CC0-1.0' as const, licenseEvidenceUrl: LICENSE_URL, attribution: null,
        } satisfies RemoteAsset];
      })
      .sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    const offset = Math.max(0, Number.parseInt(options.cursor ?? '0', 10) || 0);
    const assets = candidates.slice(offset, offset + options.limit);
    const nextOffset = offset + assets.length;
    return { assets, nextCursor: nextOffset < candidates.length ? String(nextOffset) : null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const response = await this.fetcher(asset.rawUrl, { headers: { 'User-Agent': 'Kitabu-Educational-Assets/1.0' }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Health Icons download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
