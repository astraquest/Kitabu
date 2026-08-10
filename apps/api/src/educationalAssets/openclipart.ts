import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { FetchLike } from './healthIcons.js';

const SITE_ORIGIN = 'https://openclipart.org';
const SEARCH_URL = `${SITE_ORIGIN}/search/`;
const LICENSE_EVIDENCE_URL = `${SITE_ORIGIN}/share`;
const USER_AGENT = 'Kitabu-Educational-Assets/1.0';
const MAX_QUERY_LENGTH = 160;
const MAX_PAGE_SIZE = 100;
const MAX_STARTER_PAGES = 2;
const MAX_DOWNLOAD_REDIRECTS = 3;
const OFFICIAL_HOSTS = ['openclipart.org', 'www.openclipart.org'];

function textValue(value: unknown): string | null { return typeof value === 'string' && value.trim() ? value.trim() : null; }

function officialUrl(value: string, paths?: readonly string[]): string | null {
  try {
    const url = new URL(value, SITE_ORIGIN);
    if (url.protocol !== 'https:' || !OFFICIAL_HOSTS.includes(url.hostname.toLowerCase()) || (paths && !paths.some(path => url.pathname.startsWith(path)))) return null;
    return url.toString();
  } catch { return null; }
}

function decodeHtml(value: string): string {
  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|amp|quot|apos|lt|gt);/gi, (entity, decimal, hex) => {
    if (decimal || hex) {
      const codePoint = Number.parseInt(decimal ?? hex, hex ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    return ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' } as Record<string, string>)[entity.toLowerCase()] ?? entity;
  }).trim();
}

function galleryAssets(html: string, query: string, limit: number): RemoteAsset[] {
  const gallery = html.match(/<div\s+class=["']gallery["'][^>]*>([\s\S]*?)<div\s+class=["']artwork\s+gallery-ads["']/i)?.[1];
  if (!gallery) throw new Error('Openclipart search did not contain a gallery');
  const results: RemoteAsset[] = [];
  const itemPattern = /<div\s+class=["']artwork["'][^>]*>\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*<img\s+[^>]*alt=["']([^"']+)["'][^>]*>/gi;
  for (const match of gallery.matchAll(itemPattern)) {
    const sourcePageUrl = officialUrl(match[1] ?? '', ['/detail/']);
    const id = sourcePageUrl?.match(/^https:\/\/(?:www\.)?openclipart\.org\/detail\/(\d+)(?:\/|$)/)?.[1];
    const title = decodeHtml(match[2] ?? '');
    if (!sourcePageUrl || !id || !title) continue;
    results.push({
      providerKey: 'openclipart', providerAssetId: id, title, originalFilename: `${id}.svg`, mediaType: 'vector', mimeType: 'image/svg+xml',
      sourcePageUrl, rawUrl: `${SITE_ORIGIN}/download/${id}`, license: 'PUBLIC-DOMAIN', licenseEvidenceUrl: LICENSE_EVIDENCE_URL,
      licenseVersion: 'Openclipart public domain dedication', licenseEvidence: 'Openclipart states that its clipart is public domain.', attribution: null,
      visualType: 'ILLUSTRATION', subject: null, topic: 'GENERAL', keywords: [], metadata: { openclipartQuery: query },
    });
    if (results.length === limit) break;
  }
  return results;
}

function cursorValue(value: string | null | undefined, query: string): number {
  if (!value) return 1;
  try {
    const parsed = JSON.parse(value) as { query?: unknown; page?: unknown };
    if (parsed.query !== query || !Number.isSafeInteger(parsed.page) || (parsed.page as number) < 1 || (parsed.page as number) > MAX_STARTER_PAGES) throw new Error('invalid');
    return parsed.page as number;
  } catch { throw new Error('Openclipart cursor is invalid'); }
}

export class OpenclipartAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'openclipart';
  readonly displayName = 'Openclipart';
  readonly homepageUrl = SITE_ORIGIN;
  readonly capabilities = { supportsResume: true, supportsPng: true, supportsSvg: true };
  private readonly query: string;

  constructor(query: string, private readonly fetcher: FetchLike = fetch, private readonly timeoutMs = 10_000) {
    if (/[\u0000-\u001f\u007f]/.test(query) || !query.trim() || query.trim().length > MAX_QUERY_LENGTH) throw new Error('Openclipart requires a non-empty bounded query');
    this.query = query.trim().toLowerCase();
  }

  async discover(options: DiscoveryOptions) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1) throw new Error('Openclipart limit must be a positive integer');
    const page = cursorValue(options.cursor, this.query);
    const limit = Math.min(options.limit, MAX_PAGE_SIZE);
    const url = new URL(SEARCH_URL);
    url.searchParams.set('query', this.query);
    if (page > 1) url.searchParams.set('p', String(page));
    const response = await this.fetcher(url.toString(), { headers: { Accept: 'text/html', 'User-Agent': USER_AGENT }, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new Error(`Openclipart search failed with ${response.status}`);
    if (!/text\/html/i.test(response.headers.get('content-type') ?? '')) throw new Error('Openclipart search did not return HTML');
    const html = await response.text();
    const assets = galleryAssets(html, this.query, limit);
    const pageCount = Number(html.match(/\(\s*Page\s+\d+\s+of\s+(\d+)\s*\)/i)?.[1]);
    const hasNext = page < MAX_STARTER_PAGES && Number.isSafeInteger(pageCount) && page < pageCount;
    return { assets, nextCursor: hasNext ? JSON.stringify({ query: this.query, page: page + 1 }) : null };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    let url = officialUrl(asset.rawUrl, ['/download/']);
    if (!url) throw new Error('Openclipart download URL is not an official download URL');
    for (let redirects = 0; redirects <= MAX_DOWNLOAD_REDIRECTS; redirects += 1) {
      const response = await this.fetcher(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual', signal: AbortSignal.timeout(this.timeoutMs) });
      if (response.status >= 300 && response.status < 400) {
        let redirectedUrl: string | null = null;
        try { redirectedUrl = officialUrl(new URL(response.headers.get('location') ?? '', url).toString()); } catch { /* rejected below */ }
        if (!redirectedUrl) throw new Error('Openclipart download redirected to an untrusted host');
        url = redirectedUrl;
        continue;
      }
      const finalUrl = response.url ? officialUrl(response.url) : url;
      if (!finalUrl) throw new Error('Openclipart download resolved to an untrusted host');
      if (!response.ok) throw new Error(`Openclipart download failed with ${response.status}`);
      if (!response.headers.get('content-type')?.toLowerCase().startsWith(asset.mimeType)) throw new Error('Openclipart download did not return the expected image type');
      return new Uint8Array(await response.arrayBuffer());
    }
    throw new Error('Openclipart download exceeded redirect limit');
  }
}
