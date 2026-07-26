/** Learner-safe structured-response props from the runtime contract. */
export interface StructuredResponseLocalizedText {
  default: string;
  key?: string;
  values?: Record<string, string | number>;
}

export interface StructuredResponseNormalization {
  allowSurroundingWhitespace?: boolean;
  caseSensitive?: boolean;
  collapseInternalWhitespace?: boolean;
  allowThousandsSeparators?: boolean;
  locale?: string;
}

export interface StructuredResponseInput {
  placeholder?: StructuredResponseLocalizedText;
  maxLength?: number;
  allowMultiline?: boolean;
}

export interface StructuredResponseAccessibility {
  inputLabel: StructuredResponseLocalizedText;
  spokenPrompt?: StructuredResponseLocalizedText;
  responseFormatHint?: StructuredResponseLocalizedText;
}

interface StructuredResponseBaseProps {
  normalization?: StructuredResponseNormalization;
  accessibility: StructuredResponseAccessibility;
}

export type StructuredResponseSceneProps = StructuredResponseBaseProps &
  (
    | {
        mode: 'numeric';
        input?: Omit<StructuredResponseInput, 'allowMultiline'> & {
          allowMultiline?: false;
        };
      }
    | {
        mode: 'short-text';
        input?: StructuredResponseInput;
      }
  );
