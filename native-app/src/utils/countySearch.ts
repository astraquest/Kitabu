export function filterCountyOptions(options: readonly string[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...options];
  return options.filter(option => option.toLocaleLowerCase().includes(normalized));
}
