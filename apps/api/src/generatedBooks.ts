import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import type { ReadStream } from 'node:fs';
import type { AuthenticatedUser } from './types.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const booksRoot = path.resolve(currentDir, '..', 'data', 'books');

type BookPage = {
  title: string;
  content: string;
  pageId?: string;
  unitIds?: string[];
  outcomeIds?: string[];
  imageRefs?: string[];
};

type BookManifest = {
  bookId: string;
  title: string;
  country: string;
  curriculum: string;
  grade: string;
  subject: string;
  subjectSlug: string;
  subjectColor?: string;
  version?: string;
  status?: string;
  contentStatus?: string;
  pageCount?: number;
  wordCount?: number;
  mascot?: unknown;
  cover?: unknown;
  coverImage?: {
    path: string;
    mimeType?: string;
    sizeBytes?: number;
    sha256?: string;
  };
  packageChecksum?: string;
  downloads?: {
    markdown?: string;
    pagesJson?: string;
    sourceMap?: string;
    pdf?: string;
  };
};

function isGeneratedBookAdmin(user: AuthenticatedUser) {
  return user.roles.some(role => role === 'school_admin' || role === 'platform_admin');
}

function isPublishedGeneratedBook(manifest: BookManifest) {
  const statuses = [manifest.contentStatus, manifest.status]
    .filter((value): value is string => Boolean(value))
    .map(value => value.toLowerCase());
  return [
    'library-ready',
    'published',
    'published-library',
    'published-for-testing',
    'phase1-testing-published'
  ].some(status => statuses.includes(status));
}

function userCanPreviewGeneratedDrafts(user: AuthenticatedUser) {
  return hasAllGeneratedBookAccess(user);
}

function generatedBookVisibleToUser(user: AuthenticatedUser, manifest: BookManifest) {
  return isPublishedGeneratedBook(manifest) || userCanPreviewGeneratedDrafts(user);
}

function manifestForUser(user: AuthenticatedUser, manifest: BookManifest) {
  if (isGeneratedBookAdmin(user)) return manifest;
  const sanitized = { ...(manifest as BookManifest & Record<string, unknown>) };
  delete sanitized.sourceDocuments;
  delete sanitized.sourceQuality;
  delete sanitized.sourceSnapshotHash;
  delete sanitized.bookPlanHash;
  if (sanitized.downloads && typeof sanitized.downloads === 'object') {
    const downloads = { ...(sanitized.downloads as Record<string, unknown>) };
    delete downloads.sourceMap;
    sanitized.downloads = downloads;
  }
  return sanitized as BookManifest;
}

function pageForUser(user: AuthenticatedUser, page: BookPage) {
  if (isGeneratedBookAdmin(user)) return page;
  const sanitized = { ...(page as BookPage & Record<string, unknown>) };
  delete sanitized.sourceRefs;
  delete sanitized.sourceDocuments;
  delete sanitized.sourceDocumentId;
  delete sanitized.sourceUrl;
  delete sanitized.sourceUrlStatus;
  delete sanitized.sourceSnapshotHash;
  delete sanitized.objectKey;
  delete sanitized.reviewStatus;
  delete sanitized.officialTitle;
  return sanitized as BookPage;
}

function isLegacyCoverDeferredTitlePage(page: BookPage) {
  const title = page.title.trim().toLowerCase();
  const content = page.content.toLowerCase();
  const pageType = String((page as BookPage & Record<string, unknown>).pageType ?? '').toLowerCase();
  const hasLegacyDeferredCoverCopy =
    content.includes('cover artwork is intentionally deferred') ||
    content.includes('michoro ya jalada imeahirishwa');
  return hasLegacyDeferredCoverCopy && (pageType === 'front-matter' || title === 'title page' || title === 'ukurasa wa kichwa');
}

function visiblePagesForUser(user: AuthenticatedUser, pages: BookPage[]) {
  return pages
    .map(page => pageForUser(user, page))
    .filter(page => !isLegacyCoverDeferredTitlePage(page));
}

function pagesPayloadForUser(user: AuthenticatedUser, payload: BookPage[] | ({ pages?: BookPage[] } & Record<string, unknown>)) {
  if (Array.isArray(payload)) {
    return visiblePagesForUser(user, payload);
  }
  const sanitized = isGeneratedBookAdmin(user)
    ? { ...payload }
    : { ...(manifestForUser(user, payload as unknown as BookManifest) as unknown as Record<string, unknown>) };
  sanitized.pages = visiblePagesForUser(user, payload.pages ?? []);
  sanitized.pageCount = sanitized.pages.length;
  return sanitized;
}

export type GeneratedLibraryBook = {
  id: string;
  gradeLevel: string;
  country: string;
  curriculum: string;
  subjectId: string;
  subjectName: string;
  title: string;
  author: string;
  description: string;
  spineColor: string;
  textColor: string;
  height: string;
  spinePattern: 'plain' | 'striped' | 'banded';
  downloadable: boolean;
  pageCount: number;
  wordCount: number;
  version: string | null;
  manifestUrl: string;
  pdfUrl: string;
  coverImageUrl: string | null;
  checksum: string | null;
  pages: BookPage[];
};

export type GeneratedBookAsset = {
  stream: ReadStream | Readable;
  fileName: string;
  contentType: string;
  sizeBytes: number;
};

type ResolvedCoverImage = {
  path: string;
  mimeType: string;
  sizeBytes: number;
  version: string;
  sha256?: string;
};

function gradeToCode(grade: string | null | undefined) {
  const compact = grade?.trim();
  if (compact && /^[PS]\d+$/i.test(compact)) {
    return compact.toUpperCase();
  }
  const match = compact?.match(/\d+/);
  if (match) return `G${match[0]}`;
  return compact
    ? compact.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    : null;
}

function hasAllGeneratedBookAccess(user: AuthenticatedUser) {
  return (
    (user.email.trim().toLowerCase() === 'student@kitabu.ai' && user.roles.includes('student')) ||
    user.roles.some(role => role === 'teacher' || role === 'school_admin' || role === 'platform_admin')
  );
}

function normalizeCountryCode(countryCode: string | null | undefined) {
  const normalized = (countryCode || 'KEN').trim().toUpperCase();
  const aliases: Record<string, string> = {
    KE: 'KEN',
    KENYA: 'KEN',
    UG: 'UGA',
    UGANDA: 'UGA',
    RW: 'RWA',
    RWANDA: 'RWA',
    TZ: 'TZA',
    TANZANIA: 'TZA',
    ET: 'ETH',
    ETHIOPIA: 'ETH'
  };
  return aliases[normalized] ?? normalized;
}

function userCountryCode(user: AuthenticatedUser) {
  return normalizeCountryCode(user.countryCode);
}

function userCurriculumCode(user: AuthenticatedUser) {
  return (user.curriculumCode || 'CBC').toUpperCase();
}

function ensureInsideBooksRoot(filePath: string) {
  const resolved = path.resolve(filePath);
  const relative = path.relative(booksRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Generated book path escaped the books root.');
  }
  return resolved;
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

async function resolveCoverImage(packageDir: string, manifest: BookManifest): Promise<ResolvedCoverImage | null> {
  const relativePath = manifest.coverImage?.path ?? 'assets/cover.png';
  const coverPath = ensureInsideBooksRoot(path.join(packageDir, relativePath));
  const coverStat = await fs.stat(coverPath).catch(() => null);
  if (!coverStat?.isFile()) {
    return null;
  }

  const version = manifest.coverImage?.sha256 ?? `${coverStat.size}-${Math.trunc(coverStat.mtimeMs)}`;
  return {
    path: relativePath,
    mimeType: manifest.coverImage?.mimeType ?? 'image/png',
    sizeBytes: manifest.coverImage?.sizeBytes ?? coverStat.size,
    version,
    sha256: manifest.coverImage?.sha256
  };
}

function bookAssetUrl(bookId: string, format: 'pdf' | 'markdown' | 'pages' | 'source-map' | 'cover', version?: string) {
  const base = `/app/library/books/${encodeURIComponent(bookId)}/download?format=${format}`;
  return version ? `${base}&v=${encodeURIComponent(version)}` : base;
}

async function listSubjectManifestPaths(filters: { gradeCode?: string; country?: string; curriculum?: string }) {
  let countryDirs: string[];
  try {
    countryDirs = await fs.readdir(booksRoot);
  } catch {
    return [];
  }

  const manifestPaths: string[] = [];
  for (const country of countryDirs) {
    if (filters.country && country.toUpperCase() !== filters.country) continue;
    const countryPath = path.join(booksRoot, country);
    const countryStat = await fs.stat(countryPath).catch(() => null);
    if (!countryStat?.isDirectory()) continue;

    const curriculumDirs = await fs.readdir(countryPath).catch(() => []);
    for (const curriculum of curriculumDirs) {
      if (filters.curriculum && curriculum.toUpperCase() !== filters.curriculum) continue;
      const curriculumPath = path.join(countryPath, curriculum);
      const curriculumStat = await fs.stat(curriculumPath).catch(() => null);
      if (!curriculumStat?.isDirectory()) continue;

      const gradeDirs = filters.gradeCode ? [filters.gradeCode] : await fs.readdir(curriculumPath).catch(() => []);
      for (const gradeCode of gradeDirs) {
        const gradeDir = path.join(curriculumPath, gradeCode);
        const gradeStat = await fs.stat(gradeDir).catch(() => null);
        if (!gradeStat?.isDirectory()) continue;
        const subjectDirs = await fs.readdir(gradeDir).catch(() => []);
        for (const subject of subjectDirs) {
          manifestPaths.push(path.join(gradeDir, subject, 'manifest.json'));
        }
      }
    }
  }

  return manifestPaths;
}

async function loadBook(manifestPath: string, user: AuthenticatedUser): Promise<GeneratedLibraryBook | null> {
  try {
    const manifest = await readJson<BookManifest>(manifestPath);
    const packageDir = path.dirname(manifestPath);
    const [country, curriculum, gradeCode] = packageDir.split(path.sep).slice(-4, -1);
    if (
      country?.toUpperCase() !== manifest.country?.toUpperCase() ||
      curriculum?.toUpperCase() !== manifest.curriculum?.toUpperCase() ||
      gradeCode !== gradeToCode(manifest.grade)
    ) {
      return null;
    }
    if (!generatedBookVisibleToUser(user, manifest)) {
      return null;
    }
    const pagesFile = path.join(packageDir, 'pages.json');
    const pagesPayload = await readJson<BookPage[] | { pages?: BookPage[] }>(pagesFile);
    const pages = Array.isArray(pagesPayload) ? pagesPayload : pagesPayload.pages ?? [];
    if (!pages.length) {
      return null;
    }
    const visiblePages = visiblePagesForUser(user, pages);
    if (!visiblePages.length) {
      return null;
    }
    await fs.access(path.join(packageDir, 'source-map.json'));
    const pdfName = manifest.downloads?.pdf ?? `${manifest.bookId}.pdf`;
    const pdfPath = path.join(packageDir, pdfName);
    await fs.access(pdfPath);
    const coverImage = await resolveCoverImage(packageDir, manifest);

    return {
      id: manifest.bookId,
      gradeLevel: manifest.grade,
      country: manifest.country,
      curriculum: manifest.curriculum,
      subjectId: manifest.subjectSlug,
      subjectName: manifest.subject,
      title: manifest.title,
      author: 'Kitabu AI Learning Studio',
      description: `${manifest.subject} learner book with ${visiblePages.length} reading pages, mascot-guided activities, source map, and offline PDF.`,
      spineColor: manifest.subjectColor ?? '#0F766E',
      textColor: '#FFFFFF',
      height: visiblePages.length >= 220 ? 'h40' : visiblePages.length >= 160 ? 'h36' : 'h32',
      spinePattern: visiblePages.length >= 220 ? 'striped' : 'banded',
      downloadable: true,
      pageCount: visiblePages.length,
      wordCount: manifest.wordCount ?? 0,
      version: manifest.version ?? null,
      manifestUrl: `/app/library/books/${encodeURIComponent(manifest.bookId)}/manifest`,
      pdfUrl: bookAssetUrl(manifest.bookId, 'pdf'),
      coverImageUrl: coverImage ? bookAssetUrl(manifest.bookId, 'cover', coverImage.version) : null,
      checksum: manifest.packageChecksum ?? coverImage?.sha256 ?? coverImage?.version ?? null,
      pages: visiblePages
    };
  } catch {
    return null;
  }
}

export async function listGeneratedBooksForUser(
  user: AuthenticatedUser,
  filters: { grade?: string | null } = {}
): Promise<GeneratedLibraryBook[]> {
  const allContentAccess = hasAllGeneratedBookAccess(user);
  const selectedGradeCode = gradeToCode(filters.grade);
  const gradeCodes = selectedGradeCode
    ? [selectedGradeCode]
    : allContentAccess
      ? [undefined]
      : [gradeToCode(user.grade)].filter((gradeCode): gradeCode is string => Boolean(gradeCode));

  const books: GeneratedLibraryBook[] = [];
  for (const gradeCode of gradeCodes) {
    const manifestPaths = await listSubjectManifestPaths({
      gradeCode,
      country: allContentAccess ? undefined : userCountryCode(user),
      curriculum: allContentAccess ? undefined : userCurriculumCode(user)
    });
    for (const manifestPath of manifestPaths) {
      const book = await loadBook(manifestPath, user);
      if (book) {
        books.push(book);
      }
    }
  }

  return books.sort((a, b) => {
    const gradeCompare = a.gradeLevel.localeCompare(b.gradeLevel, undefined, { numeric: true });
    return gradeCompare || a.subjectName.localeCompare(b.subjectName) || a.title.localeCompare(b.title);
  });
}

async function findGeneratedBookPackage(bookId: string) {
  const manifestPaths = await listSubjectManifestPaths({});
  for (const manifestPath of manifestPaths) {
    const manifest = await readJson<BookManifest>(manifestPath).catch(() => null);
    if (manifest?.bookId === bookId) {
      return { manifest, packageDir: path.dirname(manifestPath) };
    }
  }
  return null;
}

function userCanAccessGeneratedBook(user: AuthenticatedUser, manifest: BookManifest) {
  return (
    hasAllGeneratedBookAccess(user) ||
    (
      normalizeCountryCode(manifest.country) === userCountryCode(user) &&
      manifest.curriculum.toUpperCase() === userCurriculumCode(user)
    )
  );
}

export async function readGeneratedBookManifestForUser(user: AuthenticatedUser, bookId: string) {
  const found = await findGeneratedBookPackage(bookId);
  if (!found || !userCanAccessGeneratedBook(user, found.manifest) || !generatedBookVisibleToUser(user, found.manifest)) {
    return null;
  }
  const pagesPath = ensureInsideBooksRoot(path.join(found.packageDir, 'pages.json'));
  const sourceMapPath = ensureInsideBooksRoot(path.join(found.packageDir, 'source-map.json'));
  const pagesStat = await fs.stat(pagesPath).catch(() => null);
  const sourceMapStat = await fs.stat(sourceMapPath).catch(() => null);
  if (!pagesStat?.isFile() || !sourceMapStat?.isFile()) {
    return null;
  }
  const pagesPayload = await readJson<BookPage[] | ({ pages?: BookPage[] } & Record<string, unknown>)>(pagesPath);
  const safePagesPayload = pagesPayloadForUser(user, pagesPayload);
  const safePageCount = Array.isArray(safePagesPayload)
    ? safePagesPayload.length
    : safePagesPayload.pages?.length ?? 0;
  const safePagesSizeBytes = Buffer.byteLength(`${JSON.stringify(safePagesPayload, null, 2)}\n`, 'utf8');
  const coverImage = await resolveCoverImage(found.packageDir, found.manifest);
  const safeManifest = manifestForUser(user, found.manifest);
  return {
    ...safeManifest,
    coverImage: safeManifest.coverImage ?? (coverImage
      ? {
          path: coverImage.path,
          mimeType: coverImage.mimeType,
          sizeBytes: coverImage.sizeBytes,
          sha256: coverImage.sha256
        }
      : null),
    pageCount: safePageCount,
    package: {
      pagesJson: {
        url: `/app/library/books/${encodeURIComponent(bookId)}/download?format=pages`,
        sizeBytes: safePagesSizeBytes
      },
      sourceMap: isGeneratedBookAdmin(user)
        ? {
            url: bookAssetUrl(bookId, 'source-map'),
            sizeBytes: sourceMapStat.size
          }
        : null,
      pdf: {
        url: bookAssetUrl(bookId, 'pdf')
      },
      cover: coverImage
        ? {
            url: bookAssetUrl(bookId, 'cover', coverImage.version),
            sizeBytes: coverImage.sizeBytes
          }
        : null
      }
  };
}

export async function openGeneratedBookAssetForUser(
  user: AuthenticatedUser,
  bookId: string,
  format: 'pdf' | 'markdown' | 'pages' | 'source-map' | 'cover'
): Promise<GeneratedBookAsset | null> {
  const found = await findGeneratedBookPackage(bookId);
  if (!found || !userCanAccessGeneratedBook(user, found.manifest) || !generatedBookVisibleToUser(user, found.manifest)) {
    return null;
  }
  if (format === 'source-map' && !isGeneratedBookAdmin(user)) {
    return null;
  }

  const fileByFormat = {
    pdf: found.manifest.downloads?.pdf ?? `${found.manifest.bookId}.pdf`,
    markdown: found.manifest.downloads?.markdown ?? `${found.manifest.bookId}.md`,
    pages: found.manifest.downloads?.pagesJson ?? 'pages.json',
    'source-map': found.manifest.downloads?.sourceMap ?? 'source-map.json',
    cover: found.manifest.coverImage?.path ?? 'assets/cover.png'
  };
  const contentTypes = {
    pdf: 'application/pdf',
    markdown: 'text/markdown; charset=utf-8',
    pages: 'application/json; charset=utf-8',
    'source-map': 'application/json; charset=utf-8',
    cover: found.manifest.coverImage?.mimeType ?? 'image/png'
  };
  const filePath = ensureInsideBooksRoot(path.join(found.packageDir, fileByFormat[format]));
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    return null;
  }

  if (format === 'pages' && !isGeneratedBookAdmin(user)) {
    const payload = await readJson<BookPage[] | ({ pages?: BookPage[] } & Record<string, unknown>)>(filePath);
    const buffer = Buffer.from(`${JSON.stringify(pagesPayloadForUser(user, payload), null, 2)}\n`, 'utf8');
    return {
      stream: Readable.from([buffer]),
      fileName: path.basename(filePath),
      contentType: contentTypes[format],
      sizeBytes: buffer.byteLength
    };
  }

  return {
    stream: createReadStream(filePath),
    fileName: path.basename(filePath),
    contentType: contentTypes[format],
    sizeBytes: stat.size
  };
}
