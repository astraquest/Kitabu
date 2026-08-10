import { serializeEducationalAssetRelationshipMetadata } from './curriculumLinks.js';

export interface EducationalAssetTaxonomyLinkInput {
  termCode: string;
  relationshipMetadata?: Record<string, unknown>;
}

export interface NormalizedEducationalAssetTaxonomyLink {
  termCode: string;
  relationshipMetadata: string;
}

const taxonomyCodePattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export function normalizeEducationalAssetTaxonomyCode(code: string): string {
  if (typeof code !== 'string') {
    throw new Error('Educational asset taxonomy codes must be strings');
  }
  const normalized = code.trim().toLowerCase();
  if (!normalized || normalized.length > 120 || !taxonomyCodePattern.test(normalized)) {
    throw new Error('Educational asset taxonomy codes must be lower-case identifiers');
  }
  return normalized;
}

export function normalizeEducationalAssetTaxonomyLinks(
  inputs: readonly EducationalAssetTaxonomyLinkInput[],
): NormalizedEducationalAssetTaxonomyLink[] {
  if (inputs.length > 100) {
    throw new Error('Educational asset taxonomy links must not exceed 100 terms');
  }
  const seen = new Set<string>();
  const normalized = inputs.map(input => {
    const termCode = normalizeEducationalAssetTaxonomyCode(input.termCode);
    if (seen.has(termCode)) {
      throw new Error(`Educational asset taxonomy term is duplicated: ${termCode}`);
    }
    seen.add(termCode);
    return {
      termCode,
      relationshipMetadata: serializeEducationalAssetRelationshipMetadata(input.relationshipMetadata),
    };
  });
  return normalized.sort((left, right) => left.termCode.localeCompare(right.termCode));
}
