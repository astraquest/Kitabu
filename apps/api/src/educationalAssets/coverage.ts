export interface EducationalAssetCoverageArea {
  subject: string;
  topic: string;
}

export interface EducationalAssetCoverageObservation extends EducationalAssetCoverageArea {
  count?: number;
}

export interface EducationalAssetCoverageReport {
  totalAssets: number;
  actual: Array<EducationalAssetCoverageArea & { count: number }>;
  expected: Array<EducationalAssetCoverageArea & { count: number }>;
  weak: Array<EducationalAssetCoverageArea & { count: number }>;
  uncovered: EducationalAssetCoverageArea[];
}

function normalizeCoverageValue(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function coverageKey(area: EducationalAssetCoverageArea): string {
  return `${normalizeCoverageValue(area.subject)}\u0000${normalizeCoverageValue(area.topic)}`;
}

function sortedAreas<T extends EducationalAssetCoverageArea>(areas: T[]): T[] {
  return areas.sort((left, right) => left.subject.localeCompare(right.subject) || left.topic.localeCompare(right.topic));
}

export function createEducationalAssetCoverageReport(
  observations: readonly EducationalAssetCoverageObservation[],
  expectedAreas: readonly EducationalAssetCoverageArea[],
  options: { weakBelow?: number } = {},
): EducationalAssetCoverageReport {
  const weakBelow = Math.max(1, Math.floor(options.weakBelow ?? 1));
  const actualCounts = new Map<string, EducationalAssetCoverageArea & { count: number }>();
  for (const observation of observations) {
    const count = observation.count ?? 1;
    if (!Number.isFinite(count) || count <= 0 || !observation.subject.trim() || !observation.topic.trim()) continue;
    const key = coverageKey(observation);
    const current = actualCounts.get(key);
    actualCounts.set(key, {
      subject: current?.subject ?? observation.subject.trim(),
      topic: current?.topic ?? observation.topic.trim(),
      count: (current?.count ?? 0) + count,
    });
  }

  const expected = new Map<string, EducationalAssetCoverageArea>();
  for (const area of expectedAreas) {
    if (area.subject.trim() && area.topic.trim()) expected.set(coverageKey(area), { subject: area.subject.trim(), topic: area.topic.trim() });
  }
  const expectedCounts = sortedAreas([...expected.entries()].map(([key, area]) => ({ ...area, count: actualCounts.get(key)?.count ?? 0 })));
  const weak = expectedCounts.filter(area => area.count > 0 && area.count < weakBelow);
  const uncovered = expectedCounts.filter(area => area.count === 0).map(({ subject, topic }) => ({ subject, topic }));
  return {
    totalAssets: [...actualCounts.values()].reduce((total, area) => total + area.count, 0),
    actual: sortedAreas([...actualCounts.values()]),
    expected: expectedCounts,
    weak,
    uncovered,
  };
}
