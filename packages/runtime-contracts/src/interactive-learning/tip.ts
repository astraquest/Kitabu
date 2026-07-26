/**
 * Permission-only Tutor Intervention Protocol (TIP).
 *
 * Components own action descriptors and execution. Scenes may only remove
 * permissions; they cannot add actions or weaken component validation.
 */

export type TutorActionId =
  | "highlight"
  | "annotate"
  | "freeze"
  | "unfreeze"
  | "rewind"
  | "replay"
  | "setParameter"
  | "reveal"
  | "hide"
  | "switchRepresentation"
  | "spawnCounterexample"
  | "insertMicroTask"
  | "modelPartialAction"
  | "requestPrediction"
  | "requestExplanation"
  | "fadeScaffold"
  | "focusCamera";

export type ParameterValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

export type AssistanceKind =
  | "attention"
  | "annotation"
  | "control"
  | "scaffold"
  | "reveal"
  | "representation"
  | "counterexample"
  | "micro-task"
  | "modeling"
  | "prompt";

export interface TutorAssistanceEffect {
  readonly kind: AssistanceKind;
  readonly changesAssessableState: boolean;
  readonly learnerMayUndo: boolean;
  readonly evidenceConsequences: readonly string[];
  readonly accessibilityEquivalent: string;
}

export interface TutorActionRequest {
  /** Correlates this request with exactly one result. */
  readonly actionId: string;
  readonly action: TutorActionId;
  readonly targetId: string;
  readonly parameters?: unknown;
}

export interface TutorActionDescriptor<TParameters = unknown> {
  readonly action: TutorActionId;
  readonly permittedStates: readonly string[];
  /** Component-owned target check, applied after the host target check. */
  readonly acceptsTarget: (targetId: string) => boolean;
  /** Must parse/copy input rather than trusting an authored type assertion. */
  readonly validateParameters: (
    parameters: unknown,
  ) => ParameterValidationResult<TParameters>;
  readonly assistanceEffect: TutorAssistanceEffect;
}

export interface TutorDispatchContext {
  readonly componentState: string;
  /** Semantic targets currently present in the component. */
  readonly availableTargetIds: ReadonlySet<string>;
  /** Scene restriction. Omit to allow every component-declared action. */
  readonly scenePermittedActions?: readonly TutorActionId[];
}

export type TutorActionRejectionCode =
  | "invalid-request"
  | "action-not-declared"
  | "action-not-permitted-by-scene"
  | "state-not-permitted"
  | "target-not-found"
  | "target-not-permitted"
  | "invalid-parameters"
  | "execution-failed";

export interface AppliedTutorActionResult<TResult = unknown> {
  readonly actionId: string;
  readonly action: TutorActionId;
  readonly status: "applied";
  readonly targetId: string;
  readonly result: TResult;
  /** Tutor-applied work is never independent learner evidence. */
  readonly assistance: TutorAssistanceEffect & {
    readonly attribution: "tutor";
    readonly independentEvidenceEligible: false;
  };
}

export interface RejectedTutorActionResult {
  readonly actionId: string;
  readonly action: TutorActionId | "unknown";
  readonly status: "rejected";
  readonly code: TutorActionRejectionCode;
  readonly message: string;
}

export type TutorActionResult<TResult = unknown> =
  | AppliedTutorActionResult<TResult>
  | RejectedTutorActionResult;

export type TutorActionExecutor<TResult = unknown> = (
  action: TutorActionId,
  targetId: string,
  validatedParameters: unknown,
) => TResult;

export interface TutorInterventionDispatcher<TResult = unknown> {
  dispatch(
    request: TutorActionRequest,
    context: TutorDispatchContext,
  ): TutorActionResult<TResult>;
}

/**
 * Creates a dispatcher from immutable, component-owned action descriptors.
 * Execution occurs only after every permission boundary succeeds.
 */
export function createTutorInterventionDispatcher<TResult = unknown>(
  descriptors: readonly TutorActionDescriptor[],
  execute: TutorActionExecutor<TResult>,
): TutorInterventionDispatcher<TResult> {
  const descriptorByAction = new Map<TutorActionId, TutorActionDescriptor>();

  for (const descriptor of descriptors) {
    if (descriptorByAction.has(descriptor.action)) {
      throw new Error(`Duplicate tutor action descriptor: ${descriptor.action}`);
    }
    descriptorByAction.set(descriptor.action, descriptor);
  }

  return {
    dispatch(request, context) {
      const invalidRequest = validateRequest(request);
      if (invalidRequest) return invalidRequest;

      const deny = (code: TutorActionRejectionCode, message: string) =>
        reject(request, code, message);

      const descriptor = descriptorByAction.get(request.action);
      if (!descriptor) {
        return deny(
          "action-not-declared",
          `Component does not declare tutor action '${request.action}'.`,
        );
      }

      if (
        context.scenePermittedActions !== undefined &&
        !context.scenePermittedActions.includes(request.action)
      ) {
        return deny(
          "action-not-permitted-by-scene",
          `Scene does not permit tutor action '${request.action}'.`,
        );
      }

      if (!descriptor.permittedStates.includes(context.componentState)) {
        return deny(
          "state-not-permitted",
          `Tutor action '${request.action}' is not valid in state '${context.componentState}'.`,
        );
      }

      if (!context.availableTargetIds.has(request.targetId)) {
        return deny(
          "target-not-found",
          `Tutor action target '${request.targetId}' is not available.`,
        );
      }

      if (!descriptor.acceptsTarget(request.targetId)) {
        return deny(
          "target-not-permitted",
          `Tutor action '${request.action}' cannot target '${request.targetId}'.`,
        );
      }

      const parameters = descriptor.validateParameters(request.parameters);
      if (!parameters.ok) {
        return deny("invalid-parameters", parameters.message);
      }

      try {
        const result = execute(request.action, request.targetId, parameters.value);
        return {
          actionId: request.actionId,
          action: request.action,
          status: "applied",
          targetId: request.targetId,
          result,
          assistance: {
            ...descriptor.assistanceEffect,
            attribution: "tutor",
            independentEvidenceEligible: false,
          },
        };
      } catch {
        return deny(
          "execution-failed",
          `Tutor action '${request.action}' could not be applied.`,
        );
      }
    },
  };
}

function validateRequest(
  request: TutorActionRequest,
): RejectedTutorActionResult | undefined {
  if (
    typeof request !== "object" ||
    request === null ||
    !isNonEmptyString(request.actionId) ||
    typeof request.action !== "string" ||
    !isNonEmptyString(request.targetId)
  ) {
    return {
      actionId:
        typeof request?.actionId === "string" ? request.actionId : "unavailable",
      action:
        typeof request?.action === "string"
          ? (request.action as TutorActionId)
          : "unknown",
      status: "rejected",
      code: "invalid-request",
      message: "Tutor action requires non-empty actionId, action, and targetId.",
    };
  }
  return undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function reject(
  request: TutorActionRequest,
  code: TutorActionRejectionCode,
  message: string,
): RejectedTutorActionResult {
  return {
    actionId: request.actionId,
    action: request.action,
    status: "rejected",
    code,
    message,
  };
}
