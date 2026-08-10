export function normalizeEducationalAssetSearch(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function rankEducationalAssetSearch(query: string, candidate: {
  title: string;
  description?: string | null;
  subject?: string | null;
  topic?: string | null;
  subtopic?: string | null;
  keywords?: readonly string[] | null;
  synonyms?: readonly string[] | null;
  visualType?: string | null;
  providerKey?: string | null;
  license?: string | null;
}): number {
  const normalizedQuery = normalizeEducationalAssetSearch(query);
  if (!normalizedQuery) return 0;
  const title = normalizeEducationalAssetSearch(candidate.title);
  const description = normalizeEducationalAssetSearch(candidate.description ?? '');
  const metadata = [
    candidate.subject, candidate.topic, candidate.subtopic, candidate.visualType,
    candidate.providerKey, candidate.license, ...(candidate.keywords ?? []), ...(candidate.synonyms ?? []),
  ].map(value => normalizeEducationalAssetSearch(value ?? '')).filter(Boolean);
  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 75;
  if (title.includes(normalizedQuery)) return 50;
  if (metadata.some(value => value === normalizedQuery)) return 40;
  if (metadata.some(value => value.includes(normalizedQuery))) return 30;
  return description.includes(normalizedQuery) ? 25 : 0;
}
