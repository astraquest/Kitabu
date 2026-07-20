export type LearningObjectKind =
  | 'elephant'
  | 'zebra'
  | 'giraffe'
  | 'lion'
  | 'rhino'
  | 'flamingo'
  | 'gazelle'
  | 'ostrich'
  | 'goat'
  | 'chicken'
  | 'mango'
  | 'banana'
  | 'basket'
  | 'seedling'
  | 'chair'
  | 'cat'
  | 'sun'
  | 'pen'
  | 'hat'
  | 'book'
  | 'table'
  | 'pencil'
  | 'face'
  | 'teeth'
  | 'hand'
  | 'foot'
  | 'hair'
  | 'leaf'
  | 'flower'
  | 'stem'
  | 'roots'
  | 'mystery';

export type LearningCard = {
  id: string;
  label: string;
  detail?: string;
  accent?: 'blue' | 'green' | 'gold' | 'coral' | 'purple' | 'neutral';
  state?: 'normal' | 'selected' | 'muted' | 'warning';
};

export type LearningVisualSpec =
  | {
      kind: 'arithmetic';
      leftOperand: number;
      operator: '+' | '-' | '×' | '÷';
      rightOperand: number;
      caption: string;
    }
  | {
      kind: 'picture_word';
      object: Extract<LearningObjectKind, 'chair' | 'cat' | 'sun' | 'pen' | 'hat' | 'book' | 'table' | 'pencil'>;
      wordPattern: string;
      caption: string;
    }
  | {
      kind: 'picture_choice';
      object: LearningObjectKind;
      caption: string;
    }
  | {
      kind: 'balance';
      left: Array<{
        object: LearningObjectKind;
        count: number;
        label?: string;
      }>;
      right: Array<{
        object: LearningObjectKind;
        count: number;
        label?: string;
      }>;
      balanced: boolean;
      caption: string;
    }
  | {
      kind: 'groups';
      object: LearningObjectKind;
      groups: number;
      each: number | 'x';
      total?: number;
      caption: string;
    }
  | {
      kind: 'market';
      items: Array<{
        object: LearningObjectKind;
        count: number;
        price?: number;
        label: string;
      }>;
      caption: string;
    }
  | {
      kind: 'story';
      objects: Array<{
        object: LearningObjectKind;
        count: number;
        label?: string;
      }>;
      caption: string;
    }
  | {
      kind: 'cards';
      cards: LearningCard[];
      layout: 'row' | 'grid' | 'stack';
      instruction?: string;
      caption: string;
    }
  | {
      kind: 'sequence';
      steps: Array<{ id: string; label: string; detail?: string }>;
      activeIndex?: number;
      caption: string;
    }
  | {
      kind: 'scene';
      setting:
        | 'classroom'
        | 'garden'
        | 'home'
        | 'market'
        | 'community'
        | 'nature'
        | 'studio'
        | 'computer_lab';
      elements: Array<{
        id: string;
        label: string;
        count?: number;
        state?: 'normal' | 'highlighted' | 'muted';
      }>;
      caption: string;
    }
  | {
      kind: 'number_line';
      min: number;
      max: number;
      markers: Array<{ value: number; label?: string }>;
      jump?: { from: number; to: number; label?: string };
      caption: string;
    }
  | {
      kind: 'classify';
      buckets: Array<{ id: string; label: string }>;
      items: LearningCard[];
      caption: string;
    };

export type LearningInteractionItem = {
  id: string;
  label: string;
  detail?: string;
};

export type LearningInteraction =
  | {
      kind: 'sequence_builder';
      instruction: string;
      items: LearningInteractionItem[];
    }
  | {
      kind: 'bucket_sort';
      instruction: string;
      buckets: Array<{ id: string; label: string }>;
      items: LearningInteractionItem[];
    }
  | {
      kind: 'choice_sprint';
      instruction: string;
      items: LearningInteractionItem[];
    };

export type ProgressiveLessonStep = {
  id: string;
  phase: 'guided' | 'checkpoint';
  prompt: string;
  supportText?: string;
  options: string[];
  interaction?: LearningInteraction;
  visual: LearningVisualSpec;
  hint: string;
};

export type ProgressiveLesson = {
  lessonKey: string;
  lessonVersion: number;
  subjectId: string;
  grade: string;
  strand: string;
  subStrand: string;
  title: string;
  shortTitle: string;
  objective: string;
  estimatedMinutes: number;
  steps: ProgressiveLessonStep[];
};

export type LearningPathNode = {
  id: string;
  lessonKey: string;
  lessonVersion: number;
  title: string;
  objective: string;
  estimatedMinutes: number;
  position: number;
  strandTitle?: string;
  status: 'completed' | 'current' | 'locked' | 'needs_practice';
  bestScore: number | null;
  attemptCount: number;
  delivery?: 'progressive';
};

export type SubjectLearningPath = {
  subjectId: string;
  subjectName: string;
  grade: string;
  title: string;
  description: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  delivery: 'progressive';
  nodes: LearningPathNode[];
};

export type ProgressiveStepResult = {
  isCorrect: boolean;
  phase: 'guided' | 'checkpoint';
  misconceptionCode: string | null;
  message: string;
  hint: string;
  attemptNumber: number;
  xpAwarded: number;
};

export type ProgressiveCompletionResult = {
  score: number;
  passed: boolean;
  needsPractice: boolean;
  xpAwarded: number;
  nextNode: LearningPathNode | null;
  pathProgressPercent: number;
};
