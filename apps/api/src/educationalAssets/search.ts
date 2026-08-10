export function normalizeEducationalAssetSearch(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function rankEducationalAssetSearch(query: string, candidate: { title: string; description?: string | null }): number {
  const normalizedQuery = normalizeEducationalAssetSearch(query);
  if (!normalizedQuery) return 0;
  const title = normalizeEducationalAssetSearch(candidate.title);
  const description = normalizeEducationalAssetSearch(candidate.description ?? '');
  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 75;
  if (title.includes(normalizedQuery)) return 50;
  return description.includes(normalizedQuery) ? 25 : 0;
}
