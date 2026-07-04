import { Book, ContentPage, Podcast } from '../types/app';
import { apiRequest } from './apiClient';
import { buildKitabuRequestHeaders } from './requestHelpers';
import { getKitabuApiBaseUrl } from './runtimeConfig';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export async function getLibraryBooks(grade?: string | null) {
  const query = grade?.trim() ? `?grade=${encodeURIComponent(grade.trim())}` : '';
  const payload = await apiRequest<{ books: Book[] }>(`/app/library/books${query}`, {
    method: 'GET',
  });
  return payload.books;
}

export async function getLearningPodcasts() {
  const payload = await apiRequest<{ podcasts: Podcast[] }>('/app/podcasts', {
    method: 'GET',
  });
  return payload.podcasts;
}

interface BookManifestPayload {
  manifest: {
    bookId: string;
    title: string;
    version?: string | null;
    pageCount?: number | null;
    wordCount?: number | null;
    packageChecksum?: string | null;
    coverImage?: {
      path: string;
      sizeBytes?: number;
      sha256?: string;
    } | null;
    package?: {
      pagesJson?: {
        url: string;
        sizeBytes?: number;
      };
      pdf?: {
        url: string;
        sizeBytes?: number;
      };
      cover?: {
        url: string;
        sizeBytes?: number;
      } | null;
    };
  };
}

function normalizePages(payload: ContentPage[] | { pages?: ContentPage[] }) {
  return Array.isArray(payload) ? payload : payload.pages ?? [];
}

function safeFilePart(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '');
}

async function downloadOptionalAsset(bookId: string, pathOrUrl: string | null | undefined, extension: string) {
  const baseUrl = getKitabuApiBaseUrl();
  const documentDirectory = FileSystem.documentDirectory;
  if (!baseUrl || !documentDirectory || !pathOrUrl) {
    return null;
  }

  const dir = `${documentDirectory}kitabu-books/${safeFilePart(bookId)}/`;
  const target = `${dir}${safeFilePart(bookId)}.${extension}`;
  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const sourceUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
    const result = await FileSystem.downloadAsync(sourceUrl, target, {
      headers: await buildKitabuRequestHeaders(undefined, true, false),
    });
    return result.uri;
  } catch {
    return null;
  }
}

export async function getBookCoverPreviewUri(book: Book) {
  if (book.localCoverUri) {
    return book.localCoverUri;
  }

  if (!book.coverImageUrl) {
    return null;
  }

  const baseUrl = getKitabuApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const sourceUrl = book.coverImageUrl.startsWith('http')
    ? book.coverImageUrl
    : `${baseUrl}${book.coverImageUrl}`;

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(sourceUrl, {
        headers: await buildKitabuRequestHeaders(undefined, true, false),
      });
      if (!response.ok) {
        return null;
      }
      return URL.createObjectURL(await response.blob());
    } catch {
      return null;
    }
  }

  return downloadOptionalAsset(book.id, book.coverImageUrl, 'png');
}

export async function downloadBookForOffline(book: Book): Promise<Book> {
  if (!book.manifestUrl) {
    if (book.pages?.length) {
      return {
        ...book,
        downloadedAt: new Date().toISOString(),
      };
    }
    throw new Error('This book does not include a downloadable manifest yet.');
  }

  const { manifest } = await apiRequest<BookManifestPayload>(book.manifestUrl, {
    method: 'GET',
  });
  const pagesUrl = manifest.package?.pagesJson?.url;
  if (!pagesUrl) {
    throw new Error('This book manifest is missing the pages download.');
  }

  const pagesPayload = await apiRequest<ContentPage[] | { pages?: ContentPage[] }>(pagesUrl, {
    method: 'GET',
  });
  const pages = normalizePages(pagesPayload);
  if (pages.length === 0) {
    throw new Error('This book downloaded without readable pages.');
  }

  const [localPdfUri, localCoverUri] = await Promise.all([
    downloadOptionalAsset(book.id, manifest.package?.pdf?.url ?? book.pdfUrl, 'pdf'),
    downloadOptionalAsset(book.id, manifest.package?.cover?.url ?? book.coverImageUrl, 'png'),
  ]);

  return {
    ...book,
    title: manifest.title || book.title,
    version: manifest.version ?? book.version ?? null,
    checksum: manifest.packageChecksum ?? manifest.coverImage?.sha256 ?? book.checksum ?? null,
    coverImageUrl: manifest.package?.cover?.url ?? book.coverImageUrl ?? null,
    pdfUrl: manifest.package?.pdf?.url ?? book.pdfUrl ?? null,
    localPdfUri,
    localCoverUri,
    pageCount: manifest.pageCount ?? pages.length,
    wordCount: manifest.wordCount ?? book.wordCount ?? null,
    pages,
    downloadedAt: new Date().toISOString(),
  };
}

export async function removeDownloadedBookFiles(book: Book | undefined) {
  if (!book) {
    return;
  }

  const candidates = [
    book.localPdfUri,
    book.localCoverUri,
    FileSystem.documentDirectory
      ? `${FileSystem.documentDirectory}kitabu-books/${safeFilePart(book.id)}/`
      : null,
  ].filter((uri): uri is string => Boolean(uri));

  for (const uri of candidates) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Removing local files is best-effort; the cached index is the source of truth.
    }
  }
}
