import type { ComponentSnapshot as RuntimeComponentSnapshot } from './snapshot.js';

/** Interactive Learning Runtime protocol v1.0.1. */
export const INTERACTIVE_LEARNING_PROTOCOL_VERSION = '1.0.1' as const;

export type SemVer = `${number}.${number}.${number}`;
export type JsonObject = Record<string, unknown>;

export type ComponentKind = 'primitive' | 'pattern' | 'engine' | 'composition';
export type ComponentMaturity = 'build-now' | 'build-next' | 'experimental' | 'adapter';
export type CapabilityTier = 'lite' | 'interactive' | 'immersive';
export type ComponentRenderer = 'native' | 'dom' | 'webgl' | 'adapter';
export type ScenePurpose = 'instruction' | 'practice' | 'assessment';

export type PrivacyClass =
  | 'ordinary-learning-event'
  | 'learner-authored-content'
  | 'sensitive-inference'
  | 'raw-audio'
  | 'raw-image-video'
  | 'precise-location'
  | 'biometric-or-pose';

export type EvidenceType =
  | 'answer'
  | 'construction'
  | 'process'
  | 'explanation'
  | 'observation'
  | 'creation'
  | 'collaboration';

export type TutorActionType =
  | 'highlight'
  | 'annotate'
  | 'freeze'
  | 'unfreeze'
  | 'rewind'
  | 'replay'
  | 'setParameter'
  | 'reveal'
  | 'hide'
  | 'switchRepresentation'
  | 'spawnCounterexample'
  | 'insertMicroTask'
  | 'modelPartialAction'
  | 'requestPrediction'
  | 'requestExplanation'
  | 'fadeScaffold'
  | 'focusCamera';

export interface ComponentIdentity {
  componentId: string;
  componentVersion: SemVer;
  specVersion: SemVer;
}

export interface SceneIdentity {
  sceneId: string;
  schemaVersion: SemVer;
}

export interface AttemptIdentity {
  sessionId: string;
  attemptId: string;
}

export interface RendererBinding {
  renderer: ComponentRenderer;
  bindingId: string;
}

export interface ComponentManifest {
  identity: ComponentIdentity;
  displayName: string;
  kind: ComponentKind;
  maturity: ComponentMaturity;
  owner: string;
  rendererBindings: RendererBinding[];
  capabilityTiers: CapabilityTier[];
  propsSchemaBindingId: string;
  stateSchemaVersion: SemVer;
  supportedTutorActions: TutorActionType[];
  emittedEvents: ComponentEventType[];
  evidenceTypes: EvidenceType[];
  privacyClasses: PrivacyClass[];
  fallbackComponentId?: string;
}

export interface LocalizedText {
  default: string;
  key?: string;
  values?: Record<string, string | number>;
}

export interface EvidenceClaim {
  claimId: string;
  description: LocalizedText;
  evidenceTypes: EvidenceType[];
  masteryRuleId?: string;
}

export interface GraderReference {
  graderId: string;
  graderVersion: SemVer;
  mode: 'exact' | 'numeric-tolerance' | 'semantic-state' | 'rubric' | 'bounded-model' | 'human';
}

export interface CompletionDefinition {
  completionRuleId: string;
  kind: 'submitted' | 'evidence-claims-met' | 'component-defined';
  requiredClaimIds?: string[];
}

export interface AttemptPolicy {
  maxAttempts?: number;
  feedbackTiming?: 'immediate' | 'on-submit' | 'after-attempts' | 'manual';
  revealAnswer?: 'never' | 'after-completion' | 'teacher-only';
}

export interface TutorPermission {
  action: TutorActionType;
  targetIds?: string[];
  parameterSchemaRef?: string;
  allowedStates?: string[];
  learnerCanUndo: boolean;
}

export interface AccessibilityPreferences {
  reducedMotion?: boolean;
  highContrast?: boolean;
  textScale?: number;
  captions?: boolean;
  screenReaderOptimized?: boolean;
  inputMode?: 'default' | 'keyboard' | 'switch' | 'touch';
}

export interface AssetReference {
  assetId: string;
  uri: string;
  mimeType: string;
  sha256?: string;
  sizeBytes?: number;
  licenseId: string;
  provenance: string[];
  optional?: boolean;
}

export interface AssetManifest {
  manifestId: string;
  assets: AssetReference[];
}

export interface FallbackReference {
  /** Resolves to a complete alternative scene in the same immutable content bundle. */
  sceneId: string;
  preservesClaimIds: string[];
}

/** Author-controlled content. It contains no session or device state. */
export interface SceneDefinition<TProps extends object = JsonObject, TState = unknown> {
  identity: SceneIdentity;
  component: Pick<ComponentIdentity, 'componentId' | 'componentVersion'>;
  purpose: ScenePurpose;
  prompt: LocalizedText;
  props: TProps;
  initialState?: TState;
  evidenceClaims: EvidenceClaim[];
  grader?: GraderReference;
  completion: CompletionDefinition;
  tutorPermissions: TutorPermission[];
  assets: AssetManifest;
  fallback?: FallbackReference;
  deterministicSeed?: string;
  attemptPolicy?: AttemptPolicy;
}

export interface DeviceCapabilities {
  tiers: CapabilityTier[];
  renderers: ComponentRenderer[];
  online: boolean;
}

/** Host-owned values that can differ for each learner or device. */
export interface RuntimeContext {
  identity: AttemptIdentity;
  locale: string;
  capabilities: DeviceCapabilities;
  accessibility: AccessibilityPreferences;
}

export interface LoadRequest<TProps extends object = JsonObject, TState = unknown> {
  scene: SceneDefinition<TProps, TState>;
  runtime: RuntimeContext;
  restore?: ComponentSnapshot<TState>;
}

/** Canonical snapshot shape; retained here as a compatibility export. */
export type ComponentSnapshot<TState = unknown> = RuntimeComponentSnapshot<TState>;

export type HostMessageType = HostMessage['type'];
export type ComponentEventType = ComponentEvent['type'];

/** Immutable implementations used to interpret, replay, and grade an envelope. */
export interface EnvelopeVersionPins {
  bundleId: string;
  bundleVersion: SemVer;
  sceneVersion: SemVer;
  componentVersion: SemVer;
  graderId: string;
  graderVersion: SemVer;
}

/** Retention is referenced, not authored ad hoc by a component. */
export interface EnvelopePrivacyReference {
  privacyClass: PrivacyClass;
  retentionPolicyId: string;
  retentionPolicyVersion: SemVer;
}

export interface MessageEnvelope<TType extends string, TPayload> {
  eventId: string;
  type: TType;
  protocolVersion: typeof INTERACTIVE_LEARNING_PROTOCOL_VERSION;
  sessionId: string;
  sceneId: string;
  attemptId: string;
  componentId: string;
  sequence: number;
  idempotencyKey: string;
  clientTimestamp: string;
  versions: EnvelopeVersionPins;
  privacy: EnvelopePrivacyReference;
  payload: TPayload;
}

export interface TutorAction {
  actionId: string;
  type: TutorActionType;
  targetIds: string[];
  parameters?: JsonObject;
  rationaleCode: string;
}

export interface InteractionPayload {
  verb: string;
  targetIds: string[];
  modality: 'touch' | 'pointer' | 'keyboard' | 'switch' | 'speech' | 'camera' | 'sensor' | 'system';
  values?: JsonObject;
  activeElapsedMs?: number;
  actor: 'learner' | 'tutor' | 'teacher' | 'system';
  privacyClass: PrivacyClass;
  revisesEventId?: string;
}

export interface EvidencePayload {
  evidenceId: string;
  claimId: string;
  evidenceType: EvidenceType;
  polarity: 'supports' | 'contradicts' | 'inconclusive';
  strength: number;
  sourceEventIds: string[];
  scorer: {
    id: string;
    version: SemVer;
    kind: 'deterministic' | 'model' | 'rubric' | 'human';
  };
  confidence?: number;
  data?: JsonObject;
}

export interface TutorActionResultPayload {
  actionId: string;
  status: 'applied' | 'rejected';
  reasonCode?: string;
}

export interface ErrorPayload {
  code: string;
  severity: 'recoverable' | 'terminal';
  safeMessage: LocalizedText;
  statePreserved: boolean;
  retryable: boolean;
}

export type HostMessage =
  | MessageEnvelope<'LOAD', LoadRequest>
  | MessageEnvelope<'PAUSE', Record<string, never>>
  | MessageEnvelope<'RESUME', Record<string, never>>
  | MessageEnvelope<'RESTORE_STATE', { snapshot: ComponentSnapshot }>
  | MessageEnvelope<'SET_LANGUAGE', { locale: string }>
  | MessageEnvelope<'SET_ACCESSIBILITY', AccessibilityPreferences>
  | MessageEnvelope<'REQUEST_SUBMISSION', Record<string, never>>
  | MessageEnvelope<'APPLY_TUTOR_ACTION', { action: TutorAction }>;

export type ComponentEvent =
  | MessageEnvelope<'READY', { activeCapabilityTier: CapabilityTier; renderer: ComponentRenderer }>
  | MessageEnvelope<'INTERACTION', InteractionPayload>
  | MessageEnvelope<'EVIDENCE', EvidencePayload>
  | MessageEnvelope<'ANSWER_CHANGED', { responseRef: string }>
  | MessageEnvelope<'HINT_REQUESTED', { targetIds: string[] }>
  | MessageEnvelope<'SUBMITTED', { submissionId: string; response: unknown }>
  | MessageEnvelope<'COMPLETED', { completionRuleId: string }>
  | MessageEnvelope<'STATE_SNAPSHOT', { snapshot: ComponentSnapshot }>
  | MessageEnvelope<'CAPABILITY_WARNING', { requested: CapabilityTier; active: CapabilityTier; reasonCode: string }>
  | MessageEnvelope<'TUTOR_ACTION_RESULT', TutorActionResultPayload>
  | MessageEnvelope<'ERROR', ErrorPayload>;
