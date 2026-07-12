export function shuffleOptions<T>(options: readonly T[], random = Math.random): T[] {
  const shuffled = [...options];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function stableShuffledOptions<T>(
  cache: Map<string, readonly unknown[]>,
  cacheKey: string,
  options: readonly T[],
): readonly T[] {
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached as readonly T[];
  }

  const shuffled = shuffleOptions(options);
  cache.set(cacheKey, shuffled);
  return shuffled;
}
