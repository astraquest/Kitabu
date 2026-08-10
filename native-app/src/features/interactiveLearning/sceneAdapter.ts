import type {
  StructuredResponseLocalizedText,
  StructuredResponseSceneProps,
} from './structuredResponse';
import type { RankedListSceneProps } from './rankedList/types';
import type { TraceConstructSceneProps } from './traceConstruct';
import type { AuthoredInteractionSceneProps } from './authoredInteraction';
import {
  GENERIC_SAMPLE_COMPONENT_IDS,
  type GenericSampleOption,
  type GenericSampleSceneProps,
} from './genericSample/types';

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

export interface TraceConstructRendererInput {
  rendererId: 'trace-construct/native';
  sceneId: string;
  prompt: StructuredResponseLocalizedText;
  props: TraceConstructSceneProps;
}

export interface AuthoredInteractionRendererInput {
  rendererId: 'authored-interaction/native';
  sceneId: string;
  prompt: StructuredResponseLocalizedText;
  props: AuthoredInteractionSceneProps;
}

export interface GenericSampleRendererInput {
  rendererId: 'generic-sample/native';
  sceneId: string;
  prompt: StructuredResponseLocalizedText;
  props: GenericSampleSceneProps;
}

export type NativeSceneRendererInput =
  | StructuredResponseRendererInput
  | RankedListRendererInput
  | TraceConstructRendererInput
  | AuthoredInteractionRendererInput
  | GenericSampleRendererInput;

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

function isTraceConstructProps(value: unknown): value is TraceConstructSceneProps {
  if (!isRecord(value) || !hasOnlyKeys(value, ['mode', 'targets', 'selectionCount', 'instruction', 'accessibility'])) {
    return false;
  }
  if (value.mode !== 'trace-path' && value.mode !== 'construct-pattern') return false;
  if (!Array.isArray(value.targets) || value.targets.length < 2 || value.targets.length > 12) return false;
  const targetIds = new Set<string>();
  for (const target of value.targets) {
    if (!isRecord(target) || !hasOnlyKeys(target, ['id', 'label', 'accessibleDescription']) ||
      typeof target.id !== 'string' || target.id.length === 0 || target.id.length > 80 ||
      typeof target.label !== 'string' || target.label.length === 0 || target.label.length > 80 ||
      typeof target.accessibleDescription !== 'string' || target.accessibleDescription.length === 0 ||
      targetIds.has(target.id)) return false;
    targetIds.add(target.id);
  }
  if (!Number.isInteger(value.selectionCount) ||
    (value.selectionCount as number) < 1 ||
    (value.selectionCount as number) > value.targets.length) return false;
  if (!isLocalizedText(value.instruction)) return false;
  return isRecord(value.accessibility) && hasOnlyKeys(value.accessibility, ['selectionLabel']) &&
    isLocalizedText(value.accessibility.selectionLabel);
}

function isAuthoredInteractionProps(value: unknown): value is AuthoredInteractionSceneProps {
  if (!isRecord(value) || !hasOnlyKeys(value, ['mode', 'instruction', 'items', 'groups'])) return false;
  if (!['classify', 'match', 'order', 'pattern'].includes(String(value.mode))) return false;
  if (typeof value.instruction !== 'string' || value.instruction.length < 1 || value.instruction.length > 500) return false;
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 24) return false;

  const itemIds = new Set<string>();
  for (const item of value.items) {
    if (!isRecord(item) || !hasOnlyKeys(item, ['id', 'label', 'accessibleDescription']) ||
      typeof item.id !== 'string' || item.id.length < 1 || item.id.length > 80 || itemIds.has(item.id) ||
      typeof item.label !== 'string' || item.label.length < 1 || item.label.length > 120 ||
      (item.accessibleDescription !== undefined &&
        (typeof item.accessibleDescription !== 'string' || item.accessibleDescription.length < 1 || item.accessibleDescription.length > 240))) {
      return false;
    }
    itemIds.add(item.id);
  }

  if (value.groups !== undefined) {
    if (!Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 24) return false;
    const groupIds = new Set<string>();
    for (const group of value.groups) {
      if (!isRecord(group) || !hasOnlyKeys(group, ['id', 'label']) ||
        typeof group.id !== 'string' || group.id.length < 1 || group.id.length > 80 || groupIds.has(group.id) ||
        typeof group.label !== 'string' || group.label.length < 1 || group.label.length > 120) return false;
      groupIds.add(group.id);
    }
  }

  if ((value.mode === 'classify' || value.mode === 'match') && !value.groups) return false;
  if (value.mode === 'order' && value.items.length < 2) return false;
  return true;
}

const GENERIC_SAMPLE_COMPONENT_ID_SET = new Set<string>(GENERIC_SAMPLE_COMPONENT_IDS);
const UNSAFE_URL_PATTERN = /(?:https?|javascript|data|file):\/\/|\bwww\./i;

function isSafeGenericText(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength && !UNSAFE_URL_PATTERN.test(value);
}

function isGenericSampleOption(value: unknown): value is GenericSampleOption {
  if (!isRecord(value) || !hasOnlyKeys(value, ['id', 'label', 'description'])) return false;
  return isSafeGenericText(value.id, 80) && isSafeGenericText(value.label, 180) &&
    (value.description === undefined || isSafeGenericText(value.description, 240));
}

function isGenericSampleHint(value: unknown): value is { label: string; description?: string } {
  return isRecord(value) && hasOnlyKeys(value, ['label', 'description']) &&
    isSafeGenericText(value.label, 160) &&
    (value.description === undefined || isSafeGenericText(value.description, 240));
}

export function isGenericSampleProps(value: unknown): value is GenericSampleSceneProps {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'title', 'instructions', 'body', 'steps', 'options', 'items', 'inputKind',
    'inputLabel', 'inputPlaceholder', 'inputMaxLength', 'list', 'table', 'presentation', 'events',
  ])) return false;
  if (!isSafeGenericText(value.title, 180) || !isSafeGenericText(value.instructions, 500)) return false;
  if (value.body !== undefined && !isSafeGenericText(value.body, 2_000)) return false;
  if (value.inputKind !== 'none' && value.inputKind !== 'text' && value.inputKind !== 'numeric' && value.inputKind !== 'choice') return false;

  for (const key of ['steps', 'list'] as const) {
    const entries = value[key];
    if (entries !== undefined && (!Array.isArray(entries) || entries.length < 1 || entries.length > 20 ||
      !entries.every(entry => isSafeGenericText(entry, key === 'steps' ? 300 : 240)))) return false;
  }

  const optionIds = new Set<string>();
  for (const key of ['options', 'items'] as const) {
    const entries = value[key];
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.length < 1 || entries.length > 20) return false;
    for (const entry of entries) {
      if (!isGenericSampleOption(entry) || optionIds.has(entry.id)) return false;
      optionIds.add(entry.id);
    }
  }
  if (value.inputKind === 'choice' && optionIds.size === 0) return false;
  if (value.inputLabel !== undefined && !isSafeGenericText(value.inputLabel, 160)) return false;
  if (value.inputPlaceholder !== undefined && !isSafeGenericText(value.inputPlaceholder, 160)) return false;
  if (value.inputMaxLength !== undefined && (
    typeof value.inputMaxLength !== 'number' ||
    !Number.isInteger(value.inputMaxLength) ||
    value.inputMaxLength < 1 ||
    value.inputMaxLength > 500
  )) return false;

  if (value.table !== undefined) {
    if (!isRecord(value.table) || !hasOnlyKeys(value.table, ['columns', 'rows'])) return false;
    const columns = value.table.columns;
    const rows = value.table.rows;
    if (!Array.isArray(columns) || columns.length < 1 || columns.length > 8 ||
      !columns.every(column => isSafeGenericText(column, 120)) ||
      !Array.isArray(rows) || rows.length > 20) return false;
    if (!rows.every(row => Array.isArray(row) && row.length === columns.length &&
      row.every(cell => isSafeGenericText(cell, 160)))) return false;
  }

  if (value.presentation !== undefined) {
    if (!isRecord(value.presentation) || !hasOnlyKeys(value.presentation, ['canvas', 'model', 'map'])) return false;
    for (const key of ['canvas', 'model', 'map'] as const) {
      if (value.presentation[key] !== undefined && !isGenericSampleHint(value.presentation[key])) return false;
    }
  }

  if (value.events !== undefined) {
    if (!Array.isArray(value.events) || value.events.length > 12) return false;
    for (const event of value.events) {
      if (!isRecord(event) || !hasOnlyKeys(event, ['type', 'targetId', 'label']) ||
        !['select', 'input', 'submit', 'step'].includes(String(event.type))) return false;
      if (event.targetId !== undefined && !isSafeGenericText(event.targetId, 80)) return false;
      if (event.label !== undefined && !isSafeGenericText(event.label, 160)) return false;
    }
  }
  return true;
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

  if (componentId === 'trace-construct') {
    if (!isTraceConstructProps(componentScene.props)) return { ok: false, code: 'invalid-renderer-props' };
    return { ok: true, input: { rendererId: 'trace-construct/native', sceneId, prompt: { ...componentScene.prompt }, props: componentScene.props } };
  }

  if (componentId === 'authored-interaction') {
    if (!isAuthoredInteractionProps(componentScene.props)) return { ok: false, code: 'invalid-renderer-props' };
    return { ok: true, input: { rendererId: 'authored-interaction/native', sceneId, prompt: { ...componentScene.prompt }, props: componentScene.props } };
  }

  if (typeof componentId === 'string' && GENERIC_SAMPLE_COMPONENT_ID_SET.has(componentId)) {
    if (!isGenericSampleProps(componentScene.props)) return { ok: false, code: 'invalid-renderer-props' };
    return {
      ok: true,
      input: {
        rendererId: 'generic-sample/native',
        sceneId,
        prompt: { ...componentScene.prompt },
        props: componentScene.props,
      },
    };
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
