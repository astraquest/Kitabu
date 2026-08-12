export const GENERIC_SAMPLE_COMPONENT_IDS = [
  'picture-choice', 'number-manipulatives', 'phonics-sound-match', 'vocabulary-picture-match',
  'reading-passage', 'sentence-builder', 'handwriting-trace', 'rich-text-content', 'single-choice',
  'fill-gap', 'worked-example', 'number-line', 'fraction-manipulative', 'measurement-lab',
  'equation-builder', 'data-table-chart', 'labelled-science-diagram', 'observation-table',
  'virtual-lab', 'glb-3d-model-viewer', 'specimen-3d-explorer', 'comprehension-questions',
  'labelled-cell-3d',
  'scribble-sign-doodle-canvas', 'draw-annotate-canvas', 'map-explorer', 'history-timeline',
  'primary-source-analysis', 'hardware-labeling', 'block-code-trace', 'digital-citizenship-scenario',
  'budget-planner', 'accounting-ledger', 'crop-life-cycle', 'nutrition-plate-builder',
  'health-anatomy-diagram', 'safety-decision-scenario', 'pattern-composition-board',
  'music-rhythm-grid', 'drama-roleplay', 'movement-sequence', 'emotion-regulation-checkin',
  'lesson-flow', 'feedback-panel', 'offline-content-fallback', 'asset-reference', 'evidence-capture',
] as const;

export type GenericSampleComponentId = typeof GENERIC_SAMPLE_COMPONENT_IDS[number];
export type GenericSampleInputKind = 'none' | 'text' | 'numeric' | 'choice';

export interface GenericSampleOption {
  id: string;
  label: string;
  description?: string;
}

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
  table?: { columns: string[]; rows: string[][] };
  presentation?: {
    canvas?: { label: string; description?: string };
    model?: { label: string; description?: string };
    map?: { label: string; description?: string };
  };
  events?: Array<{
    type: 'select' | 'input' | 'submit' | 'step';
    targetId?: string;
    label?: string;
  }>;
}
