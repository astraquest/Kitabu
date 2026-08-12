import type { ComponentScenePayload } from './types.js';

export const GENERIC_SAMPLE_COMPONENT_IDS = [
  'picture-choice',
  'number-manipulatives',
  'phonics-sound-match',
  'vocabulary-picture-match',
  'reading-passage',
  'sentence-builder',
  'handwriting-trace',
  'rich-text-content',
  'single-choice',
  'fill-gap',
  'worked-example',
  'number-line',
  'fraction-manipulative',
  'measurement-lab',
  'equation-builder',
  'data-table-chart',
  'labelled-science-diagram',
  'observation-table',
  'virtual-lab',
  'glb-3d-model-viewer',
  'specimen-3d-explorer',
  'labelled-cell-3d',
  'comprehension-questions',
  'scribble-sign-doodle-canvas',
  'draw-annotate-canvas',
  'map-explorer',
  'history-timeline',
  'primary-source-analysis',
  'hardware-labeling',
  'block-code-trace',
  'digital-citizenship-scenario',
  'budget-planner',
  'accounting-ledger',
  'crop-life-cycle',
  'nutrition-plate-builder',
  'health-anatomy-diagram',
  'safety-decision-scenario',
  'pattern-composition-board',
  'music-rhythm-grid',
  'drama-roleplay',
  'movement-sequence',
  'emotion-regulation-checkin',
  'lesson-flow',
  'feedback-panel',
  'offline-content-fallback',
  'asset-reference',
  'evidence-capture',
] as const;

export type GenericSampleComponentId = typeof GENERIC_SAMPLE_COMPONENT_IDS[number];
export type GenericSampleInputKind = 'none' | 'text' | 'numeric' | 'choice';
export type GenericSampleEventType = 'select' | 'input' | 'submit' | 'step';

export interface GenericSampleOption {
  id: string;
  label: string;
  description?: string;
}

export interface GenericSampleTable {
  columns: string[];
  rows: string[][];
}

export interface GenericSamplePresentationHint {
  label: string;
  description?: string;
}

/** Declarative event metadata only. It contains no callbacks, code, or URLs. */
export interface GenericSampleEvent {
  type: GenericSampleEventType;
  targetId?: string;
  label?: string;
}

/** Small learner-visible fallback contract for catalog components without a bespoke renderer. */
export interface GenericSampleSceneProps {
  title: string;
  instructions: string;
  body?: string;
  steps?: string[];
  options?: GenericSampleOption[];
  items?: GenericSampleOption[];
  inputKind: GenericSampleInputKind;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputMaxLength?: number;
  modelUrl?: string;
  modelFallback?: string;
  markers?: Array<{
    id: string;
    label: string;
    position: [number, number, number];
  }>;
  activeMarker?: string;
  list?: string[];
  table?: GenericSampleTable;
  presentation?: {
    canvas?: GenericSamplePresentationHint;
    model?: GenericSamplePresentationHint;
    map?: GenericSamplePresentationHint;
  };
  events?: GenericSampleEvent[];
}

export interface GenericSampleSceneInput {
  sceneId: string;
  componentId: GenericSampleComponentId;
  prompt: string | { default: string; key?: string; values?: Record<string, string | number> };
  props: GenericSampleSceneProps;
  sceneVersion?: `${number}.${number}.${number}`;
  componentVersion?: `${number}.${number}.${number}`;
}

export type GenericSampleScene = ComponentScenePayload<GenericSampleSceneProps>;

const localized = (value: GenericSampleSceneInput['prompt']) =>
  typeof value === 'string' ? { default: value } : { ...value };

/** Builds only the public, learner-safe portion of a generic sample scene. */
export function buildGenericSampleScene(input: GenericSampleSceneInput): GenericSampleScene {
  return {
    identity: {
      sceneId: input.sceneId,
      schemaVersion: input.sceneVersion ?? '1.0.1',
    },
    component: {
      componentId: input.componentId,
      componentVersion: input.componentVersion ?? '1.0.0',
    },
    prompt: localized(input.prompt),
    props: {
      ...input.props,
      ...(input.props.steps ? { steps: [...input.props.steps] } : {}),
      ...(input.props.options ? { options: input.props.options.map(option => ({ ...option })) } : {}),
      ...(input.props.items ? { items: input.props.items.map(item => ({ ...item })) } : {}),
      ...(input.props.list ? { list: [...input.props.list] } : {}),
      ...(input.props.table ? {
        table: { columns: [...input.props.table.columns], rows: input.props.table.rows.map(row => [...row]) },
      } : {}),
      ...(input.props.presentation ? {
        presentation: {
          ...input.props.presentation,
          ...(input.props.presentation.canvas ? { canvas: { ...input.props.presentation.canvas } } : {}),
          ...(input.props.presentation.model ? { model: { ...input.props.presentation.model } } : {}),
          ...(input.props.presentation.map ? { map: { ...input.props.presentation.map } } : {}),
        },
      } : {}),
      ...(input.props.events ? { events: input.props.events.map(event => ({ ...event })) } : {}),
    },
  };
}
