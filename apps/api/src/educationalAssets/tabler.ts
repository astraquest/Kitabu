import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { FetchLike } from './healthIcons.js';

const REPOSITORY = 'tabler/tabler-icons';
const BRANCH = 'main';
const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;
const LICENSE_URL = `https://github.com/${REPOSITORY}/blob/${BRANCH}/LICENSE`;
const iconPath = /^icons\/(?:filled\/)?[^/]+\.svg$/i;

export class TablerAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'tabler-icons';
  readonly displayName = 'Tabler Icons';
  readonly homepageUrl = 'https://github.com/tabler/tabler-icons';
  readonly capabilities = { supportsResume: true, supportsPng: false, supportsSvg: true };

  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {}

  async discover(options: DiscoveryOptions) {
    const response = await this.fetcher(TREE_URL, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Kitabu-Educational-Assets/1.0' }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Tabler discovery failed with ${response.status}`);
    const tree = await response.json() as { truncated?: boolean; tree?: Array<{ path?: string; type?: string }> };
    if (tree.truncated) throw new Error('Tabler Git tree is truncated; refusing partial discovery');
    const candidates = (tree.tree ?? []).flatMap(entry => {
      const path = entry.path;
      if (entry.type !== 'blob' || !path || !iconPath.test(path)) return [];
      return [{
        providerKey: this.providerKey, providerAssetId: path, title: path.split('/').pop()!.replace(/\.svg$/i, '').replace(/[-_]+/g, ' '),
        mediaType: 'vector' as const, mimeType: 'image/svg+xml',
        sourcePageUrl: `https://github.com/${REPOSITORY}/blob/${BRANCH}/${path}`,
        rawUrl: `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`,
        license: 'MIT' as const, licenseEvidenceUrl: LICENSE_URL, attribution: 'Tabler Icons', classification: 'generic-ui-concept' as const,
        visualType: 'UI_ICON' as const, subject: 'GENERAL', topic: 'GENERAL', keywords: ['ui', 'icon'],
      } satisfies RemoteAsset];
    }).sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    const offset = Math.max(0, Number.parseInt(options.cursor ?? '0', 10) || 0);
    const assets = candidates.slice(offset, offset + options.limit);
    const nextOffset = offset + assets.length;
    return { assets, nextCursor: nextOffset < candidates.length ? String(nextOffset) : null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const response = await this.fetcher(asset.rawUrl, { headers: { 'User-Agent': 'Kitabu-Educational-Assets/1.0' }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Tabler download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
