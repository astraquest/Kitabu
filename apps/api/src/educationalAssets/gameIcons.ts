import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { FetchLike } from './healthIcons.js';

const REPOSITORY = 'game-icons/icons';
const BRANCH = 'master';
const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;
const LICENSE_URL = `https://github.com/${REPOSITORY}/blob/${BRANCH}/license.txt`;
const contributorIconPath = /^([^/]+)\/([^/]+)\.svg$/i;

export class GameIconsAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'game-icons';
  readonly displayName = 'Game Icons';
  readonly homepageUrl = 'https://game-icons.net';
  readonly capabilities = { supportsResume: true, supportsPng: false, supportsSvg: true };

  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {}

  async discover(options: DiscoveryOptions) {
    const response = await this.fetcher(TREE_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Kitabu-Educational-Assets/1.0' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Game Icons discovery failed with ${response.status}`);
    const tree = await response.json() as { truncated?: boolean; tree?: Array<{ path?: string; type?: string }> };
    if (tree.truncated) throw new Error('Game Icons Git tree is truncated; refusing partial discovery');
    const candidates = (tree.tree ?? []).flatMap(entry => {
      const path = entry.path;
      const match = path?.match(contributorIconPath);
      if (entry.type !== 'blob' || !path || !match) return [];
      const creator = match[1];
      return [{
        providerKey: this.providerKey,
        providerAssetId: path,
        title: match[2].replace(/[-_]+/g, ' '),
        mediaType: 'vector' as const,
        mimeType: 'image/svg+xml',
        sourcePageUrl: `https://github.com/${REPOSITORY}/blob/${BRANCH}/${path}`,
        rawUrl: `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`,
        license: 'CC-BY-3.0' as const,
        licenseEvidenceUrl: LICENSE_URL,
        attribution: `Icons made by ${creator}`,
        creator,
        visualType: 'ICON' as const,
        subject: 'GENERAL',
        topic: 'GENERAL',
        keywords: ['game', 'icon'],
      } satisfies RemoteAsset];
    }).sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    const offset = Math.max(0, Number.parseInt(options.cursor ?? '0', 10) || 0);
    const assets = candidates.slice(offset, offset + options.limit);
    const nextOffset = offset + assets.length;
    return { assets, nextCursor: nextOffset < candidates.length ? String(nextOffset) : null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const response = await this.fetcher(asset.rawUrl, {
      headers: { 'User-Agent': 'Kitabu-Educational-Assets/1.0' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Game Icons download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
