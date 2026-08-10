export interface EducationalAssetCurriculumLinkInput {
  unitId: string;
  relationshipMetadata?: Record<string, unknown>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeEducationalAssetCurriculumUnitIds(unitIds: readonly string[]): string[] {
  const normalized = [...new Set(unitIds.map(unitId => unitId.trim().toLowerCase()))];
  if (normalized.some(unitId => !uuidPattern.test(unitId))) {
    throw new Error('Curriculum unit IDs must be valid UUIDs');
  }
  return normalized.sort((left, right) => left.localeCompare(right));
}

export function serializeEducationalAssetRelationshipMetadata(
  metadata?: Record<string, unknown>,
): string {
  if (metadata === undefined) return '{}';
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new Error('Educational asset relationship metadata must be a JSON object');
  }
  let serialized: string;
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new Error('Educational asset relationship metadata must be JSON serializable');
  }
  if (!serialized.startsWith('{') || !serialized.endsWith('}')) {
    throw new Error('Educational asset relationship metadata must be a JSON object');
  }
  if (Buffer.byteLength(serialized, 'utf8') > 4000) {
    throw new Error('Educational asset relationship metadata must not exceed 4000 bytes');
  }
  return serialized;
}
