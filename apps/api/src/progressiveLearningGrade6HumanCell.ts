import type { ProgressiveLessonSeed } from './progressiveLearning.js';
import { buildGenericSampleScene } from './interactiveLearning/genericSampleScene.js';

const MODEL_URL = 'https://dkudchritxmpummaeoq.supabase.co/storage/v1/object/public/educational-3d/3D%20files/v1/human-cell-1-4b4d7dd88c72.glb';

const MARKERS = [
  { id: 'membrane', label: 'Cell membrane', position: [0.28, 0.30, 0] as [number, number, number] },
  { id: 'cytoplasm', label: 'Cytoplasm', position: [0.15, 0.30, 0.14] as [number, number, number] },
  { id: 'nucleus', label: 'Nucleus', position: [0, 0.30, -0.04] as [number, number, number] },
  { id: 'mitochondrion', label: 'Mitochondrion', position: [-0.16, 0.25, 0.13] as [number, number, number] },
  { id: 'golgi', label: 'Golgi apparatus', position: [0.14, 0.40, -0.10] as [number, number, number] },
] as const;

const questions = [
  {
    prompt: 'Which part forms the thin outer boundary of the human cell?',
    options: ['Cell membrane', 'Cytoplasm', 'Nucleus', 'Golgi apparatus'] as [string, string, string, string],
    answer: 'Cell membrane',
    hint: 'Marker 1 points to the outside edge of the cell.',
    misconception: 'An internal region is mistaken for the cell boundary.',
    success: 'The cell membrane forms the boundary that surrounds the cell.',
  },
  {
    prompt: 'Which part is the jelly-like material filling much of the cell around its organelles?',
    options: ['Cytoplasm', 'Cell membrane', 'Nucleus', 'Mitochondrion'] as [string, string, string, string],
    answer: 'Cytoplasm',
    hint: 'Marker 2 points to the material around the internal structures.',
    misconception: 'The outer boundary is confused with the material inside it.',
    success: 'Cytoplasm holds organelles and is where many cell activities take place.',
  },
  {
    prompt: "Which labelled part contains most of the cell's genetic material and helps control its activities?",
    options: ['Nucleus', 'Cytoplasm', 'Cell membrane', 'Golgi apparatus'] as [string, string, string, string],
    answer: 'Nucleus',
    hint: 'Marker 3 is the large central control structure.',
    misconception: 'A structure that transports materials is mistaken for the control centre.',
    success: 'The nucleus contains most genetic material and helps coordinate cell activities.',
  },
  {
    prompt: 'Which organelle releases energy from food for cell activities?',
    options: ['Mitochondrion', 'Nucleus', 'Cell membrane', 'Cytoplasm'] as [string, string, string, string],
    answer: 'Mitochondrion',
    hint: "Marker 4 points to the organelle often called the cell's energy releaser.",
    misconception: 'The control centre is confused with the energy-releasing organelle.',
    success: 'Mitochondria release usable energy from food during cellular respiration.',
  },
  {
    prompt: 'Which organelle modifies, sorts, and packages materials made in the cell?',
    options: ['Golgi apparatus', 'Cytoplasm', 'Mitochondrion', 'Cell membrane'] as [string, string, string, string],
    answer: 'Golgi apparatus',
    hint: 'Marker 5 identifies the folded stack that handles cell materials.',
    misconception: 'Energy release is confused with sorting and packaging.',
    success: 'The Golgi apparatus modifies, sorts, and packages cell materials.',
  },
] as const;

export const humanCellLessonSeeds: ProgressiveLessonSeed[] = [{
  key: 'science-g6-human-cell',
  subjectId: 'science',
  subjectName: 'Science & Technology',
  grade: 'Grade 6',
  strand: 'Science - Core Concepts',
  subStrand: 'Foundations',
  curriculumTopicCode: '1.1',
  title: 'Human Cell Marker Mission',
  shortTitle: 'Human Cell Markers',
  objective: 'Use a labelled 3D human-cell model to identify five common cell parts and connect each part with its name.',
  minutes: 10,
  steps: questions.map((question, index) => ({
    phase: index < 2 ? 'guided' as const : 'checkpoint' as const,
    prompt: question.prompt,
    options: question.options,
    visual: {
      kind: 'scene' as const,
      setting: 'computer_lab' as const,
      elements: MARKERS.map(marker => ({
        id: marker.id,
        label: `${index + 1}. ${marker.label}`,
        state: marker.id === MARKERS[index].id ? 'highlighted' as const : 'normal' as const,
      })),
      caption: 'Rotate the model and inspect all five numbered markers.',
    },
    componentScene: buildGenericSampleScene({
      sceneId: `ken-cbc-grade6.science.human-cell.labelled-mcq-${index + 1}`,
      componentId: 'labelled-cell-3d',
      prompt: question.prompt,
      props: {
        title: 'Human cell: label and choose',
        instructions: 'Rotate the model, find the numbered marker, then choose its name.',
        body: 'This local preview uses a public GLB asset. The asset is still review/unverified.',
        options: question.options.map(option => ({ id: option, label: option })),
        inputKind: 'choice',
        modelUrl: MODEL_URL,
        modelFallback: 'Read the numbered marker list and use the accessible answer choices below.',
        markers: [...MARKERS],
        activeMarker: MARKERS[index].id,
        presentation: {
          model: { label: 'Interactive human-cell model', description: 'Rotate the model and inspect five numbered markers.' },
        },
      },
    }),
    hint: question.hint,
    answer: question.answer,
    misconception: question.misconception,
    incorrectMessage: `Try a different path. ${question.hint}`,
    successMessage: question.success,
  })),
}];

export const HUMAN_CELL_MODEL_URL = MODEL_URL;
export const HUMAN_CELL_MARKERS = MARKERS;
