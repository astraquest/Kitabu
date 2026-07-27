import {
  LessonStartError,
  normalizeLessonStartError,
  type LessonStartErrorCode,
} from '../api/progressiveLearningService';

export interface LessonStartErrorPresentation {
  code: LessonStartErrorCode;
  title: string;
  message: string;
  primaryAction: 'back' | 'retry';
  primaryLabel: string;
  showBackAction: boolean;
}

const PRESENTATIONS: Record<
  LessonStartErrorCode,
  Omit<LessonStartErrorPresentation, 'code' | 'message'>
> = {
  AUTH_REQUIRED: {
    title: 'Let’s sign in again',
    primaryAction: 'back',
    primaryLabel: 'Back to learning path',
    showBackAction: false,
  },
  LESSON_NOT_FOUND: {
    title: 'This lesson has moved',
    primaryAction: 'back',
    primaryLabel: 'Refresh learning path',
    showBackAction: false,
  },
  LESSON_VERSION_STALE: {
    title: 'A lesson update is ready',
    primaryAction: 'back',
    primaryLabel: 'Refresh learning path',
    showBackAction: false,
  },
  MISSION_NOT_PUBLISHED: {
    title: 'This lesson is coming soon',
    primaryAction: 'back',
    primaryLabel: 'Choose another lesson',
    showBackAction: false,
  },
  NETWORK_UNAVAILABLE: {
    title: 'We’re having trouble connecting',
    primaryAction: 'retry',
    primaryLabel: 'Try again',
    showBackAction: true,
  },
  PREREQUISITE_LOCKED: {
    title: 'This lesson is still locked',
    primaryAction: 'back',
    primaryLabel: 'Back to learning path',
    showBackAction: false,
  },
  SERVICE_UNAVAILABLE: {
    title: 'Kitabu needs another moment',
    primaryAction: 'retry',
    primaryLabel: 'Try again',
    showBackAction: true,
  },
  UNKNOWN: {
    title: 'We could not open this lesson',
    primaryAction: 'retry',
    primaryLabel: 'Try again',
    showBackAction: true,
  },
};

export function getLessonStartErrorPresentation(
  error: unknown,
): LessonStartErrorPresentation {
  const lessonError =
    error instanceof LessonStartError
      ? error
      : normalizeLessonStartError(error);
  return {
    code: lessonError.code,
    message: lessonError.message,
    ...PRESENTATIONS[lessonError.code],
  };
}
