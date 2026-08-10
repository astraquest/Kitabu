import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { EducationalAssetLicense } from './types.js';
import type { FetchLike } from './healthIcons.js';

const API_ORIGIN = 'https://commons.wikimedia.org';
const API_URL = `${API_ORIGIN}/w/api.php`;
const USER_AGENT = 'Kitabu-Educational-Assets/1.0';
const LICENSE_EVIDENCE_FALLBACK = `${API_ORIGIN}/wiki/Commons:Licensing`;
const officialHosts = new Set(['commons.wikimedia.org', 'upload.wikimedia.org']);

type MetadataValue = { value?: string } | undefined;
type ImageInfo = {
  url?: string;
  descriptionurl?: string;
  mime?: string;
  width?: number;
  height?: number;
  extmetadata?: Record<string, MetadataValue>;
};
type WikimediaPage = {
  pageid?: number;
  title?: string;
  imageinfo?: ImageInfo[];
  revisions?: Array<{ revid?: number; timestamp?: string }>;
};

function textValue(metadata: Record<string, MetadataValue> | undefined, key: string): string {
  return metadata?.[key]?.value?.trim() ?? '';
}

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
    .replace(/&(?:amp|lt|gt|quot|#39);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }[entity] ?? entity))
    .replace(/\s+/g, ' ')
    .trim();
}

function officialUrl(value: string, allowedHosts: ReadonlySet<string>): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function httpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseLicense(metadata: Record<string, MetadataValue> | undefined): EducationalAssetLicense {
  const raw = `${textValue(metadata, 'LicenseShortName')} ${textValue(metadata, 'UsageTerms')}`
    .toLowerCase()
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\bcc0(?:[- ]1\.0)?\b/.test(raw) || /creative commons zero/.test(raw)) return 'CC0-1.0';
  if (/\bpublic domain\b|\bpd[- ](?:us|old)\b/.test(raw)) return 'PUBLIC-DOMAIN';
  if (/\bmit\b/.test(raw)) return 'MIT';
  if (/\bbs[d\s-]*2(?:-|\s)?clause\b/.test(raw)) return 'BSD-2-Clause';
  if (/\bbs[d\s-]*3(?:-|\s)?clause\b/.test(raw)) return 'BSD-3-Clause';
  if (/\bapache(?: license)?[- ]2(?:\.0|\.0)?\b/.test(raw)) return 'Apache-2.0';
  if (/\bcc(?:[- ]by)[- ]sa[- ]?3\.0\b|creative commons attribution[- ]sharealike 3\.0/.test(raw)) return 'CC-BY-SA-3.0';
  if (/\bcc(?:[- ]by)[- ]sa[- ]?4\.0\b|creative commons attribution[- ]sharealike 4\.0/.test(raw)) return 'CC-BY-SA-4.0';
  if (/\bcc(?:[- ]by)[- ]?3\.0\b|creative commons attribution 3\.0/.test(raw)) return 'CC-BY-3.0';
  if (/\bcc(?:[- ]by)[- ]?4\.0\b|creative commons attribution 4\.0/.test(raw)) return 'CC-BY-4.0';
  return 'UNKNOWN';
}

function cursorValue(cursor: string | null | undefined): { cmcontinue?: string; continue?: string } {
  if (!cursor) return {};
  try {
    const parsed = JSON.parse(cursor) as { cmcontinue?: unknown; continue?: unknown };
    if (typeof parsed.cmcontinue !== 'string' || typeof parsed.continue !== 'string') throw new Error('invalid');
    return { cmcontinue: parsed.cmcontinue, continue: parsed.continue };
  } catch {
    throw new Error('Wikimedia Commons cursor is invalid');
  }
}

function nextCursor(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const continuation = value as { cmcontinue?: unknown; continue?: unknown };
  if (typeof continuation.cmcontinue !== 'string' || typeof continuation.continue !== 'string') return null;
  return JSON.stringify({ cmcontinue: continuation.cmcontinue, continue: continuation.continue });
}

function apiUrl(parameters: Record<string, string>): string {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url.toString();
}

export class WikimediaCommonsAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'wikimedia-commons';
  readonly displayName = 'Wikimedia Commons';
  readonly homepageUrl = API_ORIGIN;
  readonly capabilities = { supportsResume: true, supportsPng: true, supportsSvg: true };
  private readonly category: string;

  constructor(category: string, private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {
    const normalized = category.trim().replace(/^Category:/i, '').trim();
    if (!normalized) throw new Error('Wikimedia Commons requires an explicit non-empty category');
    this.category = normalized;
  }

  async discover(options: DiscoveryOptions) {
    const limit = Math.max(1, Math.min(options.limit, 50));
    const continuation = cursorValue(options.cursor);
    const categoryResponse = await this.fetcher(apiUrl({
      action: 'query', list: 'categorymembers', cmtitle: `Category:${this.category}`, cmnamespace: '6', cmtype: 'file',
      cmlimit: String(limit), format: 'json', formatversion: '2', ...continuation,
    }), { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
    if (!categoryResponse.ok) throw new Error(`Wikimedia Commons category discovery failed with ${categoryResponse.status}`);
    const categoryBody = await categoryResponse.json() as { query?: { categorymembers?: Array<{ pageid?: number; title?: string }> }; continue?: unknown; error?: unknown };
    if (categoryBody.error) throw new Error('Wikimedia Commons category discovery returned an API error');
    const members = categoryBody.query?.categorymembers ?? [];
    if (!members.length) return { assets: [], nextCursor: nextCursor(categoryBody.continue) };

    const infoResponse = await this.fetcher(apiUrl({
      action: 'query', prop: 'imageinfo|revisions', pageids: members.map(member => String(member.pageid ?? '')).filter(Boolean).join('|'),
      iiprop: 'url|mime|width|height|extmetadata', rvprop: 'ids|timestamp', format: 'json', formatversion: '2',
    }), { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
    if (!infoResponse.ok) throw new Error(`Wikimedia Commons file metadata failed with ${infoResponse.status}`);
    const infoBody = await infoResponse.json() as { query?: { pages?: WikimediaPage[] }; error?: unknown };
    if (infoBody.error) throw new Error('Wikimedia Commons file metadata returned an API error');

    const assets = (infoBody.query?.pages ?? []).flatMap(page => {
      const title = page.title?.trim();
      const info = page.imageinfo?.[0];
      if (!title || !info?.url || !info.mime?.toLowerCase().startsWith('image/')) return [];
      const rawUrl = officialUrl(info.url, new Set(['upload.wikimedia.org']));
      const sourcePageUrl = officialUrl(info.descriptionurl ?? `${API_ORIGIN}/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, new Set(['commons.wikimedia.org']));
      if (!rawUrl || !sourcePageUrl) return [];
      const metadata = info.extmetadata;
      const licenseUrl = httpsUrl(textValue(metadata, 'LicenseUrl')) ?? sourcePageUrl ?? LICENSE_EVIDENCE_FALLBACK;
      const revision = page.revisions?.[0];
      const providerAssetId = `${page.pageid ?? title}:${revision?.revid ?? 'latest'}`;
      const artist = textValue(metadata, 'Artist');
      const creator = stripMarkup(artist) || null;
      const attribution = stripMarkup(textValue(metadata, 'Attribution') || textValue(metadata, 'Credit') || artist) || null;
      const creatorUrlMatch = artist.match(/https?:\/\/[^\s<>"']+/i);
      const licenseEvidence = [textValue(metadata, 'LicenseShortName'), textValue(metadata, 'UsageTerms')]
        .filter(Boolean).join(' | ') || null;
      return [{
        providerKey: this.providerKey,
        providerAssetId,
        title,
        originalFilename: title.replace(/^File:/i, '').trim() || null,
        description: stripMarkup(textValue(metadata, 'ImageDescription')) || null,
        mediaType: info.mime.toLowerCase() === 'image/svg+xml' ? 'vector' as const : 'image' as const,
        mimeType: info.mime,
        width: Number.isSafeInteger(info.width) ? info.width : null,
        height: Number.isSafeInteger(info.height) ? info.height : null,
        sourcePageUrl,
        rawUrl,
        license: parseLicense(metadata),
        licenseEvidenceUrl: licenseUrl,
        licenseVersion: textValue(metadata, 'LicenseShortName') || null,
        licenseEvidence,
        attribution,
        creator,
        creatorUrl: creatorUrlMatch?.[0] ?? null,
      } satisfies RemoteAsset];
    }).sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    return { assets, nextCursor: nextCursor(categoryBody.continue) };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const rawUrl = officialUrl(asset.rawUrl, new Set(['upload.wikimedia.org']));
    if (!rawUrl) throw new Error('Wikimedia Commons download URL is not an official upload host');
    const response = await this.fetcher(rawUrl, { headers: { 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Wikimedia Commons download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
