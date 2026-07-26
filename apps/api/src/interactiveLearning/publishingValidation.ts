import { checkBundleCompatibility, type BundleReleaseChannel, type InteractiveLearningBundleManifest } from '@kitabu/runtime-contracts';

export type PublishableBundle = { manifest: InteractiveLearningBundleManifest; scenes: unknown[]; assetManifest: unknown };

const components = [
  { componentId: 'structured-response', componentVersion: '1.0.0' as const },
  { componentId: 'classify-sort-match-rank', componentVersion: '1.0.0' as const },
];
const graders = [
  { graderId: 'kitabu.sealed-numeric-answer', graderVersion: '1.0.0' as const },
  { graderId: 'ordered-item-ids', graderVersion: '1.0.0' as const },
];

export function validatePublishableBundle(bundle: PublishableBundle, channel: BundleReleaseChannel) {
  let result;
  try {
    result = checkBundleCompatibility(bundle.manifest, {
      protocolVersions: ['1.0.1'], sceneSchemaVersions: ['1.0.1'], appBuild: bundle.manifest.minimumAppBuild,
      components, graders, releaseChannel: channel,
    });
  } catch {
    return { valid: false, issues: [{ code: 'manifest.invalid' as const, path: 'manifest', message: 'manifest shape is invalid' }] };
  }
  const issues = [...result.issues];
  if (!Array.isArray(bundle.scenes) || bundle.scenes.length !== bundle.manifest.scenes.length) issues.push({ code: 'manifest.invalid', path: 'scenes', message: 'payload scene count must match manifest references' });
  if (!bundle.assetManifest || typeof bundle.assetManifest !== 'object') issues.push({ code: 'manifest.invalid', path: 'assetManifest', message: 'asset manifest payload is required' });
  return { valid: issues.length === 0, issues };
}
