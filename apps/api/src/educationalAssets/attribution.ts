export interface EducationalAssetAttribution {
  assetId: string;
  sourceName: string;
  license: string;
  attribution: string | null;
}

export function projectEducationalAssetAttributions(rows: readonly EducationalAssetAttribution[]): EducationalAssetAttribution[] {
  return rows.map(row => ({ assetId: row.assetId, sourceName: row.sourceName, license: row.license, attribution: row.attribution }));
}
