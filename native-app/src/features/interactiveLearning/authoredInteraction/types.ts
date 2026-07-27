export type AuthoredInteractionMode = 'classify' | 'match' | 'order' | 'pattern';

export interface AuthoredInteractionItem {
  id: string;
  label: string;
  accessibleDescription?: string;
}

export interface AuthoredInteractionGroup {
  id: string;
  label: string;
}

/** Public renderer data only. Correct answers belong to the server grading contract. */
export interface AuthoredInteractionSceneProps {
  mode: AuthoredInteractionMode;
  instruction: string;
  items: AuthoredInteractionItem[];
  groups?: AuthoredInteractionGroup[];
}

export type AuthoredAssignments = Record<string, string>;
