import assert from 'node:assert/strict';
import test from 'node:test';

type UnknownRecord = Record<string, unknown>;

type RegistryLoadResult = {
  modulePath: string;
  moduleExports: UnknownRecord;
};

const REQUIRED_FEATURE_IDS = [
  'homework_helper_chat',
  'homework_helper_explanation',
  'voice_tutor_text',
  'live_voice_tutor',
  'audio_transcription',
  'speech_synthesis',
  'flashcard_generation',
  'quiz_generation',
  'assignment_generation',
  'curriculum_extraction',
  'curriculum_import_processing',
  'curriculum_lesson_generation',
  'curriculum_quiz_generation',
  'remedial_plan_generation',
  'parent_weekly_report_generation',
  'teacher_class_remediation_generation',
  'short_answer_grading'
] as const;

const NO_RESPONSE_CACHE_FEATURE_IDS = [
  'homework_helper_chat',
  'voice_tutor_text',
  'live_voice_tutor',
  'audio_transcription',
  'speech_synthesis'
] as const;

const DETERMINISTIC_CACHE_FEATURE_IDS = [
  'flashcard_generation',
  'quiz_generation',
  'assignment_generation',
  'curriculum_extraction',
  'curriculum_import_processing',
  'curriculum_lesson_generation',
  'curriculum_quiz_generation',
  'remedial_plan_generation',
  'parent_weekly_report_generation',
  'teacher_class_remediation_generation'
] as const;

const REGISTRY_MODULE_CANDIDATES = [
  './aiFeatures.js',
  './aiFeatureRegistry.js',
  './aiOrchestration.js'
] as const;

function configureApiTestEnv() {
  const env: Record<string, string> = {
    KITABU_RUNTIME_ENV: 'test',
    KITABU_NODE_ENV: 'test',
    KITABU_DATABASE_URL: 'postgres://kitabu:kitabu@localhost:5432/kitabu',
    KITABU_REDIS_URL: 'redis://localhost:6379',
    KITABU_JWT_ISSUER: 'kitabu-test',
    KITABU_JWT_AUDIENCE: 'kitabu-test',
    KITABU_JWT_PRIVATE_KEY: 'test-private-key',
    KITABU_JWT_PUBLIC_KEY: 'test-public-key',
    KITABU_OPENAI_API_KEY: 'test-openai-key',
    KITABU_GROQ_API_KEY: 'test-groq-key',
    KITABU_NVIDIA_API_KEY: 'test-nvidia-key',
    KITABU_GEMINI_API_KEY: 'test-gemini-key'
  };

  for (const [key, value] of Object.entries(env)) {
    process.env[key] = value;
  }
}

function isMissingModuleError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND' || /Cannot find module/.test(error.message);
}

async function loadRegistryModule(): Promise<RegistryLoadResult | null> {
  for (const modulePath of REGISTRY_MODULE_CANDIDATES) {
    try {
      const moduleExports = (await import(modulePath)) as UnknownRecord;
      return { modulePath, moduleExports };
    } catch (error) {
      if (isMissingModuleError(error)) {
        continue;
      }

      throw error;
    }
  }

  return null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getRegistryExport(moduleExports: UnknownRecord) {
  const getter = moduleExports.getAiFeatureRegistry;
  if (typeof getter === 'function') {
    return (getter as () => unknown)();
  }

  for (const exportName of ['aiFeatureRegistry', 'AI_FEATURE_REGISTRY', 'AI_FEATURES', 'aiFeatures', 'features']) {
    if (exportName in moduleExports) {
      return moduleExports[exportName];
    }
  }

  assert.fail(
    'Expected an AI feature registry export named getAiFeatureRegistry, aiFeatureRegistry, AI_FEATURE_REGISTRY, AI_FEATURES, aiFeatures, or features.'
  );
}

function normalizeRegistry(registry: unknown) {
  const features = new Map<string, UnknownRecord>();

  if (Array.isArray(registry)) {
    for (const item of registry) {
      assert.ok(isRecord(item), 'Each registry entry must be an object.');
      const id = item.id ?? item.featureId;
      if (typeof id !== 'string') {
        assert.fail('Each registry entry must include a string id or featureId.');
      }
      features.set(id, item);
    }
    return features;
  }

  if (registry instanceof Map) {
    for (const [id, item] of registry.entries()) {
      assert.equal(typeof id, 'string', 'Map registry keys must be feature id strings.');
      assert.ok(isRecord(item), `Feature ${id} must be an object.`);
      features.set(id, { id, ...item });
    }
    return features;
  }

  if (isRecord(registry)) {
    for (const [id, item] of Object.entries(registry)) {
      assert.ok(isRecord(item), `Feature ${id} must be an object.`);
      features.set(id, { id, ...item });
    }
    return features;
  }

  assert.fail('Expected the AI feature registry to be an array, object map, or Map keyed by feature id.');
}

function getNestedString(feature: UnknownRecord, paths: string[][]) {
  for (const path of paths) {
    let value: unknown = feature;
    for (const segment of path) {
      value = isRecord(value) ? value[segment] : undefined;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getPromptVersion(feature: UnknownRecord) {
  return getNestedString(feature, [
    ['promptVersion'],
    ['prompt', 'version'],
    ['prompt', 'versionId'],
    ['promptTemplate', 'version'],
    ['promptTemplateVersion']
  ]);
}

function getModelProfile(feature: UnknownRecord) {
  const stringProfile = getNestedString(feature, [
    ['modelProfile'],
    ['modelProfileId'],
    ['profile'],
    ['executionProfile'],
    ['orchestration', 'modelProfile']
  ]);
  if (stringProfile) {
    return stringProfile;
  }

  const profile = feature.modelProfile ?? feature.models ?? feature.modelProfiles;
  return profile ? JSON.stringify(profile) : null;
}

function getCachePolicy(feature: UnknownRecord) {
  const policy = feature.cachePolicy ?? feature.cache ?? feature.caching;
  if (typeof policy === 'string') {
    return policy.trim().toLowerCase();
  }
  if (isRecord(policy)) {
    const mode = policy.mode ?? policy.strategy ?? policy.kind;
    if (typeof mode === 'string') {
      return mode.trim().toLowerCase();
    }
    if (policy.enabled === false || policy.ttlSeconds === 0) {
      return 'disabled';
    }
    if (policy.deterministic === true || policy.keyTemplate || policy.keyParts) {
      return 'deterministic';
    }
  }

  return null;
}

function assertNonLegacyPromptVersion(featureId: string, promptVersion: string | null) {
  assert.ok(promptVersion, `${featureId} must declare a prompt version.`);
  assert.doesNotMatch(promptVersion, /legacy|deprecated|default/i, `${featureId} must not use a legacy/default prompt version.`);
  assert.doesNotMatch(promptVersion, /(?:^|[.-])v0(?:$|[.-])/i, `${featureId} must not use a v0 prompt version.`);
}

function assertNoResponseCachePolicy(featureId: string, cachePolicy: string | null) {
  assert.ok(cachePolicy, `${featureId} must declare a cache policy.`);
  assert.match(
    cachePolicy,
    /^(none|disabled|no-cache|no_cache|ephemeral|transient)$/,
    `${featureId} should not cache chat or voice responses.`
  );
}

function assertDeterministicCachePolicy(featureId: string, cachePolicy: string | null) {
  assert.ok(cachePolicy, `${featureId} must declare a cache policy.`);
  assert.match(
    cachePolicy,
    /^(deterministic|content|content-addressed|read-through|read_through|persistent|versioned|stable)$/,
    `${featureId} should use a deterministic generated-content cache policy.`
  );
}

test('AI feature registry contract covers required orchestration metadata', async t => {
  configureApiTestEnv();
  const loaded = await loadRegistryModule();
  if (!loaded) {
    t.skip(
      `Pending registry source: export a registry from one of ${REGISTRY_MODULE_CANDIDATES.join(', ')}. ` +
        'Expected fields per feature: id, promptVersion, cachePolicy, and modelProfile.'
    );
    return;
  }

  const registry = normalizeRegistry(getRegistryExport(loaded.moduleExports));

  for (const featureId of REQUIRED_FEATURE_IDS) {
    assert.ok(registry.has(featureId), `${loaded.modulePath} is missing ${featureId}.`);
    const feature = registry.get(featureId)!;
    assertNonLegacyPromptVersion(featureId, getPromptVersion(feature));
    assert.ok(getModelProfile(feature), `${featureId} must declare a model profile.`);
  }

  for (const featureId of NO_RESPONSE_CACHE_FEATURE_IDS) {
    assertNoResponseCachePolicy(featureId, getCachePolicy(registry.get(featureId)!));
  }

  for (const featureId of DETERMINISTIC_CACHE_FEATURE_IDS) {
    assertDeterministicCachePolicy(featureId, getCachePolicy(registry.get(featureId)!));
  }
});

test('AI execution planning assigns concrete provider models for current generated-text features', async () => {
  configureApiTestEnv();
  const { resolveAiExecutionPlans, resolveAudioTranscriptionPlans } = await import('./ai.js');

  for (const feature of [
    'homework_helper_chat',
    'quiz_generation',
    'flashcard_generation',
    'assignment_generation',
    'curriculum_import_processing',
    'curriculum_lesson_generation',
    'curriculum_quiz_generation'
  ]) {
    const plans = resolveAiExecutionPlans({ feature });
    assert.ok(plans.length > 0, `${feature} must resolve at least one execution plan.`);
    for (const plan of plans) {
      assert.ok(plan.provider, `${feature} plan must include a provider.`);
      assert.ok(plan.model, `${feature} plan must include a model.`);
    }
  }

  const transcriptionPlans = resolveAudioTranscriptionPlans();
  assert.ok(transcriptionPlans.length > 0, 'audio_transcription must resolve at least one execution plan.');
  for (const plan of transcriptionPlans) {
    assert.ok(plan.provider, 'audio_transcription plan must include a provider.');
    assert.ok(plan.model, 'audio_transcription plan must include a model.');
  }
});
