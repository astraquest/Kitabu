import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { requireRoles } from '../rbac.js';
import {
  normalizeEducationalAssetTaxonomyCode,
  normalizeEducationalAssetTaxonomyLinks,
} from './taxonomy.js';

test('taxonomy codes normalize to stable lower-case identifiers', () => {
  assert.equal(normalizeEducationalAssetTaxonomyCode(' Biology.Anatomy '), 'biology.anatomy');
  assert.throws(() => normalizeEducationalAssetTaxonomyCode('biology anatomy'), /lower-case identifiers/);
  assert.throws(() => normalizeEducationalAssetTaxonomyCode('biology/'.repeat(20)), /lower-case identifiers/);
});

test('taxonomy link payloads reject duplicates and sort deterministically', () => {
  assert.deepEqual(
    normalizeEducationalAssetTaxonomyLinks([
      { termCode: 'physics.forces' },
      { termCode: 'biology.cells', relationshipMetadata: { reviewed: true } },
    ]),
    [
      { termCode: 'biology.cells', relationshipMetadata: '{"reviewed":true}' },
      { termCode: 'physics.forces', relationshipMetadata: '{}' },
    ],
  );
  assert.throws(() => normalizeEducationalAssetTaxonomyLinks([
    { termCode: 'biology.cells' },
    { termCode: 'BIOLOGY.CELLS' },
  ]), /duplicated/);
  assert.throws(() => normalizeEducationalAssetTaxonomyLinks(
    Array.from({ length: 101 }, (_, index) => ({ termCode: `term-${index}` })),
  ), /100 terms/);
});

test('taxonomy relationship metadata stays a bounded JSON object', () => {
  assert.throws(() => normalizeEducationalAssetTaxonomyLinks([
    { termCode: 'biology.cells', relationshipMetadata: { note: 'x'.repeat(4001) } },
  ]), /4000 bytes/);
  assert.throws(() => normalizeEducationalAssetTaxonomyLinks([
    { termCode: 'biology.cells', relationshipMetadata: [] as unknown as Record<string, unknown> },
  ]), /JSON object/);
});

test('taxonomy migration is additive, idempotent, and contains controlled seed examples', () => {
  const migration = readFileSync(new URL('../../sql/089_educational_asset_taxonomy.sql', import.meta.url), 'utf8');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS educational_asset_taxonomy_terms/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS educational_asset_taxonomy_links/);
  assert.match(migration, /ON CONFLICT \(code\) DO UPDATE/);
  for (const code of [
    'biology', 'biology.anatomy', 'biology.cells', 'biology.genetics',
    'biology.anatomy.human-body', 'biology.cells.cell-structure', 'biology.genetics.inheritance',
    'physics.forces', 'physics.machines', 'physics.machines.lever', 'physics.machines.pulley', 'physics.machines.inclined-plane', 'physics.electricity',
    'science', 'astronomy', 'general', 'social-studies', 'social', 'social_studies',
    'lower-primary.animals', 'lower-primary.foods', 'lower-primary.transport', 'lower-primary.weather',
  ]) {
    assert.match(migration, new RegExp(`['\\"]${code}['\\"]`));
  }
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('taxonomy routes are platform-admin only and replacement requires step-up', async () => {
  let deniedStatus = 0;
  const denied = await requireRoles(
    { user: { roles: ['teacher'] } } as never,
    { status: (status: number) => { deniedStatus = status; return { send: () => undefined }; } } as never,
    ['platform_admin'],
  );
  assert.equal(denied, true);
  assert.equal(deniedStatus, 403);

  let stepUpStatus = 0;
  const missingStepUp = await requireRoles(
    { user: { roles: ['platform_admin'], stepUp: false } } as never,
    { status: (status: number) => { stepUpStatus = status; return { send: () => undefined }; } } as never,
    ['platform_admin'],
    { requireStepUp: true },
  );
  assert.equal(missingStepUp, true);
  assert.equal(stepUpStatus, 428);
});
