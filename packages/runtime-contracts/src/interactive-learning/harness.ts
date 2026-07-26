import type { SemVer } from './contract.js';
import type {
  RuntimeEnvelope,
  RuntimeMessageType,
  RuntimePrivacyReference,
} from './protocol.js';
import type { ComponentSnapshot, SnapshotBinding } from './snapshot.js';
import { restoreSnapshot } from './snapshot.js';

export type HarnessDirection = 'host-to-component' | 'component-to-host';

export interface HarnessTraceEntry<TPayload = unknown> {
  direction: HarnessDirection;
  envelope: RuntimeEnvelope<TPayload>;
}

export interface HarnessScene {
  sceneId: string;
  sceneVersion: SemVer;
  sceneRevision: string;
  componentId: string;
  componentVersion: SemVer;
  stateVersion: string;
  claimId: string;
}

export interface HarnessIdentity {
  sessionId: string;
  attemptId: string;
  bundleId: string;
  bundleVersion: SemVer;
  bundleRevision: string;
  graderId: string;
  graderVersion: SemVer;
  privacy: RuntimePrivacyReference;
}

export interface HarnessState {
  response: string | null;
  interactionCount: number;
  completed: boolean;
}

export interface HarnessRunResult {
  trace: readonly HarnessTraceEntry[];
  snapshot: ComponentSnapshot<HarnessState>;
  finalState: Readonly<HarnessState>;
}

const DEFAULT_IDENTITY: HarnessIdentity = {
  sessionId: 'harness-session',
  attemptId: 'harness-attempt',
  bundleId: 'harness-bundle',
  bundleVersion: '1.0.0',
  bundleRevision: 'harness-bundle-r1',
  graderId: 'headless-exact',
  graderVersion: '1.0.0',
  privacy: {
    privacyClass: 'ordinary-learning-event',
    retentionPolicyId: 'harness-retention',
    retentionPolicyVersion: '1.0.0',
  },
};

const DEFAULT_SCENE: HarnessScene = {
  sceneId: 'harness-scene',
  sceneVersion: '1.0.0',
  sceneRevision: 'harness-scene-r1',
  componentId: 'headless-fake',
  componentVersion: '1.0.0',
  stateVersion: '1.0.0',
  claimId: 'harness-claim',
};

/**
 * Minimal in-memory adapter used to verify the runtime protocol without a UI.
 * IDs and timestamps depend only on the sequence, so identical runs produce an
 * identical trace.
 */
export class HeadlessFakeComponentAdapter {
  readonly trace: HarnessTraceEntry[] = [];

  private sequence = 0;
  private phase: 'created' | 'loaded' | 'ready' | 'completed' = 'created';
  private state: HarnessState = {
    response: null,
    interactionCount: 0,
    completed: false,
  };

  constructor(
    private readonly scene: HarnessScene = DEFAULT_SCENE,
    private readonly identity: HarnessIdentity = DEFAULT_IDENTITY,
  ) {}

  load(): void {
    this.requirePhase('created');
    this.record('host-to-component', 'LOAD', { scene: this.scene });
    this.phase = 'loaded';
  }

  ready(): void {
    this.requirePhase('loaded');
    this.record('component-to-host', 'READY', {
      activeCapabilityTier: 'lite',
      renderer: 'adapter',
    });
    this.phase = 'ready';
  }

  interact(response: string): void {
    this.requirePhase('ready');
    const interaction = this.record('component-to-host', 'INTERACTION', {
      verb: 'answer',
      response,
    });
    this.state.response = response;
    this.state.interactionCount += 1;
    this.record('component-to-host', 'EVIDENCE', {
      evidenceId: `${interaction.eventId}:evidence`,
      claimId: this.scene.claimId,
      evidenceType: 'answer',
      polarity: response.length > 0 ? 'supports' : 'inconclusive',
      strength: response.length > 0 ? 1 : 0,
      sourceEventIds: [interaction.eventId],
      scorer: { id: this.identity.graderId, version: this.identity.graderVersion, kind: 'deterministic' },
    });
  }

  createSnapshot(): ComponentSnapshot<HarnessState> {
    this.requirePhase('ready');
    const snapshot: ComponentSnapshot<HarnessState> = {
      snapshotSchemaVersion: '1.0.1',
      ...this.snapshotBinding(),
      sequence: this.sequence,
      state: { ...this.state },
      savedAt: this.timestamp(this.sequence + 1),
    };
    this.record('component-to-host', 'STATE_SNAPSHOT', { snapshot });
    return snapshot;
  }

  restore(snapshot: ComponentSnapshot<HarnessState>): void {
    this.requirePhase('ready');
    this.record('host-to-component', 'RESTORE_STATE', { snapshot });
    const restored = restoreSnapshot<HarnessState>(snapshot, this.snapshotBinding());
    if (!restored.ok) {
      throw new Error(`Harness snapshot restore failed: ${restored.code}`);
    }
    this.state = { ...restored.state };
  }

  complete(): void {
    this.requirePhase('ready');
    this.state.completed = true;
    this.record('component-to-host', 'COMPLETED', { completionRuleId: 'harness-complete' });
    this.phase = 'completed';
  }

  currentState(): Readonly<HarnessState> {
    return { ...this.state };
  }

  private snapshotBinding(): SnapshotBinding {
    return {
      attemptId: this.identity.attemptId,
      bundleId: this.identity.bundleId,
      bundleRevision: this.identity.bundleRevision,
      sceneId: this.scene.sceneId,
      sceneRevision: this.scene.sceneRevision,
      componentId: this.scene.componentId,
      componentVersion: this.scene.componentVersion,
      stateVersion: this.scene.stateVersion,
    };
  }

  private record<TPayload>(
    direction: HarnessDirection,
    type: RuntimeMessageType,
    payload: TPayload,
  ): RuntimeEnvelope<TPayload> {
    const sequence = ++this.sequence;
    const eventId = `${this.identity.attemptId}:${sequence}:${type.toLowerCase()}`;
    const envelope: RuntimeEnvelope<TPayload> = {
      eventId,
      idempotencyKey: eventId,
      type,
      sequence,
      clientTimestamp: this.timestamp(sequence),
      sessionId: this.identity.sessionId,
      sceneId: this.scene.sceneId,
      attemptId: this.identity.attemptId,
      componentId: this.scene.componentId,
      protocolVersion: '1.0.1',
      versions: {
        bundleId: this.identity.bundleId,
        bundleVersion: this.identity.bundleVersion,
        sceneVersion: this.scene.sceneVersion,
        componentVersion: this.scene.componentVersion,
        graderId: this.identity.graderId,
        graderVersion: this.identity.graderVersion,
      },
      privacy: this.identity.privacy,
      payload,
    };
    this.trace.push({ direction, envelope });
    return envelope;
  }

  private timestamp(sequence: number): string {
    return new Date(sequence).toISOString();
  }

  private requirePhase(expected: typeof this.phase): void {
    if (this.phase !== expected) {
      throw new Error(`Harness lifecycle violation: expected ${expected}, received ${this.phase}.`);
    }
  }
}

/** Runs the complete deterministic smoke path used by shared runtime tests. */
export function runInteractiveLearningHarness(
  response = '42',
  scene: HarnessScene = DEFAULT_SCENE,
  identity: HarnessIdentity = DEFAULT_IDENTITY,
): HarnessRunResult {
  const adapter = new HeadlessFakeComponentAdapter(scene, identity);
  adapter.load();
  adapter.ready();
  adapter.interact(response);
  const snapshot = adapter.createSnapshot();
  adapter.restore(snapshot);
  adapter.complete();

  return {
    trace: adapter.trace,
    snapshot,
    finalState: adapter.currentState(),
  };
}
