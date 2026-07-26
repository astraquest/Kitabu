import type {
  StructuredResponseLocalizedText,
  StructuredResponseSceneProps,
} from './structuredResponse';
import type { RankedListSceneProps } from './rankedList/types';

export interface StructuredResponseRendererInput {
  rendererId: 'structured-response/native';
  sceneId: string;
  prompt: StructuredResponseLocalizedText;
  props: StructuredResponseSceneProps;
}

export interface RankedListRendererInput {
  rendererId: 'classify-sort-match-rank/native';
  sceneId: string;
  prompt: StructuredResponseLocalizedText;
  props: RankedListSceneProps;
}

export type NativeSceneRendererInput = StructuredResponseRendererInput | RankedListRendererInput;

export type SceneAdapterFailureCode =
  | 'invalid-scene'
  | 'renderer-not-installed'
  | 'invalid-renderer-props';

export type SceneAdapterResult =
  | { ok: true; input: NativeSceneRendererInput }
  | { ok: false; code: SceneAdapterFailureCode };

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: JsonRecord, keys: readonly string[]): boolean =>
  Object.keys(value).every(key => keys.includes(key));

function isLocalizedText(value: unknown): value is StructuredResponseLocalizedText {
  if (!isRecord(value) || !hasOnlyKeys(value, ['default', 'key', 'values'])) return false;
  if (typeof value.default !== 'string' || value.default.length === 0 || value.default.length > 500) {
    return false;
  }
  if (value.key !== undefined && (typeof value.key !== 'string' || value.key.length === 0)) return false;
  if (value.values !== undefined) {
    if (!isRecord(value.values)) return false;
    if (!Object.values(value.values).every(item => typeof item === 'string' || typeof item === 'number')) {
      return false;
    }
  }
  return true;
}

function isStructuredResponseProps(value: unknown): value is StructuredResponseSceneProps {
  if (!isRecord(value) || !hasOnlyKeys(value, ['mode', 'normalization', 'input', 'accessibility'])) {
    return false;
  }
  if (value.mode !== 'numeric' && value.mode !== 'short-text') return false;

  if (!isRecord(value.accessibility) || !hasOnlyKeys(value.accessibility, [
    'inputLabel',
    'spokenPrompt',
    'responseFormatHint',
  ])) return false;
  if (!isLocalizedText(value.accessibility.inputLabel)) return false;
  for (const key of ['spokenPrompt', 'responseFormatHint'] as const) {
    const text = value.accessibility[key];
    if (text !== undefined && !isLocalizedText(text)) return false;
  }

  if (value.normalization !== undefined) {
    if (!isRecord(value.normalization) || !hasOnlyKeys(value.normalization, [
      'allowSurroundingWhitespace',
      'caseSensitive',
      'collapseInternalWhitespace',
      'allowThousandsSeparators',
      'locale',
    ])) return false;
    for (const key of [
      'allowSurroundingWhitespace',
      'caseSensitive',
      'collapseInternalWhitespace',
      'allowThousandsSeparators',
    ] as const) {
      const option = value.normalization[key];
      if (option !== undefined && typeof option !== 'boolean') return false;
    }
    if (value.normalization.locale !== undefined && typeof value.normalization.locale !== 'string') return false;
  }

  if (value.input !== undefined) {
    if (!isRecord(value.input) || !hasOnlyKeys(value.input, ['placeholder', 'maxLength', 'allowMultiline'])) {
      return false;
    }
    if (value.input.placeholder !== undefined && !isLocalizedText(value.input.placeholder)) return false;
    if (value.input.maxLength !== undefined && (
      !Number.isInteger(value.input.maxLength) ||
      (value.input.maxLength as number) < 1 ||
      (value.input.maxLength as number) > 500
    )) return false;
    if (value.input.allowMultiline !== undefined && typeof value.input.allowMultiline !== 'boolean') return false;
    if (value.mode === 'numeric' && value.input.allowMultiline === true) return false;
  }

  return true;
}

function isRankedListProps(value: unknown): value is RankedListSceneProps {
  if (!isRecord(value) || value.mode !== 'ranked-list' || !Array.isArray(value.items)) return false;
  if (value.items.length < 2 || value.items.length > 12) return false;
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.label !== 'string' ||
        !Number.isInteger(item.value) || typeof item.accessibleDescription !== 'string' || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  if (!isRecord(value.orderingRules) || !['ascending', 'descending'].includes(String(value.orderingRules.direction))) return false;
  if (value.allowMultiplePlacements !== false || value.unplacedPolicy !== 'all-items-required') return false;
  if (!isRecord(value.layout) || !['vertical', 'horizontal'].includes(String(value.layout.orientation)) || typeof value.layout.showPositionNumbers !== 'boolean') return false;
  if (typeof value.shuffleSeed !== 'string' || !isRecord(value.explanationPolicy) || typeof value.explanationPolicy.required !== 'boolean') return false;
  return value.keyboardMoveModel === 'pick-move-drop' || value.keyboardMoveModel === 'move-buttons';
}

/** Converts an untrusted API componentScene into input for a renderer installed in this app build. */
export function adaptComponentScene(componentScene: unknown): SceneAdapterResult {
  if (!isRecord(componentScene) || !isRecord(componentScene.identity) || !isRecord(componentScene.component)) {
    return { ok: false, code: 'invalid-scene' };
  }

  const sceneId = componentScene.identity.sceneId;
  const componentId = componentScene.component.componentId;
  const componentVersion = componentScene.component.componentVersion;
  if (typeof sceneId !== 'string' || sceneId.length === 0 || !isLocalizedText(componentScene.prompt)) {
    return { ok: false, code: 'invalid-scene' };
  }

  if (componentVersion !== '1.0.0') {
    return { ok: false, code: 'renderer-not-installed' };
  }

  if (componentId === 'classify-sort-match-rank') {
    if (!isRankedListProps(componentScene.props)) return { ok: false, code: 'invalid-renderer-props' };
    return { ok: true, input: { rendererId: 'classify-sort-match-rank/native', sceneId, prompt: { ...componentScene.prompt }, props: componentScene.props } };
  }

  if (componentId !== 'structured-response') return { ok: false, code: 'renderer-not-installed' };

  if (!isStructuredResponseProps(componentScene.props)) {
    return { ok: false, code: 'invalid-renderer-props' };
  }

  return {
    ok: true,
    input: {
      rendererId: 'structured-response/native',
      sceneId,
      prompt: { ...componentScene.prompt },
      props: componentScene.props,
    },
  };
}
