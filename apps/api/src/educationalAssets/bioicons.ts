import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { EducationalAssetLicense } from './types.js';
import type { FetchLike } from './healthIcons.js';

const REPOSITORY = 'duerrsimon/bioicons';
const BRANCH = 'main';
const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;
const AUTHORS_URL = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/static/icons/authors.json`;
const supportedLicenses: Record<string, EducationalAssetLicense> = {
  'cc-0': 'CC0-1.0', mit: 'MIT', 'cc-by-3.0': 'CC-BY-3.0', 'cc-by-4.0': 'CC-BY-4.0',
  'cc-by-sa-3.0': 'CC-BY-SA-3.0', 'cc-by-sa-4.0': 'CC-BY-SA-4.0',
};

function creatorUrl(authors: unknown, author: string): string | null {
  if (!authors || typeof authors !== 'object') return null;
  const value = (authors as Record<string, unknown>)[author];
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return typeof record.url === 'string' ? record.url : typeof record.website === 'string' ? record.website : null;
  }
  return null;
}

export class BioiconsAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'bioicons';
  readonly displayName = 'Bioicons';
  readonly homepageUrl = 'https://github.com/duerrsimon/bioicons';
  readonly capabilities = { supportsResume: true, supportsPng: false, supportsSvg: true };

  constructor(private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {}

  async discover(options: DiscoveryOptions) {
    const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'Kitabu-Educational-Assets/1.0' };
    const treeResponse = await this.fetcher(TREE_URL, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!treeResponse.ok) throw new Error(`Bioicons discovery failed with ${treeResponse.status}`);
    const tree = await treeResponse.json() as { truncated?: boolean; tree?: Array<{ path?: string; type?: string }> };
    if (tree.truncated) throw new Error('Bioicons Git tree is truncated; refusing partial discovery');
    const authorsResponse = await this.fetcher(AUTHORS_URL, { headers: { 'User-Agent': headers['User-Agent'] }, signal: AbortSignal.timeout(this.timeoutMs) });
    const authors = authorsResponse.ok ? await authorsResponse.json() : {};
    const candidates = (tree.tree ?? []).flatMap(entry => {
      const path = entry.path;
      if (entry.type !== 'blob' || !path?.startsWith('static/icons/') || !path.endsWith('.svg')) return [];
      const parts = path.split('/');
      const prefix = parts[2];
      const license = prefix ? supportedLicenses[prefix] : undefined;
      if (!license) return [];
      const author = parts[3];
      if (!author) return [];
      return [{
        providerKey: this.providerKey, providerAssetId: path, title: path.split('/').pop()!.replace(/\.svg$/i, '').replace(/[-_]+/g, ' '),
        mediaType: 'vector' as const, mimeType: 'image/svg+xml',
        sourcePageUrl: `https://github.com/${REPOSITORY}/blob/${BRANCH}/${path}`,
        rawUrl: `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}/${path}`,
        license, licenseEvidenceUrl: `https://github.com/${REPOSITORY}/tree/${BRANCH}/static/icons/${prefix}`,
        attribution: author, creatorUrl: creatorUrl(authors, author),
      } satisfies RemoteAsset];
    }).sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    const offset = Math.max(0, Number.parseInt(options.cursor ?? '0', 10) || 0);
    const assets = candidates.slice(offset, offset + options.limit);
    const nextOffset = offset + assets.length;
    return { assets, nextCursor: nextOffset < candidates.length ? String(nextOffset) : null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const response = await this.fetcher(asset.rawUrl, { headers: { 'User-Agent': 'Kitabu-Educational-Assets/1.0' }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Bioicons download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
