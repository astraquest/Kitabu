import type { StructuredResponseLocalizedText } from '../structuredResponse';

export type TraceConstructTarget = {
  id: string;
  label: string;
  accessibleDescription: string;
};

/** Learner-safe props for tap-first line, shape, and pattern construction activities. */
export type TraceConstructSceneProps = {
  mode: 'trace-path' | 'construct-pattern';
  targets: TraceConstructTarget[];
  /** Number of targets the learner must select. The solution remains server-side. */
  selectionCount: number;
  instruction: StructuredResponseLocalizedText;
  accessibility: { selectionLabel: StructuredResponseLocalizedText };
};
