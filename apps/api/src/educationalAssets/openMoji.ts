import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { FetchLike } from './healthIcons.js';

const REPOSITORY = 'hfg-gmuend/openmoji';
const BRANCH = 'master';
const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;
const LICENSE_URL = `https://github.com/${REPOSITORY}/blob/${BRANCH}/LICENSE.txt`;
const exportedAssetPath = /^(?:black|color)\/(?:svg|72x72|618x618)\/[^/]+\.(svg|png)$/i;

export class OpenMojiAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'openmoji';
  readonly displayName = 'OpenMoji';
  readonly homepageUrl = 'https://openmoji.org';
  readonly capabilities = { supportsResume: true, supportsPng: true, supportsSvg: true };

  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {}

  async discover(options: DiscoveryOptions) {
    const response = await this.fetcher(TREE_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Kitabu-Educational-Assets/1.0' },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`OpenMoji discovery failed with ${response.status}`);
    const tree = await response.json() as { truncated?: boolean; tree?: Array<{ path?: string; type?: string }> };
    if (tree.truncated) throw new Error('OpenMoji Git tree is truncated; refusing partial discovery');
    const candidates = (tree.tree ?? []).flatMap(entry => {
      const path = entry.path;
      const match = path?.match(exportedAssetPath);
      if (entry.type !== 'blob' || !path || !match) return [];
      const isSvg = match[1].toLowerCase() === 'svg';
      return [{
        providerKey: this.providerKey,
        providerAssetId: path,
        title: path.split('/').pop()!.replace(/\.(svg|png)$/i, '').replace(/[-_]+/g, ' '),
        mediaType: isSvg ? 'vector' as const : 'image' as const,
        mimeType: isSvg ? 'image/svg+xml' : 'image/png',
        sourcePageUrl: `https://github.com/${REPOSITORY}/blob/${BRANCH}/${path}`,
        rawUrl: `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`,
        license: 'CC-BY-SA-4.0' as const,
        licenseEvidenceUrl: LICENSE_URL,
        attribution: 'All emojis designed by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0.',
        creatorUrl: 'https://openmoji.org',
        visualType: 'ICON' as const,
        subject: 'GENERAL',
        topic: 'GENERAL',
        keywords: ['emoji', 'openmoji'],
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
    if (!response.ok) throw new Error(`OpenMoji download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
