import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { open, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '../../..');
loadEnv({ path: path.join(repositoryRoot, 'apps', 'api', '.env') });
loadEnv({ path: path.join(repositoryRoot, 'apps', 'api', `.env.${process.env.KITABU_RUNTIME_ENV ?? 'development'}`) });

const SOURCE_DIRECTORY = path.resolve(repositoryRoot, '..', '3D files');
const MANIFEST_PATH = path.join(repositoryRoot, 'learning-assets', '3d-files-manifest.json');
const EXPECTED_BUCKET = 'educational-3d';
const PREFIX = '3D files';
const VERSION = '1.0.0';
const MIME_TYPE = 'model/gltf-binary';
const CACHE_CONTROL = 'public, max-age=31536000, immutable';
const CACHE_CONTROL_SECONDS = '31536000';
const STANDARD_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;
const TUS_CHUNK_BYTES = 8 * 1024 * 1024;

function usage() {
  console.log('Usage: node apps/api/scripts/upload-3d-learning-assets.mjs [--inventory | --apply] [--skip-source <filename>]');
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function slugForFilename(filename) {
  const base = path.basename(filename, path.extname(filename));
  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'asset';
}

function displayNameForSlug(slug) {
  return slug.split('-').map(word => word ? word[0].toUpperCase() + word.slice(1) : word).join(' ');
}

function publicUrl(projectUrl, bucket, storageKey) {
  return `${projectUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(bucket)}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

function authHeaders(serviceRoleKey) {
  return { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey };
}

function parseGlb(buffer) {
  const magic = buffer.toString('ascii', 0, 4);
  const version = buffer.length >= 8 ? buffer.readUInt32LE(4) : null;
  const declaredLength = buffer.length >= 12 ? buffer.readUInt32LE(8) : null;
  let json = null;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.toString('ascii', offset + 4, offset + 8);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > buffer.length) break;
    if (chunkType === 'JSON') {
      try {
        json = JSON.parse(buffer.toString('utf8', chunkStart, chunkEnd).replace(/\0+$/g, ''));
      } catch {
        json = null;
      }
      break;
    }
    offset = chunkEnd;
  }
  const accessors = Array.isArray(json?.accessors) ? json.accessors : [];
  const meshes = Array.isArray(json?.meshes) ? json.meshes : [];
  let primitives = 0;
  let triangles = 0;
  for (const mesh of meshes) {
    for (const primitive of Array.isArray(mesh?.primitives) ? mesh.primitives : []) {
      primitives += 1;
      const indexAccessor = Number.isInteger(primitive.indices) ? accessors[primitive.indices] : null;
      const positionAccessor = Number.isInteger(primitive.attributes?.POSITION) ? accessors[primitive.attributes.POSITION] : null;
      const count = Number(indexAccessor?.count ?? positionAccessor?.count ?? 0);
      const mode = Number(primitive.mode ?? 4);
      if (mode === 4) triangles += Math.floor(count / 3);
      else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2);
    }
  }
  const nodes = Array.isArray(json?.nodes) ? json.nodes : [];
  const scenes = Array.isArray(json?.scenes) ? json.scenes : [];
  return {
    magic,
    version,
    declaredLength,
    actualLength: buffer.length,
    valid: magic === 'glTF' && version === 2 && declaredLength === buffer.length && json !== null,
    scenes: scenes.length,
    nodes: nodes.length,
    nodesWithMeshes: nodes.filter(node => Number.isInteger(node?.mesh)).length,
    meshes: meshes.length,
    primitives,
    triangles,
  };
}

async function inventory() {
  const entries = (await readdir(SOURCE_DIRECTORY, { withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.glb'))
    .map(entry => entry.name)
    .sort((left, right) => left.localeCompare(right));
  if (entries.length !== 14) throw new Error(`Expected 14 GLB files, found ${entries.length}`);
  const assets = [];
  for (const sourceFilename of entries) {
    const sourcePath = path.join(SOURCE_DIRECTORY, sourceFilename);
    const bytes = await readFile(sourcePath);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const slug = slugForFilename(sourceFilename);
    assets.push({
      sourceFilename,
      slug,
      assetId: `model-3d.${slug}`,
      displayName: displayNameForSlug(slug),
      version: VERSION,
      bytes: bytes.byteLength,
      sha256,
      mimeType: MIME_TYPE,
      storageKey: `${PREFIX}/v1/${slug}-${sha256.slice(0, 12)}.glb`,
      glb: parseGlb(bytes),
    });
  }
  return assets;
}

async function readManifest() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  if (manifest.manifestVersion !== 1 || manifest.bucket !== EXPECTED_BUCKET || manifest.prefix !== PREFIX || !Array.isArray(manifest.assets)) {
    throw new Error('3D files manifest has an unsupported shape');
  }
  return manifest;
}

function assertManifestMatchesInventory(manifest, assets) {
  if (manifest.assets.length !== assets.length) throw new Error('3D files manifest does not contain all source files');
  const byFilename = new Map(manifest.assets.map(asset => [asset.sourceFilename, asset]));
  for (const source of assets) {
    const entry = byFilename.get(source.sourceFilename);
    if (!entry || entry.assetId !== source.assetId || entry.version !== VERSION || entry.bucket !== EXPECTED_BUCKET || entry.storageKey !== source.storageKey || entry.mimeType !== MIME_TYPE || entry.bytes !== source.bytes || entry.sha256 !== source.sha256 || entry.status !== 'review/unverified') {
      throw new Error(`3D files manifest does not match ${source.sourceFilename}`);
    }
  }
}

async function supabaseConfig() {
  const projectUrl = process.env.KITABU_SUPABASE_URL?.trim().replace(/\/$/, '');
  const serviceRoleKey = process.env.KITABU_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!projectUrl || !serviceRoleKey) throw new Error('KITABU_SUPABASE_URL and KITABU_SUPABASE_SERVICE_ROLE_KEY are required');
  return { projectUrl, serviceRoleKey };
}

async function requestJson(url, init, description) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${description} failed: HTTP ${response.status}`);
  return response.json();
}

async function listBuckets(projectUrl, serviceRoleKey) {
  return requestJson(`${projectUrl}/storage/v1/bucket`, { headers: authHeaders(serviceRoleKey) }, 'Supabase bucket listing');
}

async function selectOrCreateBucket(projectUrl, serviceRoleKey) {
  const before = await listBuckets(projectUrl, serviceRoleKey);
  const publicEducationalBucket = before.find(bucket => bucket.public === true && /educational|3d/i.test(String(bucket.name)));
  if (publicEducationalBucket) return { bucket: publicEducationalBucket, created: false };
  const existingExpected = before.find(bucket => bucket.name === EXPECTED_BUCKET);
  if (existingExpected && existingExpected.public !== true) throw new Error(`Configured ${EXPECTED_BUCKET} bucket exists but is not public; refusing to change its policy`);
  if (!existingExpected) {
    const response = await fetch(`${projectUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...authHeaders(serviceRoleKey), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: EXPECTED_BUCKET, name: EXPECTED_BUCKET, public: true, allowed_mime_types: [MIME_TYPE] }),
    });
    if (!response.ok && response.status !== 409) {
      const body = await response.text().catch(() => '');
      throw new Error(`Supabase public 3D bucket creation failed: HTTP ${response.status}${body ? ` (${body.slice(0, 300)})` : ''}`);
    }
  }
  const after = await listBuckets(projectUrl, serviceRoleKey);
  const bucket = after.find(candidate => candidate.name === EXPECTED_BUCKET);
  if (!bucket || bucket.public !== true) throw new Error('Public educational-3d bucket was not confirmed after creation');
  return { bucket, created: !existingExpected };
}

async function listObjects(projectUrl, serviceRoleKey, bucket) {
  return requestJson(`${projectUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
    method: 'POST',
    headers: { ...authHeaders(serviceRoleKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix: `${PREFIX}/v1/`, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  }, 'Supabase 3D object listing');
}

function objectListed(objects, key) {
  return objects.find(object => object.name === key || object.name === key.slice(`${PREFIX}/v1/`.length) || object.name?.endsWith(`/${key}`));
}

function tusMetadata(values) {
  return Object.entries(values).map(([key, value]) => `${key} ${Buffer.from(value).toString('base64')}`).join(',');
}

async function uploadResumable(projectUrl, serviceRoleKey, bucket, asset) {
  const sourcePath = path.join(SOURCE_DIRECTORY, asset.sourceFilename);
  const sourceStat = await stat(sourcePath);
  const response = await fetch(`${projectUrl}/storage/v1/upload/resumable`, {
    method: 'POST',
    headers: {
      ...authHeaders(serviceRoleKey),
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(sourceStat.size),
      'Upload-Metadata': tusMetadata({ bucketName: bucket, objectName: asset.storageKey, contentType: MIME_TYPE, cacheControl: CACHE_CONTROL_SECONDS }),
      'x-upsert': 'false',
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 409 || /already exists|duplicate|keyalreadyexists/i.test(body)) return { created: false };
    throw new Error(`Supabase resumable upload initialization failed for ${asset.sourceFilename}: HTTP ${response.status}`);
  }
  const locationHeader = response.headers.get('location');
  if (!locationHeader) throw new Error(`Supabase resumable upload did not return a location for ${asset.sourceFilename}`);
  const uploadUrl = new URL(locationHeader, projectUrl).toString();
  const handle = await open(sourcePath, 'r');
  try {
    let offset = 0;
    while (offset < sourceStat.size) {
      const length = Math.min(TUS_CHUNK_BYTES, sourceStat.size - offset);
      const chunk = Buffer.allocUnsafe(length);
      await handle.read(chunk, 0, length, offset);
      const patch = await fetch(uploadUrl, {
        method: 'PATCH',
        headers: { ...authHeaders(serviceRoleKey), 'Tus-Resumable': '1.0.0', 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream', 'Content-Length': String(length) },
        body: chunk,
      });
      if (!patch.ok) throw new Error(`Supabase resumable upload chunk failed for ${asset.sourceFilename}: HTTP ${patch.status}`);
      const nextOffset = Number(patch.headers.get('upload-offset'));
      if (!Number.isSafeInteger(nextOffset) || nextOffset <= offset || nextOffset > sourceStat.size) throw new Error(`Supabase resumable upload returned an invalid offset for ${asset.sourceFilename}`);
      offset = nextOffset;
    }
  } finally {
    await handle.close();
  }
  return { created: true };
}

async function uploadStandard(projectUrl, serviceRoleKey, bucket, asset) {
  const sourcePath = path.join(SOURCE_DIRECTORY, asset.sourceFilename);
  const sourceStat = await stat(sourcePath);
  const objectEndpoint = `${projectUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${asset.storageKey.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(objectEndpoint, {
    method: 'POST',
    headers: {
      ...authHeaders(serviceRoleKey),
      'Content-Type': MIME_TYPE,
      'Content-Length': String(sourceStat.size),
      'x-upsert': 'false',
      'Cache-Control': CACHE_CONTROL,
      'Content-Disposition': 'inline',
    },
    body: createReadStream(sourcePath),
    duplex: 'half',
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    if (response.status === 409 || /already exists|duplicate|keyalreadyexists/i.test(body)) return { created: false };
    throw new Error(`Supabase standard upload failed for ${asset.sourceFilename}: HTTP ${response.status}${body ? ` (${body.slice(0, 300)})` : ''}`);
  }
  return { created: true };
}

async function uploadAsset(projectUrl, serviceRoleKey, bucket, asset) {
  return asset.bytes <= STANDARD_UPLOAD_MAX_BYTES
    ? uploadStandard(projectUrl, serviceRoleKey, bucket, asset)
    : uploadResumable(projectUrl, serviceRoleKey, bucket, asset);
}

async function verifyRemote(projectUrl, bucket, asset) {
  const response = await fetch(publicUrl(projectUrl, bucket, asset.storageKey));
  const body = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') ?? '';
  const cacheControl = response.headers.get('cache-control') ?? '';
  const sha256 = createHash('sha256').update(body).digest('hex');
  const result = { status: response.status, contentType, cacheControl, bytes: body.byteLength, sha256, magic: body.subarray(0, 4).toString('ascii') };
  if (![200, 206].includes(response.status)) throw new Error(`Remote verification failed for ${asset.sourceFilename}: HTTP ${response.status}`);
  if (body.byteLength !== asset.bytes || sha256 !== asset.sha256 || result.magic !== 'glTF' || !/^model\/gltf-binary(?:;|$)/i.test(contentType) || !/max-age=31536000/i.test(cacheControl)) {
    throw new Error(`Remote verification mismatch for ${asset.sourceFilename}`);
  }
  return result;
}

async function apply(assets) {
  const { projectUrl, serviceRoleKey } = await supabaseConfig();
  const selected = await selectOrCreateBucket(projectUrl, serviceRoleKey);
  const bucket = selected.bucket.name;
  const initialObjects = await listObjects(projectUrl, serviceRoleKey, bucket);
  const outcomes = [];
  for (const asset of assets) {
    const existing = objectListed(initialObjects, asset.storageKey);
    let uploaded = false;
    if (!existing) {
      const upload = await uploadAsset(projectUrl, serviceRoleKey, bucket, asset);
      uploaded = upload.created !== false;
    }
    const verification = await verifyRemote(projectUrl, bucket, asset);
    outcomes.push({ sourceFilename: asset.sourceFilename, storageKey: asset.storageKey, uploaded, reused: !uploaded, verification });
  }
  const finalObjects = await listObjects(projectUrl, serviceRoleKey, bucket);
  const expectedRemoteCount = assets.filter(asset => objectListed(finalObjects, asset.storageKey)).length;
  if (expectedRemoteCount !== assets.length) throw new Error(`Remote verification found ${expectedRemoteCount}/${assets.length} expected objects`);
  console.log(JSON.stringify({ bucket, bucketCreated: selected.created, prefix: PREFIX, totalObjectsUnderPrefix: finalObjects.filter(object => objectListed(finalObjects, `${PREFIX}/v1/${object.name}`) || object.name?.startsWith(`${PREFIX}/v1/`)).length, expectedObjects: expectedRemoteCount, outcomes }, null, 2));
}

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--inventory') ? 'inventory' : null;
if (!mode || (process.argv.includes('--apply') && process.argv.includes('--inventory'))) {
  usage();
  process.exitCode = 2;
} else {
  try {
    const assets = await inventory();
    if (mode === 'inventory') {
      console.log(JSON.stringify({ sourceDirectory: 'D:/APP BACKUPS/KITABU/3D files', count: assets.length, totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0), assets }, null, 2));
    } else {
      const manifest = await readManifest();
      assertManifestMatchesInventory(manifest, assets);
      const skipSource = option('--skip-source');
      const applyAssets = skipSource ? assets.filter(asset => asset.sourceFilename !== skipSource) : assets;
      if (skipSource && applyAssets.length === assets.length) throw new Error(`--skip-source did not match a source file: ${skipSource}`);
      await apply(applyAssets);
    }
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : '3D asset upload failed' }));
    process.exitCode = 1;
  }
}
