import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

import {
  IMAGE_LIBRARY_CACHE_CONTROL,
  IMAGE_LIBRARY_CONTENT_DISPOSITION,
  IMAGE_LIBRARY_VERSION,
  imageLibraryRenderUrl,
  imageLibraryPublicUrl,
  inventoryImageLibraryEntry,
} from '../src/educationalAssets/imageLibrary.js';

loadEnv({ path: path.resolve(process.cwd(), '.env'), override: false });

const sourceDirectory = process.argv[2];
const onlyFilename = process.argv[3] === '--only' ? process.argv[4] : undefined;
const projectUrl = process.env.KITABU_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.KITABU_SUPABASE_SERVICE_ROLE_KEY;
const bucket = 'question-images';
const objectPublicBaseUrl = projectUrl ? `${projectUrl}/storage/v1/object/public/${bucket}` : undefined;

if (!sourceDirectory) throw new Error('Usage: tsx scripts/ingest-image-library-to-supabase.ts <source-image-directory>');
if (!projectUrl || !serviceRoleKey) throw new Error('KITABU_SUPABASE_URL and KITABU_SUPABASE_SERVICE_ROLE_KEY are required.');

const authHeaders = { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey };
const bucketUrl = `${projectUrl}/storage/v1/bucket/${encodeURIComponent(bucket)}`;
const existingBucket = await fetch(bucketUrl, { headers: authHeaders });
const existingBucketBody = existingBucket.ok ? null : await existingBucket.text();
const bucketMissing = existingBucket.status === 404 || (existingBucket.status === 400 && /not found/i.test(existingBucketBody ?? ''));
if (bucketMissing) {
  const createdBucket = await fetch(`${projectUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: true }),
  });
  if (!createdBucket.ok) throw new Error(`Unable to create question image bucket: ${createdBucket.status}`);
} else if (!existingBucket.ok) {
  throw new Error(`Unable to inspect question image bucket: ${existingBucket.status}`);
} else if ((await existingBucket.json() as { public?: boolean }).public !== true) {
  throw new Error(`Question image bucket ${bucket} must be public for cached learner image URLs.`);
}

const filenames = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
  .map(entry => entry.name)
  .filter(filename => !onlyFilename || filename === onlyFilename)
  .sort((left, right) => left.localeCompare(right));
if (filenames.length === 0) throw new Error('No matching PNG files found in image-library source directory.');

function objectUploadUrl(storageKey: string) {
  return `${projectUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${storageKey.split('/').map(encodeURIComponent).join('/')}?cacheControl=31536000`;
}

async function uploadQuestionImage(storageKey: string, content: Uint8Array, mimeType: string, replace = false) {
  // Supabase Storage's supported cacheControl upload option is serialized as this
  // cache-control request header. The versioned key makes the object immutable.
  const response = await fetch(objectUploadUrl(storageKey), {
    method: replace ? 'PUT' : 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': mimeType,
      'Cache-Control': 'max-age=31536000',
      'Content-Disposition': IMAGE_LIBRARY_CONTENT_DISPOSITION,
      ...(replace ? {} : { 'x-upsert': 'true' }),
    },
    body: content,
  });
  if (!response.ok) throw new Error(`Question image upload failed for ${storageKey}: ${response.status}`);
}

const entries = [];
async function ingest(filename: string) {
  const content = await readFile(path.join(sourceDirectory, filename));
  const entry = inventoryImageLibraryEntry(filename, content);
  await uploadQuestionImage(entry.storageKey, content, entry.mimeType, Boolean(onlyFilename));
  const publicUrl = imageLibraryRenderUrl(projectUrl, bucket, entry.storageKey);
  const objectUrl = imageLibraryPublicUrl(objectPublicBaseUrl, entry.storageKey);
  if (!publicUrl || !objectUrl) throw new Error('Image library requires public URLs.');
  const head = await fetch(publicUrl, { method: 'HEAD' });
  if (!head.ok) throw new Error(`Image library HEAD verification failed for ${entry.storageKey}: ${head.status}`);
  const get = await fetch(publicUrl);
  if (!get.ok) throw new Error(`Image library GET verification failed for ${entry.storageKey}: ${get.status}`);
  const cacheControl = head.headers.get('cache-control') ?? get.headers.get('cache-control');
  const contentDisposition = head.headers.get('content-disposition') ?? get.headers.get('content-disposition');
  const maxAge = Number(cacheControl?.match(/max-age=(\d+)/i)?.[1] ?? 0);
  if (maxAge < 31_536_000) throw new Error(`One-year cache header missing for ${entry.storageKey}: ${cacheControl ?? 'absent'}.`);
  const mimeType = head.headers.get('content-type') ?? get.headers.get('content-type');
  if (!mimeType?.toLowerCase().startsWith(entry.mimeType)) throw new Error(`PNG MIME header missing for ${entry.storageKey}: ${mimeType ?? 'absent'}.`);
  if (contentDisposition && !contentDisposition.includes('inline')) throw new Error(`Unexpected content disposition for ${entry.storageKey}: ${contentDisposition}.`);
  await get.arrayBuffer();
  const objectGet = await fetch(objectUrl);
  if (!objectGet.ok) throw new Error(`Image library original GET verification failed for ${entry.storageKey}: ${objectGet.status}`);
  const downloaded = new Uint8Array(await objectGet.arrayBuffer());
  const verified = inventoryImageLibraryEntry(filename, downloaded);
  if (verified.sha256 !== entry.sha256 || verified.byteSize !== entry.byteSize) throw new Error(`Downloaded content mismatch for ${entry.storageKey}.`);
  return { ...entry, publicUrl };
}

const BATCH_SIZE = 24;
for (let index = 0; index < filenames.length; index += BATCH_SIZE) {
  entries.push(...await Promise.all(filenames.slice(index, index + BATCH_SIZE).map(ingest)));
}
entries.sort((left, right) => left.storageKey.localeCompare(right.storageKey));

const manifest = {
  schemaVersion: 1,
  version: IMAGE_LIBRARY_VERSION,
  bucket,
  cacheControl: IMAGE_LIBRARY_CACHE_CONTROL,
  contentDisposition: IMAGE_LIBRARY_CONTENT_DISPOSITION,
  sourceLicense: 'UNKNOWN',
  provenance: 'user-provided',
  reviewStatus: 'review',
  entries,
};
if (!onlyFilename) {
  await uploadQuestionImage(`image-library/${IMAGE_LIBRARY_VERSION}/catalog.json`, Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), 'application/json');
}
console.log(JSON.stringify({ bucket, catalogKey: onlyFilename ? null : `image-library/${IMAGE_LIBRARY_VERSION}/catalog.json`, count: entries.length, created: entries.length, verified: entries.length }, null, 2));
