// Wave 0 public API. Keep this list explicit so internal helpers do not become
// compatibility commitments by accident.

export {
  ASSET_ID_PATTERN,
  SHA256_PATTERN,
  validateAssetManifest,
} from './assets.js';
export type {
  AssetBudget,
  AssetDigestCheck,
  AssetKind,
  AssetLicence,
  AssetManifest,
  AssetManifestEntry,
  AssetManifestValidationResult,
  AssetProvenance,
  AssetTrustPolicy,
  AssetValidationIssue,
  AssetVerificationFailure,
  AssetVerificationResult,
} from './assets.js';

export {
  checkBundleCompatibility,
  pinAttemptToBundle,
} from './bundle.js';
export type {
  BundleCompatibilityIssue,
  BundleCompatibilityIssueCode,
  BundleCompatibilityResult,
  BundlePayloadReference,
  BundleReleaseChannel,
  BundleReleaseIdentity,
  BundleRuntimeSupport,
  BundleSceneReference,
  ComponentVersionLock,
  GraderVersionLock,
  InstalledComponentVersion,
  InstalledGraderVersion,
  InteractiveLearningBundleManifest,
  PinnedAttemptBundle,
} from './bundle.js';

export { selectRenderCapability } from './capabilities.js';
export type {
  CandidateRejection,
  CapabilityRejectionCode,
  CapabilityRequest,
  CapabilitySelection,
  DeviceTier,
  InteractionInput,
  RenderCandidate,
  RuntimeCapabilities,
  RuntimeRenderer,
} from './capabilities.js';

export { INTERACTIVE_LEARNING_PROTOCOL_VERSION } from './contract.js';
export type {
  AccessibilityPreferences,
  AssetManifest as ContractAssetManifest,
  AssetReference,
  AttemptIdentity,
  AttemptPolicy,
  CapabilityTier,
  ComponentEvent,
  ComponentEventType,
  ComponentIdentity,
  ComponentKind,
  ComponentManifest,
  ComponentMaturity,
  ComponentRenderer,
  ComponentSnapshot as ContractComponentSnapshot,
  CompletionDefinition,
  DeviceCapabilities,
  ErrorPayload,
  EvidenceClaim,
  EvidencePayload,
  EvidenceType,
  EnvelopePrivacyReference,
  EnvelopeVersionPins,
  FallbackReference,
  GraderReference,
  HostMessage,
  HostMessageType,
  InteractionPayload,
  JsonObject,
  LoadRequest,
  LocalizedText,
  MessageEnvelope,
  PrivacyClass,
  RendererBinding,
  RuntimeContext,
  SceneDefinition,
  SceneIdentity,
  ScenePurpose,
  SemVer,
  TutorAction,
  TutorActionResultPayload,
  TutorActionType,
  TutorPermission,
} from './contract.js';

export {
  accepted,
  compatibilityRejection,
  prefixIssuePath,
  rejected,
  runtimeIssue,
  snapshotRejection,
  tipRejection,
  validationIssue,
} from './errors.js';
export type {
  CompatibilityResult,
  RuntimeAccepted,
  RuntimeIssue,
  RuntimeIssueArea,
  RuntimeIssuePath,
  RuntimeRejected,
  RuntimeResult,
  SnapshotResult,
  TipResult,
  ValidationResult,
} from './errors.js';

export {
  HeadlessFakeComponentAdapter,
  runInteractiveLearningHarness,
} from './harness.js';
export type {
  HarnessDirection,
  HarnessIdentity,
  HarnessRunResult,
  HarnessScene,
  HarnessState,
  HarnessTraceEntry,
} from './harness.js';

export {
  classifyPrivacy,
  containsEmbeddedRawMedia,
  isRawMediaPrivacyClass,
  validateBlobReference,
  validateLearnerRecordPrivacy,
  validateRetentionReference,
} from './privacy.js';
export type {
  BlobReference,
  LearnerRecordKind,
  LearnerRecordPrivacy,
  PrivacyRisk,
  PrivacyValidationIssue,
  PrivacyValidationResult,
  RetentionReference,
} from './privacy.js';

export {
  RuntimeEnvelopeDuplicateGuard,
  runtimeSequenceScopeKey,
  validateEvidenceEnvelope,
  validateRuntimeEnvelope,
  validateRuntimePrivacyReference,
  validateRuntimeVersionPins,
} from './protocol.js';
export type {
  EnvelopeAcceptance,
  EvidenceEnvelope,
  ProtocolValidationIssue,
  ProtocolValidationResult,
  RuntimeEnvelope,
  RuntimeMessageType,
  RuntimePrivacyReference,
  RuntimeSequenceScope,
  RuntimeVersionPins,
} from './protocol.js';

export {
  ComponentRegistryError,
  createInstalledComponentRegistry,
} from './registry.js';
export type {
  InstalledComponentRegistry,
  ManifestParser,
  RegistryErrorCode,
} from './registry.js';

export { createSchemaLoader } from './schema-loader.js';
export type {
  SchemaLoader,
  SchemaRegistration,
  SchemaValidator,
} from './schema-loader.js';

export {
  canRestoreSnapshot,
  restoreSnapshot,
  validateSnapshot,
} from './snapshot.js';
export type {
  ComponentSnapshot,
  ComponentSnapshotMigration,
  ComponentSnapshotMigrationTable,
  SnapshotBinding,
  SnapshotIssue,
  SnapshotRestoreDenial,
  SnapshotRestoreDenialCode,
  SnapshotRestoreResult,
  SnapshotRestoreSuccess,
  SnapshotValidationResult,
} from './snapshot.js';

export { createTutorInterventionDispatcher } from './tip.js';
export type {
  AppliedTutorActionResult,
  AssistanceKind,
  ParameterValidationResult,
  RejectedTutorActionResult,
  TutorActionDescriptor,
  TutorActionExecutor,
  TutorActionId,
  TutorActionRejectionCode,
  TutorActionRequest,
  TutorActionResult,
  TutorAssistanceEffect,
  TutorDispatchContext,
  TutorInterventionDispatcher,
} from './tip.js';

export { validateComponentScene } from './validation.js';
export type {
  ComponentSceneLike,
  RegisteredComponentLike,
  SceneValidationDependencies,
  StructuralValidator,
  ValidationIssue as SceneValidationIssue,
  ValidationPath,
  ValidationResult as SceneValidationResult,
} from './validation.js';
