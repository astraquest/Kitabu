import { access, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'android/app/build');
const required = [
  join(root, 'generated/assets/createBundleReleaseJsAndAssets/index.android.bundle'),
  join(root, 'generated/sourcemaps/react/release/index.android.bundle.map'),
  join(root, 'outputs/mapping/release/mapping.txt'),
];
for (const file of required) await access(file);
const nativeSymbols = join(root, 'intermediates/stripped_native_libs/release/out/lib');
const symbolArchitectures = await readdir(nativeSymbols).catch(() => []);
if (symbolArchitectures.length === 0) throw new Error(`No native symbols found under ${nativeSymbols}`);
console.log(JSON.stringify({ status: 'ok', artifactRoot: root, sourceMap: required[1], nativeSymbols: symbolArchitectures }));

if (process.env.RELEASE_OBSERVABILITY_REQUIRED === 'true') {
  for (const name of ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT']) {
    if (!process.env[name]) throw new Error(`${name} is required when RELEASE_OBSERVABILITY_REQUIRED=true`);
  }
  console.log('Sentry upload credentials are present; CI release step must run sentry-cli upload next.');
}
