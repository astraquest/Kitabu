import assert from 'node:assert/strict';
import test from 'node:test';
import { db, redis } from '../db.js';
import { PubChemResolver, PubChemSingleAssetAdapter, pubChemCandidateCacheKey, pubChemCandidateToRemoteAsset, pubChemNameCacheKey, pubChemPngCacheKey, pubChemPngUrl, pubChemPropertyUrl, type PubChemCachedCandidate, type PubChemCache } from './pubChem.js';
import { serializeEducationalAssetMetadata } from '../repositories.js';
import { normalizeEducationalAssetProvenanceMetadata } from './provenance.js';

test.after(async () => {
  await redis.quit().catch(() => undefined);
  await db.end().catch(() => undefined);
});

test('PubChem resolver encodes names and parses official property metadata fail-closed', async () => {
  let requestedUrl = '';
  const resolver = new PubChemResolver(async input => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 2244, Title: 'Aspirin', IUPACName: '2-acetyloxybenzoic acid', MolecularFormula: 'C9H8O4', InChIKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N', CanonicalSMILES: 'CC(=O)OC1=CC=CC=C1C(=O)O' }] } }));
  });
  const candidate = await resolver.lookupByName(' aspirin / test ');
  assert.match(requestedUrl, /aspirin%20%2F%20test/);
  assert.equal(candidate.cid, 2244);
  assert.equal(candidate.formula, 'C9H8O4');
  assert.equal(candidate.canonicalSmiles, 'CC(=O)OC1=CC=CC=C1C(=O)O');
  assert.equal(candidate.license, 'UNKNOWN');
  assert.equal(candidate.licenseDecision, 'needs-review');
  assert.equal(candidate.imageUrl, pubChemPngUrl(2244));
  assert.equal(pubChemNameCacheKey(' Aspirin '), 'pubchem:name:aspirin');
  assert.match(pubChemPropertyUrl('a/b'), /name\/a%2Fb\/property/);
});

test('PubChem resolver surfaces HTTP and timeout errors without implicit PNG downloads', async () => {
  const failed = new PubChemResolver(async () => new Response('missing', { status: 404 }));
  await assert.rejects(failed.lookupByName('missing'), /404/);
  const timeout = new PubChemResolver(async () => { throw new Error('timeout'); });
  await assert.rejects(timeout.lookupByName('water'), /timeout/);

  let downloads = 0;
  const downloader = new PubChemResolver(async () => { downloads += 1; return new Response(new Uint8Array([1, 2, 3])); });
  await assert.rejects(downloader.downloadPng({ cid: 2244, imageUrl: 'https://invalid.example/png' }), /does not match/);
  assert.equal(downloads, 0);
  assert.deepEqual(await downloader.downloadPng({ cid: 2244, imageUrl: pubChemPngUrl(2244) }), new Uint8Array([1, 2, 3]));
  assert.equal(downloads, 1);
});

test('PubChem structured metadata is JSON-object serializable for repository persistence', () => {
  const metadata = { cid: 962, formula: 'H2O', retrievedAt: '2026-08-10T00:00:00.000Z' };
  assert.deepEqual(JSON.parse(serializeEducationalAssetMetadata(metadata)), metadata);
  assert.equal(serializeEducationalAssetMetadata(), '{}');
  assert.throws(() => serializeEducationalAssetMetadata([] as unknown as Record<string, unknown>), /JSON object/);
});

test('provenance input normalization preserves metadata fields for repository serialization', () => {
  assert.deepEqual(normalizeEducationalAssetProvenanceMetadata({
    originalFilename: ' heart.svg ', creator: ' Ada ', creatorUrl: 'https://creators.example/ada ',
    licenseVersion: ' CC-BY-4.0 ', licenseEvidence: ' explicit provider evidence ',
  }), {
    originalFilename: 'heart.svg', creator: 'Ada', creatorUrl: 'https://creators.example/ada',
    licenseVersion: 'CC-BY-4.0', licenseEvidence: 'explicit provider evidence',
  });
  assert.throws(() => normalizeEducationalAssetProvenanceMetadata({ creatorUrl: 'javascript:alert(1)' }), /HTTP\(S\)/);
  assert.throws(() => normalizeEducationalAssetProvenanceMetadata({ creator: 'x'.repeat(1001) }), /too long/);
});

test('PubChem resolver reuses JSON-safe candidate and PNG cache entries without upstream fetches', async () => {
  const candidates = new Map<string, PubChemCachedCandidate>();
  const pngs = new Map<string, Uint8Array>();
  const cache: PubChemCache = {
    getCandidate: async key => candidates.get(key) ?? null,
    setCandidate: async (key, value) => { candidates.set(key, value); },
    getPng: async key => pngs.get(key) ?? null,
    setPng: async (key, value) => { pngs.set(key, new Uint8Array(value)); },
  };
  let lookups = 0;
  const resolver = new PubChemResolver(async input => {
    if (String(input).endsWith('/PNG')) return new Response(new Uint8Array([1, 2, 3]));
    lookups += 1;
    return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 962, Title: 'Water', MolecularFormula: 'H2O' }] } }));
  }, 10_000, cache);
  const first = await resolver.lookupByName('water');
  assert.equal(first.retrievedAt instanceof Date, true);
  assert.equal(typeof candidates.get(pubChemNameCacheKey('water'))?.retrievedAt, 'string');
  assert.ok(candidates.has(pubChemCandidateCacheKey(962)));
  const cachedResolver = new PubChemResolver(async () => { throw new Error('lookup should be cached'); }, 10_000, cache);
  const second = await cachedResolver.lookupByName(' WATER ');
  assert.deepEqual(second, first);
  assert.equal(lookups, 1);

  const bytes = await resolver.downloadPng({ cid: 962, imageUrl: pubChemPngUrl(962) });
  assert.deepEqual(bytes, new Uint8Array([1, 2, 3]));
  assert.equal(pngs.has(pubChemPngCacheKey(962)), true);
  const pngResolver = new PubChemResolver(async () => { throw new Error('PNG should be cached'); }, 10_000, cache);
  assert.deepEqual(await pngResolver.downloadPng({ cid: 962, imageUrl: pubChemPngUrl(962) }), new Uint8Array([1, 2, 3]));
});

test('PubChem single-asset flow requires explicit verified license evidence and keeps stable chemistry metadata', async () => {
  const candidate = {
    canonicalName: 'Water', cid: 962, formula: 'H2O', iupacName: 'oxidane', inchiKey: 'XLYOFNOQVPJJNP-UHFFFAOYSA-N', canonicalSmiles: 'O',
    sourcePageUrl: 'https://pubchem.ncbi.nlm.nih.gov/compound/962', imageUrl: pubChemPngUrl(962), retrievedAt: new Date('2026-08-10T00:00:00.000Z'), license: 'UNKNOWN' as const, licenseDecision: 'needs-review' as const,
  };
  assert.throws(() => pubChemCandidateToRemoteAsset(candidate, { license: 'UNKNOWN', licenseEvidenceUrl: 'https://example.test/license' }), /verified accepted or restricted/);
  assert.throws(() => pubChemCandidateToRemoteAsset(candidate, { license: 'MIT', licenseEvidenceUrl: '' }), /license evidence/);
  const remote = pubChemCandidateToRemoteAsset(candidate, { license: 'CC-BY-4.0', licenseEvidenceUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Verified structure attribution' });
  assert.equal(remote.providerKey, 'pubchem');
  assert.equal(remote.providerAssetId, 'cid:962');
  assert.equal(remote.visualType, 'CHEMICAL_STRUCTURE');
  assert.equal(remote.metadata?.canonicalSmiles, 'O');
  assert.equal(remote.metadata?.retrievedAt, '2026-08-10T00:00:00.000Z');

  let downloads = 0;
  const resolver = new PubChemResolver(async () => { downloads += 1; return new Response(new Uint8Array([9])); });
  const adapter = new PubChemSingleAssetAdapter(candidate, { license: 'CC-BY-4.0', licenseEvidenceUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Verified structure attribution' }, resolver);
  const discovered = await adapter.discover({ limit: 1 });
  assert.deepEqual(discovered.assets.map(asset => asset.providerAssetId), ['cid:962']);
  assert.equal(downloads, 0);
  assert.deepEqual(await adapter.download(discovered.assets[0]!), new Uint8Array([9]));
  assert.equal(downloads, 1);
});
