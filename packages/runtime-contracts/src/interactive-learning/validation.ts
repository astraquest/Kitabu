/** Runtime-agnostic validation for server-authored interactive scenes. */

import type {
  AssetReference,
  EvidenceClaim,
  SceneDefinition,
  TutorPermission,
} from './contract.js';

export type ValidationPath = ReadonlyArray<string | number>;

export interface ValidationIssue {
  code: string;
  message: string;
  path: ValidationPath;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: readonly ValidationIssue[] };

/** The canonical authored scene shape. Runtime and restore state are deliberately separate. */
export type ComponentSceneLike = SceneDefinition<Record<string, unknown>, unknown>;

export interface RegisteredComponentLike {
  componentId: string;
  componentVersion: string;
  stateSchemaVersion: string;
  capabilityTiers: readonly string[];
  supportedTutorActions: readonly string[];
  evidenceTypes: readonly string[];
}

export interface StructuralValidator<TScene extends ComponentSceneLike> {
  (input: unknown): ValidationResult<TScene>;
}

export interface SceneValidationDependencies<TScene extends ComponentSceneLike> {
  /** First validation stage: JSON Schema (or equivalent) parsing and normalization. */
  structuralValidator: StructuralValidator<TScene>;
  /** Exact-version lookup. Validation never silently upgrades authored content. */
  findComponent(componentId: string, componentVersion: string): RegisteredComponentLike | undefined;
  /** Component-specific props validation. */
  validateProps(component: RegisteredComponentLike, props: unknown): ValidationResult<unknown>;
  /** Resolves a complete authored fallback scene by its published scene ID. */
  findScene?(sceneId: string): unknown | undefined;
  validateAsset?(asset: AssetReference): ValidationResult<unknown>;
}

function issue(code: string, message: string, path: ValidationPath): ValidationIssue {
  return { code, message, path };
}

function prefixIssues(prefix: ValidationPath, issues: readonly ValidationIssue[]): ValidationIssue[] {
  return issues.map((item) => ({ ...item, path: [...prefix, ...item.path] }));
}

function duplicates(values: readonly string[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return repeated;
}

function validateClaimReferences(
  scene: ComponentSceneLike,
  path: ValidationPath,
  issues: ValidationIssue[],
): void {
  const authoredClaimIds = scene.evidenceClaims.map((claim) => claim.claimId);
  const claimIds = new Set(authoredClaimIds);
  for (const claimId of duplicates(authoredClaimIds)) {
    issues.push(issue('claim.duplicate_id', `Evidence claim ID "${claimId}" is duplicated.`, [...path, 'evidenceClaims']));
  }
  scene.completion.requiredClaimIds?.forEach((claimId, index) => {
    if (!claimIds.has(claimId)) {
      issues.push(issue(
        'completion.unknown_claim',
        `Completion rule references unknown evidence claim "${claimId}".`,
        [...path, 'completion', 'requiredClaimIds', index],
      ));
    }
  });
}

function validateAssets(
  assets: readonly AssetReference[],
  path: ValidationPath,
  dependencies: SceneValidationDependencies<ComponentSceneLike>,
  issues: ValidationIssue[],
): void {
  for (const assetId of duplicates(assets.map((asset) => asset.assetId))) {
    issues.push(issue('asset.duplicate_id', `Asset ID "${assetId}" is duplicated.`, [...path, 'assets', 'assets']));
  }
  assets.forEach((asset, index) => {
    if (/^\s*javascript:/i.test(asset.uri)) {
      issues.push(issue('asset.unsafe_uri', 'JavaScript asset URIs are not allowed.', [...path, 'assets', 'assets', index, 'uri']));
    }
    if (dependencies.validateAsset) {
      const result = dependencies.validateAsset(asset);
      if (!result.ok) issues.push(...prefixIssues([...path, 'assets', 'assets', index], result.issues));
    }
  });
}

function validateSceneSemantics<TScene extends ComponentSceneLike>(
  scene: TScene,
  dependencies: SceneValidationDependencies<TScene>,
  path: ValidationPath,
  issues: ValidationIssue[],
): void {
  if (scene.purpose === 'practice' || scene.purpose === 'assessment') {
    if (!scene.grader) {
      issues.push(issue(
        'grader.required',
        `${scene.purpose} scenes require a pinned opaque grader reference.`,
        [...path, 'grader'],
      ));
    }
    if (!scene.attemptPolicy) {
      issues.push(issue(
        'attempt_policy.required',
        `${scene.purpose} scenes require an explicit feedback, retry, and answer-reveal policy.`,
        [...path, 'attemptPolicy'],
      ));
    } else {
      for (const field of ['maxAttempts', 'feedbackTiming', 'revealAnswer'] as const) {
        if (scene.attemptPolicy[field] === undefined) {
          issues.push(issue(
            'attempt_policy.incomplete',
            `Attempt policy must explicitly define ${field}.`,
            [...path, 'attemptPolicy', field],
          ));
        }
      }
    }
  }

  if (scene.grader) {
    const allowedGraderKeys = new Set(['graderId', 'graderVersion', 'mode']);
    for (const key of Object.keys(scene.grader)) {
      if (!allowedGraderKeys.has(key)) {
        issues.push(issue(
          'grader.not_opaque',
          `Grader field "${key}" is not learner-safe. Keep grading configuration server-side.`,
          [...path, 'grader', key],
        ));
      }
    }
  }

  const component = dependencies.findComponent(
    scene.component.componentId,
    scene.component.componentVersion,
  );

  if (!component) {
    issues.push(issue(
      'component.not_registered',
      `Component "${scene.component.componentId}" at version "${scene.component.componentVersion}" is not registered.`,
      [...path, 'component', 'componentVersion'],
    ));
  } else {
    const props = dependencies.validateProps(component, scene.props);
    if (!props.ok) issues.push(...prefixIssues([...path, 'props'], props.issues));

    scene.tutorPermissions.forEach((permission: TutorPermission, index: number) => {
      if (!component.supportedTutorActions.includes(permission.action)) {
        issues.push(issue(
          'tutor_action.not_supported',
          `Tutor action "${permission.action}" is not supported by component "${scene.component.componentId}".`,
          [...path, 'tutorPermissions', index, 'action'],
        ));
      }
    });

    scene.evidenceClaims.forEach((claim: EvidenceClaim, claimIndex: number) => {
      claim.evidenceTypes.forEach((evidenceType, typeIndex) => {
        if (!component.evidenceTypes.includes(evidenceType)) {
          issues.push(issue(
            'evidence_type.not_supported',
            `Evidence type "${evidenceType}" is not emitted by component "${scene.component.componentId}".`,
            [...path, 'evidenceClaims', claimIndex, 'evidenceTypes', typeIndex],
          ));
        }
      });
    });
  }

  validateClaimReferences(scene, path, issues);
  validateAssets(
    scene.assets.assets,
    path,
    dependencies as SceneValidationDependencies<ComponentSceneLike>,
    issues,
  );
}

function validateFallbackChain<TScene extends ComponentSceneLike>(
  scene: TScene,
  dependencies: SceneValidationDependencies<TScene>,
  path: ValidationPath,
  activeSceneIds: string[],
  issues: ValidationIssue[],
): void {
  if (!scene.fallback) return;

  const fallbackPath: ValidationPath = [...path, 'fallback'];
  const fallbackId = scene.fallback.sceneId;
  const cycleStart = activeSceneIds.indexOf(fallbackId);
  if (cycleStart >= 0) {
    const cycle = [...activeSceneIds.slice(cycleStart), fallbackId].join(' -> ');
    issues.push(issue(
      'fallback.cycle',
      `Fallback cycle detected: ${cycle}. Point this fallback to a scene outside the active chain.`,
      [...fallbackPath, 'sceneId'],
    ));
    return;
  }
  const fallbackInput = dependencies.findScene?.(fallbackId);
  if (fallbackInput === undefined) {
    issues.push(issue(
      'fallback.scene_not_found',
      `Fallback scene "${fallbackId}" was not found in the published content bundle.`,
      [...fallbackPath, 'sceneId'],
    ));
    return;
  }
  const fallbackStructural = dependencies.structuralValidator(fallbackInput);
  if (!fallbackStructural.ok) {
    issues.push(...prefixIssues(fallbackPath, fallbackStructural.issues));
    return;
  }

  const fallbackScene = fallbackStructural.value;
  if (fallbackScene.identity.sceneId !== fallbackId) {
    issues.push(issue(
      'fallback.identity_mismatch',
      `Resolved fallback scene ID "${fallbackScene.identity.sceneId}" does not match "${fallbackId}".`,
      [...fallbackPath, 'sceneId'],
    ));
    return;
  }

  validateSceneSemantics(fallbackScene, dependencies, fallbackPath, issues);
  const sourceClaims = new Set(scene.evidenceClaims.map((claim) => claim.claimId));
  const fallbackClaims = new Set(fallbackScene.evidenceClaims.map((claim) => claim.claimId));
  scene.fallback.preservesClaimIds.forEach((claimId, index) => {
    if (!sourceClaims.has(claimId)) {
      issues.push(issue(
        'fallback.unknown_primary_claim',
        `Fallback preserves unknown source evidence claim "${claimId}".`,
        [...fallbackPath, 'preservesClaimIds', index],
      ));
    }
    if (!fallbackClaims.has(claimId)) {
      issues.push(issue(
        'fallback.unpreserved_claim',
        `Fallback scene does not define preserved evidence claim "${claimId}".`,
        [...fallbackPath, 'preservesClaimIds', index],
      ));
    }
  });

  activeSceneIds.push(fallbackId);
  validateFallbackChain(
    fallbackScene,
    dependencies,
    fallbackPath,
    activeSceneIds,
    issues,
  );
  activeSceneIds.pop();
}

/**
 * Runs two explicit stages: structural validation, then registry and cross-scene
 * semantic checks. Fallbacks are complete scenes referenced from the content bundle.
 */
export function validateComponentScene<TScene extends ComponentSceneLike>(
  input: unknown,
  dependencies: SceneValidationDependencies<TScene>,
): ValidationResult<TScene> {
  const structural = dependencies.structuralValidator(input);
  if (!structural.ok) return structural;

  const scene = structural.value;
  const issues: ValidationIssue[] = [];
  validateSceneSemantics(scene, dependencies, [], issues);
  validateFallbackChain(
    scene,
    dependencies,
    [],
    [scene.identity.sceneId],
    issues,
  );

  return issues.length === 0 ? { ok: true, value: scene } : { ok: false, issues };
}
