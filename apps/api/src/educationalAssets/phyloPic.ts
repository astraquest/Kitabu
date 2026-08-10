import type { DiscoveryOptions, EducationalAssetAdapter, RemoteAsset } from './adapters.js';
import type { EducationalAssetLicense } from './types.js';
import type { FetchLike } from './healthIcons.js';

const API_ORIGIN = 'https://api.phylopic.org';
const API_URL = `${API_ORIGIN}/images`;
const SITE_ORIGIN = 'https://www.phylopic.org';
const IMAGE_ORIGIN = 'https://images.phylopic.org';
const LICENSE_USAGE_URL = `${SITE_ORIGIN}/articles/image-usage`;
const USER_AGENT = 'Kitabu-Educational-Assets/1.0';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 160;
const MAX_BUILD = 1_000_000_000;
const MAX_PAGE = 100_000;
const MAX_PAGE_INDEX = 50;

type ApiLink = { href?: unknown; title?: unknown; type?: unknown; sizes?: unknown };
type PhyloPicItem = {
  uuid?: unknown;
  title?: unknown;
  description?: unknown;
  attribution?: unknown;
  license?: unknown;
  _links?: Record<string, unknown>;
};
type PhyloPicResponse = {
  build?: unknown;
  totalPages?: unknown;
  itemsPerPage?: unknown;
  items?: unknown;
  _embedded?: { items?: unknown };
  _links?: { self?: ApiLink; next?: ApiLink | null; items?: unknown };
  errors?: unknown;
};

export interface PhyloPicAdapterOptions {
  query?: string;
  nodeUuid?: string;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function linkValue(value: unknown): ApiLink | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as ApiLink : null;
}

function linkList(value: unknown): ApiLink[] {
  if (!Array.isArray(value)) return [];
  return value.map(linkValue).filter((link): link is ApiLink => Boolean(link));
}

function officialApiUrl(value: string): string | null {
  try {
    const url = new URL(value, API_ORIGIN);
    return url.protocol === 'https:' && url.hostname === 'api.phylopic.org' ? url.toString() : null;
  } catch {
    return null;
  }
}

function officialImageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'images.phylopic.org' ? url.toString() : null;
  } catch {
    return null;
  }
}

function evidenceUrl(value: string | null): string {
  if (!value) return LICENSE_USAGE_URL;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && (url.hostname === 'creativecommons.org' || url.hostname === 'www.phylopic.org')) return url.toString();
  } catch {
    // Fall through to PhyloPic's official usage guidance.
  }
  return LICENSE_USAGE_URL;
}

function parseLicense(value: string | null): EducationalAssetLicense {
  const raw = (value ?? '').toLowerCase().replace(/\s+/g, ' ');
  if (/publicdomain\/(?:zero|mark)\/1\.0|\bcc0(?:[- ]1\.0)?\b|creative commons zero/.test(raw)) {
    return raw.includes('/mark/') ? 'PUBLIC-DOMAIN' : 'CC0-1.0';
  }
  if (/by-nc/.test(raw) || /non-commercial|noncommercial/.test(raw)) return 'UNKNOWN';
  if (/licenses\/by-sa\/3\.0|cc(?:[- ]by)[- ]sa[- ]?3\.0/.test(raw)) return 'CC-BY-SA-3.0';
  if (/licenses\/by-sa\/4\.0|cc(?:[- ]by)[- ]sa[- ]?4\.0/.test(raw)) return 'CC-BY-SA-4.0';
  if (/licenses\/by\/3\.0|cc(?:[- ]by)[- ]?3\.0/.test(raw)) return 'CC-BY-3.0';
  if (/licenses\/by\/4\.0|cc(?:[- ]by)[- ]?4\.0/.test(raw)) return 'CC-BY-4.0';
  return 'UNKNOWN';
}

function parseCursor(value: string | null | undefined): { build: number; page: number; index: number } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { build?: unknown; page?: unknown; index?: unknown };
    if (![parsed.build, parsed.page, parsed.index].every(Number.isSafeInteger)) throw new Error('invalid');
    if ((parsed.build as number) < 0 || (parsed.build as number) > MAX_BUILD ||
      (parsed.page as number) < 0 || (parsed.page as number) > MAX_PAGE ||
      (parsed.index as number) < 0 || (parsed.index as number) > MAX_PAGE_INDEX) throw new Error('invalid');
    return { build: parsed.build as number, page: parsed.page as number, index: parsed.index as number };
  } catch {
    throw new Error('PhyloPic cursor is invalid');
  }
}

function cursor(build: number, page: number, index: number): string {
  return JSON.stringify({ build, page, index });
}

function dimensions(value: string | null): { width: number | null; height: number | null } {
  const match = value?.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)/);
  if (!match) return { width: null, height: null };
  const width = Math.round(Number(match[1]));
  const height = Math.round(Number(match[2]));
  return Number.isSafeInteger(width) && Number.isSafeInteger(height) ? { width, height } : { width: null, height: null };
}

function itemLinks(item: PhyloPicItem): Record<string, unknown> {
  return item._links && typeof item._links === 'object' ? item._links : {};
}

function firstLink(links: Record<string, unknown>, key: string): ApiLink | null {
  return linkValue(links[key]);
}

function itemName(item: PhyloPicItem, links: Record<string, unknown>): string {
  return stringValue(item.title)
    ?? stringValue(firstLink(links, 'specificNode')?.title)
    ?? stringValue(firstLink(links, 'self')?.title)
    ?? stringValue(item.uuid)
    ?? 'PhyloPic silhouette';
}

function itemToRemoteAsset(item: PhyloPicItem, build: number): RemoteAsset | null {
  const uuid = stringValue(item.uuid);
  if (!uuid || !UUID_PATTERN.test(uuid)) return null;
  const links = itemLinks(item);
  const vector = firstLink(links, 'vectorFile');
  const source = firstLink(links, 'sourceFile');
  const rasterFiles = linkList(links.rasterFiles).sort((left, right) => {
    const leftSize = dimensions(stringValue(left.sizes));
    const rightSize = dimensions(stringValue(right.sizes));
    return (rightSize.width ?? 0) * (rightSize.height ?? 0) - (leftSize.width ?? 0) * (leftSize.height ?? 0);
  });
  const vectorUrl = officialImageUrl(stringValue(vector?.href) ?? '')
    ?? (stringValue(source?.type)?.toLowerCase() === 'image/svg+xml' ? officialImageUrl(stringValue(source?.href) ?? '') : null);
  const rasterUrl = officialImageUrl(stringValue(rasterFiles[0]?.href) ?? '');
  const rawUrl = vectorUrl ?? rasterUrl;
  if (!rawUrl) return null;
  const vectorSelected = Boolean(vectorUrl);
  const selectedLink = vectorSelected ? vector : rasterFiles[0];
  const mimeType = vectorSelected ? 'image/svg+xml' : 'image/png';
  const licenseLink = firstLink(links, 'license');
  const licenseHref = stringValue(licenseLink?.href);
  const contributor = firstLink(links, 'contributor');
  const creator = stringValue(item.attribution) ?? stringValue(contributor?.title);
  const creatorApiUrl = officialApiUrl(stringValue(contributor?.href) ?? '');
  const nodeLinks = linkList(links.nodes);
  const specificNode = firstLink(links, 'specificNode');
  const taxonNames = [...new Set([
    stringValue(specificNode?.title),
    ...nodeLinks.map(node => stringValue(node.title)),
  ].filter((name): name is string => Boolean(name)))];
  const name = itemName(item, links);
  const size = dimensions(stringValue(selectedLink?.sizes));
  return {
    providerKey: 'phylopic',
    providerAssetId: uuid,
    title: name,
    originalFilename: rawUrl.split('/').pop() ?? null,
    description: stringValue(item.description),
    mediaType: vectorSelected ? 'vector' : 'image',
    mimeType,
    width: size.width,
    height: size.height,
    sourcePageUrl: `${SITE_ORIGIN}/images/${uuid}`,
    rawUrl,
    license: parseLicense(licenseHref ?? stringValue(item.license)),
    licenseEvidenceUrl: evidenceUrl(licenseHref),
    licenseEvidence: licenseHref ?? stringValue(item.license),
    attribution: creator,
    creator,
    creatorUrl: creatorApiUrl,
    visualType: 'VOCABULARY_IMAGE',
    subject: taxonNames[0] ?? null,
    topic: 'Taxonomy',
    keywords: taxonNames,
    metadata: {
      phyloPicBuild: build,
      imageUuid: uuid,
      taxonNames,
      licenseEvidenceUrl: evidenceUrl(licenseHref),
    },
  } satisfies RemoteAsset;
}

export class PhyloPicAdapter implements EducationalAssetAdapter {
  readonly providerKey = 'phylopic';
  readonly displayName = 'PhyloPic';
  readonly homepageUrl = SITE_ORIGIN;
  readonly capabilities = { supportsResume: true, supportsPng: true, supportsSvg: true };
  private readonly query: string | null;
  private readonly nodeUuid: string | null;

  constructor(
    options: PhyloPicAdapterOptions,
    private readonly fetcher: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    const rawQuery = options.query ?? '';
    if (/[\u0000-\u001f\u007f]/.test(rawQuery)) throw new Error('PhyloPic query is too long or contains control characters');
    const query = rawQuery.trim().toLowerCase() || null;
    const nodeUuid = options.nodeUuid?.trim().toLowerCase() || null;
    if (Boolean(query) === Boolean(nodeUuid)) throw new Error('PhyloPic requires exactly one explicit query or node UUID');
    if (query && query.length > MAX_QUERY_LENGTH) {
      throw new Error('PhyloPic query is too long or contains control characters');
    }
    if (nodeUuid && !UUID_PATTERN.test(nodeUuid)) throw new Error('PhyloPic node UUID is invalid');
    this.query = query;
    this.nodeUuid = nodeUuid;
  }

  private async fetchJson(url: string): Promise<PhyloPicResponse> {
    const officialUrl = officialApiUrl(url);
    if (!officialUrl) throw new Error('PhyloPic API URL is not official');
    const response = await this.fetcher(officialUrl, {
      headers: { Accept: 'application/vnd.phylopic.v2+json', 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.url && !officialApiUrl(response.url)) throw new Error('PhyloPic API redirected to an untrusted host');
    if (!response.ok) throw new Error(`PhyloPic API request failed with ${response.status}`);
    const body = await response.json() as PhyloPicResponse;
    if (body.errors) throw new Error('PhyloPic API returned an error');
    return body;
  }

  async discover(options: DiscoveryOptions) {
    if (!Number.isSafeInteger(options.limit) || options.limit < 1) throw new Error('PhyloPic limit must be a positive integer');
    const limit = Math.min(options.limit, 50);
    const savedCursor = parseCursor(options.cursor);
    let build = savedCursor?.build ?? null;
    let page = savedCursor?.page ?? 0;
    let index = savedCursor?.index ?? 0;
    if (build === null) {
      const seedUrl = new URL(API_URL);
      if (this.query) seedUrl.searchParams.set('filter_name', this.query);
      if (this.nodeUuid) seedUrl.searchParams.set('filter_node', this.nodeUuid);
      const seed = await this.fetchJson(seedUrl.toString());
      build = Number(seed.build);
      if (!Number.isSafeInteger(build) || build < 0 || build > MAX_BUILD) throw new Error('PhyloPic API did not provide a valid current build');
    }

    const pageUrl = new URL(API_URL);
    pageUrl.searchParams.set('build', String(build));
    pageUrl.searchParams.set('page', String(page));
    pageUrl.searchParams.set('embed_items', 'true');
    if (this.query) pageUrl.searchParams.set('filter_name', this.query);
    if (this.nodeUuid) pageUrl.searchParams.set('filter_node', this.nodeUuid);
    const response = await this.fetchJson(pageUrl.toString());
    const responseBuild = Number(response.build ?? build);
    if (!Number.isSafeInteger(responseBuild) || responseBuild < 0 || responseBuild > MAX_BUILD || responseBuild !== build) throw new Error('PhyloPic API returned an inconsistent build');
    const rawItems = response._embedded?.items ?? response.items;
    let items = Array.isArray(rawItems)
      ? rawItems.filter((item): item is PhyloPicItem => Boolean(item && typeof item === 'object'))
      : [];
    const itemLinks = linkList(response._links?.items);
    let itemLinkOffset: number | null = null;
    if (!items.length && itemLinks.length) {
      const start = Math.min(index, itemLinks.length);
      const end = Math.min(start + limit, itemLinks.length);
      itemLinkOffset = start;
      const fetchedItems: PhyloPicItem[] = [];
      for (const itemLink of itemLinks.slice(start, end)) {
        const itemUrl = officialApiUrl(stringValue(itemLink.href) ?? '');
        if (!itemUrl) throw new Error('PhyloPic item link is not an official API URL');
        const itemBody = await this.fetchJson(itemUrl);
        const nested = itemBody._embedded && typeof itemBody._embedded === 'object' && 'item' in itemBody._embedded
          ? (itemBody._embedded as { item?: unknown }).item
          : itemBody;
        if (nested && typeof nested === 'object') fetchedItems.push(nested as PhyloPicItem);
      }
      items = fetchedItems;
      index = 0;
    }
    const assets = items.map(item => itemToRemoteAsset(item, build!)).filter((asset): asset is RemoteAsset => Boolean(asset))
      .sort((left, right) => left.providerAssetId.localeCompare(right.providerAssetId));
    const selected = assets.slice(index, index + limit);
    const nextIndex = (itemLinkOffset ?? index) + selected.length;
    const totalPages = Number(response.totalPages);
    const hasNextPage = Number.isSafeInteger(totalPages)
      ? page + 1 < totalPages
      : Boolean(response._links?.next) || (itemLinks.length > 0 && nextIndex < itemLinks.length);
    const nextCursor = nextIndex < assets.length
      ? cursor(build, page, nextIndex)
      : hasNextPage
        ? cursor(build, page + 1, 0)
        : null;
    return { assets: selected, nextCursor };
  }

  async download(asset: RemoteAsset): Promise<Uint8Array> {
    const rawUrl = officialImageUrl(asset.rawUrl);
    if (!rawUrl) throw new Error('PhyloPic download URL is not an official image host');
    const response = await this.fetcher(rawUrl, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.url && !officialImageUrl(response.url)) throw new Error('PhyloPic download redirected to an untrusted host');
    if (!response.ok) throw new Error(`PhyloPic download failed with ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
}
