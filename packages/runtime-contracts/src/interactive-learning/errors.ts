/**
 * Small, serializable failure vocabulary shared by the interactive runtime.
 *
 * Codes are owned by the subsystem that emits them. Consumers should branch on
 * `area` and `code`, never on human-readable messages.
 */

export type RuntimeIssueArea =
  | 'validation'
  | 'compatibility'
  | 'tip'
  | 'snapshot';

export type RuntimeIssuePath = readonly (string | number)[];

export interface RuntimeIssue {
  readonly area: RuntimeIssueArea;
  readonly code: string;
  readonly message: string;
  readonly path: RuntimeIssuePath;
}

export interface RuntimeAccepted<T> {
  readonly ok: true;
  readonly value: T;
}

export interface RuntimeRejected {
  readonly ok: false;
  readonly issues: readonly RuntimeIssue[];
}

export type RuntimeResult<T> = RuntimeAccepted<T> | RuntimeRejected;

export type ValidationResult<T> = RuntimeResult<T>;
export type CompatibilityResult<T> = RuntimeResult<T>;
export type TipResult<T> = RuntimeResult<T>;
export type SnapshotResult<T> = RuntimeResult<T>;

export function runtimeIssue(
  area: RuntimeIssueArea,
  code: string,
  message: string,
  path: RuntimeIssuePath = [],
): RuntimeIssue {
  return { area, code, message, path };
}

export function accepted<T>(value: T): RuntimeAccepted<T> {
  return { ok: true, value };
}

export function rejected(
  issue: RuntimeIssue | readonly RuntimeIssue[],
): RuntimeRejected {
  return { ok: false, issues: Array.isArray(issue) ? issue : [issue] };
}

export function validationIssue(
  code: string,
  message: string,
  path: RuntimeIssuePath = [],
): RuntimeIssue {
  return runtimeIssue('validation', code, message, path);
}

export function compatibilityRejection(
  code: string,
  message: string,
  path: RuntimeIssuePath = [],
): RuntimeRejected {
  return rejected(runtimeIssue('compatibility', code, message, path));
}

export function tipRejection(
  code: string,
  message: string,
  path: RuntimeIssuePath = [],
): RuntimeRejected {
  return rejected(runtimeIssue('tip', code, message, path));
}

export function snapshotRejection(
  code: string,
  message: string,
  path: RuntimeIssuePath = [],
): RuntimeRejected {
  return rejected(runtimeIssue('snapshot', code, message, path));
}

export function prefixIssuePath(
  prefix: RuntimeIssuePath,
  issues: readonly RuntimeIssue[],
): RuntimeIssue[] {
  if (prefix.length === 0) return [...issues];
  return issues.map((issue) => ({
    ...issue,
    path: [...prefix, ...issue.path],
  }));
}
