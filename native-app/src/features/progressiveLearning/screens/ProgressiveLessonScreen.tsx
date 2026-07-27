import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  RotateCcw,
  Trophy,
  X,
} from 'lucide-react-native';

import { triggerHaptic } from '../../../services/haptics';
import type { OnboardingMascotKey } from '../../../types/app';
import { InteractiveSceneHost } from '../../interactiveLearning/InteractiveSceneHost';
import { adaptComponentScene } from '../../interactiveLearning/sceneAdapter';
import {
  checkProgressiveLessonStep,
  completeProgressiveLesson,
  createProgressiveClientId,
  startProgressiveLesson,
} from '../api/progressiveLearningService';
import type {
  ProgressiveCompletionResult,
  ProgressiveLesson,
  ProgressiveStepResult,
} from '../types';
import { LearningMascotReaction } from '../components/LearningMascotReaction';
import {
  LowerPrimaryQuestionProgress,
  type QuestionOutcome,
} from '../components/LowerPrimaryQuestionProgress';
import { LowerPrimaryChoiceChallengeScene } from '../components/scenes/LowerPrimaryChoiceChallengeScene';
import { PictureChoiceChallengeScene } from '../components/scenes/PictureChoiceChallengeScene';
import { PictureWordChallengeScene } from '../components/scenes/PictureWordChallengeScene';
import { NumberManipulativesScene } from '../components/scenes/NumberManipulativesScene';
import { adaptAuthoredNumberManipulatives } from '../components/scenes/authoredNumberManipulatives';
import {
  LearningInteractionView,
  serializeChoiceResponse,
} from '../components/LearningInteraction';
import { LearningVisual } from '../components/LearningVisual';
import { SquishPressable } from '../components/SquishPressable';
import { StandardAnswerGrid } from '../components/StandardAnswerGrid';
import { SubjectPageHeader } from '../components/SubjectPageHeader';
import { useFeedbackChimes } from '../hooks/useFeedbackChimes';
import { getLearningPresentationMode } from '../model/learningPresentationPolicy';
import {
  getLessonStartErrorPresentation,
  type LessonStartErrorPresentation,
} from '../model/lessonStartErrorPresentation';

interface ProgressiveLessonScreenProps {
  lessonKey: string;
  lessonVersion: number;
  grade: string;
  mascotKey: OnboardingMascotKey;
  subjectName: string;
  onBack: () => void;
  onComplete: () => void;
}

export function ProgressiveLessonScreen({
  lessonKey,
  lessonVersion,
  grade,
  mascotKey,
  subjectName,
  onBack,
  onComplete,
}: ProgressiveLessonScreenProps) {
  const clientAttemptId = useMemo(() => createProgressiveClientId(), []);
  const [lesson, setLesson] = useState<ProgressiveLesson | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [interactionRevision, setInteractionRevision] = useState(0);
  const [feedback, setFeedback] = useState<ProgressiveStepResult | null>(null);
  const [hintStage, setHintStage] = useState<0 | 1 | 2>(0);
  const [isChecking, setIsChecking] = useState(false);
  const [completion, setCompletion] =
    useState<ProgressiveCompletionResult | null>(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [questionOutcomes, setQuestionOutcomes] = useState<QuestionOutcome[]>(
    [],
  );
  const [startError, setStartError] =
    useState<LessonStartErrorPresentation | null>(null);
  const [startRevision, setStartRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const stepStartedAt = useRef(Date.now());
  const submissionInFlightRef = useRef(false);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const continueLessonRef = useRef<() => Promise<void>>(async () => undefined);
  const shake = useRef(new Animated.Value(0)).current;
  const sceneEntrance = useRef(new Animated.Value(1)).current;
  const feedbackEntrance = useRef(new Animated.Value(1)).current;
  const { playFeedbackChime, primeFeedbackChimes } = useFeedbackChimes();

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(
    () => () => {
      shake.stopAnimation();
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    },
    [shake],
  );

  useEffect(() => {
    let active = true;
    setLesson(null);
    setAttemptId(null);
    setStartError(null);
    setError(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setHintStage(0);
    setIsChecking(false);
    setCompletion(null);
    setSessionXp(0);
    setQuestionOutcomes([]);
    submissionInFlightRef.current = false;
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    startProgressiveLesson({ clientAttemptId, lessonKey, lessonVersion, grade })
      .then(result => {
        if (!active) {
          return;
        }
        setLesson(result.lesson);
        setQuestionOutcomes(result.lesson.steps.map(() => 'pending'));
        setAttemptId(result.attemptId);
        const resumeIndex = result.currentStepId
          ? Math.max(
              0,
              result.lesson.steps.findIndex(
                step => step.id === result.currentStepId,
              ),
            )
          : 0;
        setCurrentIndex(resumeIndex);
        stepStartedAt.current = Date.now();
      })
      .catch(loadError => {
        if (active) {
          setStartError(getLessonStartErrorPresentation(loadError));
        }
      });
    return () => {
      active = false;
    };
  }, [clientAttemptId, grade, lessonKey, lessonVersion, startRevision]);

  const step = lesson?.steps[currentIndex] ?? null;
  const numberManipulativesScene = step?.componentScene
    ? adaptAuthoredNumberManipulatives(step.componentScene)
    : null;
  const componentSceneResult =
    step?.componentScene && !numberManipulativesScene
      ? adaptComponentScene(step.componentScene)
      : null;
  const componentScene = componentSceneResult?.ok
    ? componentSceneResult.input
    : null;
  useEffect(() => {
    sceneEntrance.stopAnimation();
    if (reduceMotion) {
      sceneEntrance.setValue(1);
      return;
    }
    sceneEntrance.setValue(0);
    Animated.spring(sceneEntrance, {
      toValue: 1,
      damping: 18,
      stiffness: 170,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
    return () => sceneEntrance.stopAnimation();
  }, [currentIndex, reduceMotion, sceneEntrance]);

  useEffect(() => {
    if (!feedback) {
      return;
    }
    feedbackEntrance.stopAnimation();
    if (reduceMotion) {
      feedbackEntrance.setValue(1);
      return;
    }
    feedbackEntrance.setValue(0);
    Animated.spring(feedbackEntrance, {
      toValue: 1,
      damping: 17,
      stiffness: 220,
      mass: 0.75,
      useNativeDriver: true,
    }).start();
    return () => feedbackEntrance.stopAnimation();
  }, [feedback, feedbackEntrance, reduceMotion]);

  const mascotMessage = completion
    ? completion.passed
      ? 'You worked that idea out beautifully!'
      : 'Good effort. One more practice run will make this stick.'
    : feedback?.message;
  const usesAnswerGrid = step
    ? step.options.length === 4 &&
      step.options.every(option => option.length <= 22)
    : false;
  const usesLowerPrimaryExperience =
    getLearningPresentationMode(grade) === 'lower_primary';
  const standardAnswerChoices =
    !usesLowerPrimaryExperience && step
      ? step.interaction?.kind === 'choice_sprint'
        ? step.interaction.items.map(item => ({
            label: item.label,
            value: serializeChoiceResponse(item.id),
          }))
        : step.interaction
        ? []
        : step.options.map(option => ({ label: option, value: option }))
      : [];
  const usesStandardAnswerGrid =
    !componentScene &&
    !numberManipulativesScene &&
    standardAnswerChoices.length > 0;
  const usesArithmeticChallenge =
    !componentScene &&
    !numberManipulativesScene &&
    step?.visual.kind === 'arithmetic';
  const lowerPrimaryChoices = step
    ? step.options.length > 0
      ? step.options.map(option => ({ label: option, value: option }))
      : step.interaction?.kind === 'choice_sprint'
      ? step.interaction.items.map(item => ({
          label: item.label,
          value: serializeChoiceResponse(item.id),
        }))
      : []
    : [];
  const usesLowerPrimaryChoiceChallenge = Boolean(
    usesLowerPrimaryExperience &&
      !usesArithmeticChallenge &&
      !numberManipulativesScene &&
      step?.visual.kind !== 'picture_word' &&
      step?.visual.kind !== 'picture_choice' &&
      lowerPrimaryChoices.length > 0,
  );
  const usesPictureWordChallenge = Boolean(
    usesLowerPrimaryExperience &&
      !numberManipulativesScene &&
      step?.visual.kind === 'picture_word' &&
      lowerPrimaryChoices.length > 0,
  );
  const usesPictureChoiceChallenge = Boolean(
    usesLowerPrimaryExperience &&
      !numberManipulativesScene &&
      step?.visual.kind === 'picture_choice' &&
      lowerPrimaryChoices.length > 0,
  );
  const usesAutoGradedChallenge =
    usesArithmeticChallenge ||
    usesPictureWordChallenge ||
    usesPictureChoiceChallenge ||
    usesLowerPrimaryChoiceChallenge ||
    Boolean(numberManipulativesScene);
  const visualRepeatsAnswers = Boolean(
    usesStandardAnswerGrid &&
      step &&
      (step.visual.kind === 'cards'
        ? step.visual.cards.length === standardAnswerChoices.length &&
          step.visual.cards.every(card =>
            standardAnswerChoices.some(choice => choice.label === card.label),
          )
        : step.visual.kind === 'classify'
        ? step.visual.items.length === standardAnswerChoices.length &&
          step.visual.items.every(item =>
            standardAnswerChoices.some(choice => choice.label === item.label),
          )
        : false),
  );
  const hidesDuplicatedVisual = Boolean(
    !usesLowerPrimaryExperience && (step?.interaction || visualRepeatsAnswers),
  );
  const usefulSupportText =
    !usesAutoGradedChallenge &&
    step?.supportText?.trim() &&
    step.supportText.trim() !== lesson?.objective.trim()
      ? step.supportText.trim()
      : null;
  const sceneTranslateY = sceneEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });
  const feedbackTranslateY = feedbackEntrance.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const repairText = step
    ? hintStage === 1
      ? feedback?.hint || step.hint
      : step.supportText || step.visual.caption
    : '';

  async function submitAnswer(responseOverride?: string) {
    const response = responseOverride ?? selectedAnswer;
    if (
      !attemptId ||
      !step ||
      !response ||
      submissionInFlightRef.current ||
      feedback?.isCorrect
    ) {
      return;
    }
    submissionInFlightRef.current = true;
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkProgressiveLessonStep({
        attemptId,
        stepId: step.id,
        response,
        responseLatencyMs: Math.min(
          Date.now() - stepStartedAt.current,
          30 * 60 * 1000,
        ),
      });
      setQuestionOutcomes(current =>
        current.map((outcome, index) =>
          index === currentIndex && outcome === 'pending'
            ? result.isCorrect
              ? 'correct'
              : 'incorrect'
            : outcome,
        ),
      );
      setFeedback(result);
      setSessionXp(value => value + result.xpAwarded);
      if (result.isCorrect) {
        setHintStage(0);
        triggerHaptic('success');
        playFeedbackChime('correct');
        AccessibilityInfo.announceForAccessibility(
          usesAutoGradedChallenge
            ? `Correct. ${result.message} Moving on in 2 seconds.`
            : `Correct. ${result.message}`,
        );
      } else {
        if (result.attemptNumber >= 3) {
          setHintStage(2);
        } else if (result.attemptNumber >= 2) {
          setHintStage(stage => Math.max(stage, 1) as 0 | 1 | 2);
        }
        triggerHaptic('warning');
        playFeedbackChime('error');
        AccessibilityInfo.announceForAccessibility(
          `Not yet. ${result.message}`,
        );
        if (!reduceMotion) {
          shake.stopAnimation();
          shake.setValue(0);
          Animated.sequence([
            Animated.timing(shake, {
              toValue: -5,
              duration: 65,
              useNativeDriver: true,
            }),
            Animated.timing(shake, {
              toValue: 5,
              duration: 75,
              useNativeDriver: true,
            }),
            Animated.timing(shake, {
              toValue: -3,
              duration: 65,
              useNativeDriver: true,
            }),
            Animated.spring(shake, {
              toValue: 0,
              damping: 15,
              stiffness: 230,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    } catch (submitError) {
      triggerHaptic('error');
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to check that answer.',
      );
    } finally {
      submissionInFlightRef.current = false;
      setIsChecking(false);
    }
  }

  async function continueLesson() {
    if (!lesson || !step || !feedback?.isCorrect || !attemptId) {
      return;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (currentIndex < lesson.steps.length - 1) {
      setCurrentIndex(index => index + 1);
      setSelectedAnswer(null);
      setInteractionRevision(0);
      setFeedback(null);
      setHintStage(0);
      stepStartedAt.current = Date.now();
      return;
    }

    setIsChecking(true);
    setError(null);
    try {
      const result = await completeProgressiveLesson(attemptId);
      setCompletion(result);
      setSessionXp(value => value + result.xpAwarded);
      triggerHaptic(result.passed ? 'success' : 'warning');
      playFeedbackChime('completion');
    } catch (completeError) {
      triggerHaptic('error');
      setError(
        completeError instanceof Error
          ? completeError.message
          : 'Unable to finish the lesson.',
      );
    } finally {
      setIsChecking(false);
    }
  }

  continueLessonRef.current = continueLesson;

  useEffect(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (!usesAutoGradedChallenge || !feedback?.isCorrect || completion) {
      return undefined;
    }

    autoAdvanceTimerRef.current = setTimeout(() => {
      autoAdvanceTimerRef.current = null;
      continueLessonRef.current().catch(() => undefined);
    }, 2_000);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [completion, feedback?.isCorrect, step?.id, usesAutoGradedChallenge]);

  function retryStep() {
    setSelectedAnswer(null);
    setInteractionRevision(revision => revision + 1);
    setFeedback(null);
    stepStartedAt.current = Date.now();
  }

  if (!lesson && !startError) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color="#4F7CE8" size="large" />
        <Text style={styles.centeredTitle}>Preparing your adventure…</Text>
        <Text style={styles.centeredText}>
          Loading the lesson and your saved progress.
        </Text>
      </View>
    );
  }

  if (!lesson || !step) {
    const presentation =
      startError ??
      getLessonStartErrorPresentation(
        new Error('The lesson did not include a playable activity.'),
      );
    return (
      <View style={styles.centeredState}>
        <LearningMascotReaction
          mascotKey={mascotKey}
          reaction="encourage"
          size={112}
        />
        <Text accessibilityRole="header" style={styles.centeredTitle}>
          {presentation.title}
        </Text>
        <Text accessibilityRole="alert" style={styles.centeredText}>
          {presentation.message}
        </Text>
        <SquishPressable
          accessibilityLabel={presentation.primaryLabel}
          onPress={
            presentation.primaryAction === 'retry'
              ? () => setStartRevision(revision => revision + 1)
              : onBack
          }
          reduceMotion={reduceMotion}
          containerStyle={styles.centeredButtonWrap}
        >
          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>
              {presentation.primaryLabel}
            </Text>
          </View>
        </SquishPressable>
        {presentation.showBackAction ? (
          <Pressable
            accessibilityLabel="Back to learning path"
            accessibilityRole="button"
            onPress={onBack}
            style={styles.centeredSecondaryButton}
          >
            <Text style={styles.centeredSecondaryButtonText}>
              Back to learning path
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (completion) {
    return (
      <ScrollView contentContainerStyle={styles.completionScreen}>
        <SquishPressable
          accessibilityLabel="Back to learning path"
          containerStyle={styles.completionBackButton}
          hitSlop={10}
          onPress={onComplete}
          reduceMotion={reduceMotion}
        >
          <ArrowLeft color="#0B1F4D" size={25} strokeWidth={2.4} />
        </SquishPressable>
        <View style={styles.completionSparkles}>
          <Text style={styles.sparkleText}>✦</Text>
          <Text style={styles.sparkleText}>•</Text>
          <Text style={styles.sparkleText}>✦</Text>
        </View>
        <LearningMascotReaction
          mascotKey={mascotKey}
          reaction="complete"
          message={mascotMessage}
          size={150}
        />
        <Trophy
          color={completion.passed ? '#22C55E' : '#F97316'}
          size={44}
          strokeWidth={2.2}
        />
        {completion.passed ? (
          <>
            <Text style={styles.completionTitle}>Lesson complete!</Text>
            <Text style={styles.completionSubtitle}>
              {completion.nextNode
                ? `Next up: ${completion.nextNode.title}`
                : 'You finished this chapter. Your next adventure is ready.'}
            </Text>
          </>
        ) : null}
        <View style={styles.resultRow}>
          <View style={styles.resultCard}>
            <Text style={styles.resultValue}>{completion.score}%</Text>
            <Text style={styles.resultLabel}>checkpoint</Text>
          </View>
          <View style={[styles.resultCard, styles.xpResultCard]}>
            <Text
              accessibilityLabel={`${sessionXp} XP earned`}
              style={[styles.resultValue, styles.xpValue]}
            >
              +{sessionXp}
            </Text>
            <Text style={styles.resultLabel}>XP earned</Text>
          </View>
        </View>
        <SquishPressable
          onPress={onComplete}
          reduceMotion={reduceMotion}
          containerStyle={styles.completionButtonWrap}
        >
          <View
            style={[
              styles.primaryButton,
              !completion.passed && styles.practicePrimaryButton,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {completion.passed ? 'Continue learning' : 'Return to path'}
            </Text>
            <ChevronRight color="#FFFFFF" size={19} />
          </View>
        </SquishPressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <SubjectPageHeader
        backAccessibilityLabel="Back to subject details"
        grade={grade}
        onBack={onBack}
        subjectName={subjectName}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!usesAutoGradedChallenge ? (
          <>
            <Text style={styles.prompt}>{step.prompt}</Text>
            {usefulSupportText ? (
              <Text style={styles.supportText}>{usefulSupportText}</Text>
            ) : null}
          </>
        ) : null}
        {hidesDuplicatedVisual ? null : (
          <Animated.View
            style={[
              styles.sceneStage,
              {
                opacity: sceneEntrance,
                transform: [{ translateY: sceneTranslateY }],
              },
            ]}
          >
            {numberManipulativesScene ? (
              <NumberManipulativesScene
                disabled={Boolean(feedback?.isCorrect) || isChecking}
                feedbackMessage={
                  numberManipulativesScene.feedback ?? step.supportText
                }
                initialValue={numberManipulativesScene.initialValue}
                max={numberManipulativesScene.max}
                min={numberManipulativesScene.min}
                mode={numberManipulativesScene.mode}
                onSubmit={answer => {
                  if (submissionInFlightRef.current || feedback?.isCorrect)
                    return;
                  setSelectedAnswer(answer);
                  setFeedback(null);
                  triggerHaptic('selection');
                  primeFeedbackChimes();
                  submitAnswer(answer).catch(() => undefined);
                }}
                prompt={step.prompt}
                retryHint={numberManipulativesScene.retryHint ?? step.hint}
                status={
                  isChecking
                    ? 'checking'
                    : feedback
                    ? feedback.isCorrect
                      ? 'correct'
                      : 'incorrect'
                    : 'idle'
                }
                unitLabel={numberManipulativesScene.unitLabel}
              />
            ) : componentScene ? (
              <InteractiveSceneHost
                disabled={Boolean(feedback) || isChecking}
                key={`${step.id}-${interactionRevision}`}
                onResponseChange={value => {
                  setSelectedAnswer(value);
                  setFeedback(null);
                }}
                scene={componentScene}
                snapshotKey={attemptId ? `${attemptId}:${step.id}` : undefined}
              />
            ) : usesPictureChoiceChallenge &&
              step.visual.kind === 'picture_choice' ? (
              <PictureChoiceChallengeScene
                choices={lowerPrimaryChoices}
                disabled={Boolean(feedback?.isCorrect) || isChecking}
                feedbackMessage={step.supportText}
                mascotKey={mascotKey}
                onSelect={answer => {
                  if (submissionInFlightRef.current || feedback?.isCorrect) {
                    return;
                  }
                  setSelectedAnswer(answer);
                  setFeedback(null);
                  triggerHaptic('selection');
                  primeFeedbackChimes();
                  submitAnswer(answer).catch(() => undefined);
                }}
                prompt={step.prompt}
                reduceMotion={reduceMotion}
                retryHint={step.hint}
                selectedAnswer={selectedAnswer}
                spec={step.visual}
                status={
                  isChecking
                    ? 'checking'
                    : feedback
                    ? feedback.isCorrect
                      ? 'correct'
                      : 'incorrect'
                    : 'idle'
                }
              />
            ) : usesPictureWordChallenge &&
              step.visual.kind === 'picture_word' ? (
              <PictureWordChallengeScene
                choices={lowerPrimaryChoices}
                disabled={Boolean(feedback?.isCorrect) || isChecking}
                language={subjectName === 'Kiswahili' ? 'sw' : 'en'}
                mascotKey={mascotKey}
                onSelect={answer => {
                  if (submissionInFlightRef.current || feedback?.isCorrect) {
                    return;
                  }
                  setSelectedAnswer(answer);
                  setFeedback(null);
                  triggerHaptic('selection');
                  primeFeedbackChimes();
                  submitAnswer(answer).catch(() => undefined);
                }}
                reduceMotion={reduceMotion}
                selectedAnswer={selectedAnswer}
                spec={step.visual}
                status={
                  isChecking
                    ? 'checking'
                    : feedback
                    ? feedback.isCorrect
                      ? 'correct'
                      : 'incorrect'
                    : 'idle'
                }
              />
            ) : usesLowerPrimaryChoiceChallenge ? (
              <LowerPrimaryChoiceChallengeScene
                choices={lowerPrimaryChoices}
                disabled={Boolean(feedback?.isCorrect) || isChecking}
                language={subjectName === 'Kiswahili' ? 'sw' : 'en'}
                mascotKey={mascotKey}
                onSelect={answer => {
                  if (submissionInFlightRef.current || feedback?.isCorrect) {
                    return;
                  }
                  setSelectedAnswer(answer);
                  setFeedback(null);
                  triggerHaptic('selection');
                  primeFeedbackChimes();
                  submitAnswer(answer).catch(() => undefined);
                }}
                prompt={step.prompt}
                reduceMotion={reduceMotion}
                selectedAnswer={selectedAnswer}
                status={
                  isChecking
                    ? 'checking'
                    : feedback
                    ? feedback.isCorrect
                      ? 'correct'
                      : 'incorrect'
                    : 'idle'
                }
              />
            ) : (
              <LearningVisual
                arithmeticChallenge={
                  usesArithmeticChallenge
                    ? {
                        disabled: Boolean(feedback?.isCorrect) || isChecking,
                        mascotKey,
                        onSelect: answer => {
                          if (
                            submissionInFlightRef.current ||
                            feedback?.isCorrect
                          ) {
                            return;
                          }
                          setSelectedAnswer(answer);
                          setFeedback(null);
                          triggerHaptic('selection');
                          primeFeedbackChimes();
                          submitAnswer(answer).catch(() => undefined);
                        },
                        options: step.options,
                        questionIndex: currentIndex,
                        reduceMotion,
                        selectedAnswer,
                        status: isChecking
                          ? 'checking'
                          : feedback
                          ? feedback.isCorrect
                            ? 'correct'
                            : 'incorrect'
                          : 'idle',
                        totalQuestions: lesson.steps.length,
                      }
                    : undefined
                }
                spec={step.visual}
              />
            )}
          </Animated.View>
        )}

        {usesStandardAnswerGrid ? (
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <StandardAnswerGrid
              choices={standardAnswerChoices}
              disabled={Boolean(feedback?.isCorrect) || isChecking}
              isCorrect={feedback ? feedback.isCorrect : undefined}
              onSelect={answer => {
                setSelectedAnswer(answer);
                setFeedback(null);
                triggerHaptic('selection');
              }}
              reduceMotion={reduceMotion}
              selectedValue={selectedAnswer}
            />
          </Animated.View>
        ) : null}

        {usesAutoGradedChallenge ? (
          <LowerPrimaryQuestionProgress
            outcomes={questionOutcomes}
            reduceMotion={reduceMotion}
          />
        ) : null}

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          {usesStandardAnswerGrid ||
          usesAutoGradedChallenge ||
          componentScene ||
          numberManipulativesScene ? null : step.interaction ? (
            <LearningInteractionView
              disabled={Boolean(feedback) || isChecking}
              interaction={step.interaction}
              key={`${step.id}-${interactionRevision}`}
              onResponseChange={setSelectedAnswer}
              reduceMotion={reduceMotion}
            />
          ) : (
            <View
              accessibilityLabel="Answer choices"
              accessibilityRole="radiogroup"
              style={[styles.optionsWrap, usesAnswerGrid && styles.optionsGrid]}
            >
              {step.options.map(option => {
                const selected = selectedAnswer === option;
                const selectedCorrect = selected && feedback?.isCorrect;
                const selectedIncorrect =
                  selected && feedback && !feedback.isCorrect;
                return (
                  <SquishPressable
                    key={option}
                    accessibilityLabel={option}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selected,
                      disabled: Boolean(feedback?.isCorrect),
                    }}
                    disabled={Boolean(feedback?.isCorrect) || isChecking}
                    containerStyle={
                      usesAnswerGrid ? styles.optionGridItem : undefined
                    }
                    reduceMotion={reduceMotion}
                    onPress={() => {
                      setSelectedAnswer(option);
                      setFeedback(null);
                      triggerHaptic('selection');
                    }}
                  >
                    <View
                      style={[
                        styles.optionCard,
                        selected && styles.optionSelected,
                        selectedCorrect && styles.optionCorrect,
                        selectedIncorrect && styles.optionIncorrect,
                      ]}
                    >
                      <View
                        style={[
                          styles.optionIndicator,
                          selected && styles.optionIndicatorSelected,
                          selectedCorrect && styles.optionIndicatorCorrect,
                          selectedIncorrect && styles.optionIndicatorIncorrect,
                        ]}
                      >
                        {selectedCorrect ? (
                          <Check color="#FFFFFF" size={16} strokeWidth={3} />
                        ) : null}
                        {selectedIncorrect ? (
                          <X color="#FFFFFF" size={16} strokeWidth={3} />
                        ) : null}
                        {selected && !feedback ? (
                          <View style={styles.optionIndicatorDot} />
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          selected && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </View>
                  </SquishPressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {feedback && !usesAutoGradedChallenge ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.feedbackCard,
              feedback.isCorrect
                ? styles.feedbackCorrect
                : styles.feedbackIncorrect,
              {
                opacity: feedbackEntrance,
                transform: [{ translateY: feedbackTranslateY }],
              },
            ]}
          >
            <LearningMascotReaction
              mascotKey={mascotKey}
              reaction={feedback.isCorrect ? 'correct' : 'encourage'}
              message={feedback.message}
              size={68}
            />
            {hintStage > 0 && !feedback.isCorrect ? (
              <View
                accessibilityLabel={`Clue ${hintStage} of 2: ${repairText}`}
                style={styles.hintCard}
              >
                <CircleHelp color="#4F7CE8" size={18} />
                <View style={styles.hintTextWrap}>
                  <Text style={styles.hintEyebrow}>CLUE {hintStage} OF 2</Text>
                  <Text style={styles.hintText}>{repairText}</Text>
                </View>
              </View>
            ) : null}
            {!feedback.isCorrect ? (
              <View style={styles.feedbackActions}>
                {hintStage < 2 ? (
                  <Pressable
                    accessibilityLabel={
                      hintStage === 0 ? 'Show first clue' : 'Show another clue'
                    }
                    accessibilityRole="button"
                    onPress={() => setHintStage(stage => (stage === 0 ? 1 : 2))}
                    style={styles.helpButton}
                  >
                    <CircleHelp color="#4F7CE8" size={17} />
                    <Text style={styles.helpButtonText}>
                      {hintStage === 0 ? 'Show a clue' : 'Another clue'}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityLabel="Try answer again with clue"
                  accessibilityRole="button"
                  onPress={retryStep}
                  style={styles.retryStepButton}
                >
                  <RotateCcw color="#475569" size={16} />
                  <Text style={styles.retryStepText}>Try with the clue</Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {!usesAutoGradedChallenge && !feedback && hintStage > 0 ? (
          <View
            accessibilityLabel={`Keep this clue in mind: ${repairText}`}
            accessibilityLiveRegion="polite"
            style={styles.repairStrip}
          >
            <CircleHelp color="#2563EB" size={18} />
            <View style={styles.hintTextWrap}>
              <Text style={styles.hintEyebrow}>KEEP THIS CLUE IN MIND</Text>
              <Text style={styles.hintText}>{repairText}</Text>
            </View>
          </View>
        ) : null}

        {error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {usesAutoGradedChallenge ? null : (
        <View style={styles.bottomBar}>
          <SquishPressable
            accessibilityLabel={
              feedback?.isCorrect ? 'Continue lesson' : 'Check answer'
            }
            disabled={
              !selectedAnswer ||
              isChecking ||
              Boolean(feedback && !feedback.isCorrect)
            }
            reduceMotion={reduceMotion}
            onPress={() => {
              if (feedback?.isCorrect) {
                continueLesson().catch(() => undefined);
              } else {
                submitAnswer().catch(() => undefined);
              }
            }}
          >
            <View
              style={[
                styles.primaryButton,
                (!selectedAnswer ||
                  isChecking ||
                  Boolean(feedback && !feedback.isCorrect)) &&
                  styles.primaryButtonDisabled,
              ]}
            >
              {isChecking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {feedback?.isCorrect ? 'Continue' : 'Check'}
                  </Text>
                  {feedback?.isCorrect ? (
                    <ChevronRight color="#FFFFFF" size={19} />
                  ) : (
                    <CheckCircle2 color="#FFFFFF" size={18} />
                  )}
                </>
              )}
            </View>
          </SquishPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  centeredButtonWrap: { marginTop: 16, width: '100%' },
  centeredSecondaryButton: { marginTop: 16, padding: 10 },
  centeredSecondaryButtonText: {
    color: '#315BB6',
    fontSize: 15,
    fontWeight: '800',
  },
  centeredState: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    flex: 1,
    justifyContent: 'center',
    padding: 26,
  },
  centeredText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: 'center',
  },
  centeredTitle: {
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  completionBackButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    left: 18,
    position: 'absolute',
    top: 18,
    width: 44,
    zIndex: 2,
  },
  completionButtonWrap: { marginTop: 8, width: '100%' },
  completionScreen: {
    alignItems: 'center',
    backgroundColor: '#FFFBF5',
    flexGrow: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  completionSparkles: { flexDirection: 'row', gap: 28 },
  completionSubtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 330,
    textAlign: 'center',
  },
  completionTitle: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
  },
  content: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  errorText: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    padding: 12,
  },
  feedbackActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  feedbackCard: { borderRadius: 20, borderWidth: 1, padding: 13 },
  feedbackCorrect: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  feedbackIncorrect: { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' },
  helpButton: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 46,
  },
  helpButtonText: { color: '#1D4ED8', fontSize: 13, fontWeight: '900' },
  hintCard: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 9,
    marginTop: 10,
    padding: 11,
  },
  hintEyebrow: {
    color: '#2563EB',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  hintText: {
    color: '#1E3A8A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  hintTextWrap: { flex: 1 },
  optionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0E8',
    borderRadius: 17,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 11,
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  optionCorrect: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
  optionGridItem: { width: '48.5%' },
  optionIncorrect: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  optionIndicator: {
    alignItems: 'center',
    backgroundColor: '#CBD5E1',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  optionIndicatorCorrect: { backgroundColor: '#22C55E' },
  optionIndicatorDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  optionIndicatorIncorrect: { backgroundColor: '#EF4444' },
  optionIndicatorSelected: { backgroundColor: '#4F7CE8' },
  optionSelected: { backgroundColor: '#EFF6FF', borderColor: '#4F7CE8' },
  optionText: { color: '#1E293B', flex: 1, fontSize: 15, fontWeight: '800' },
  optionTextSelected: { color: '#1E3A8A' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  optionsWrap: { gap: 10 },
  practicePrimaryButton: { backgroundColor: '#F97316' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#4F7CE8',
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: { backgroundColor: '#CBD5E1' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  prompt: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
    textAlign: 'center',
  },
  repairStrip: {
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE7E5',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 16,
  },
  resultLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  resultRow: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  resultValue: { color: '#0F766E', fontSize: 25, fontWeight: '900' },
  retryStepButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 46,
  },
  retryStepText: { color: '#475569', fontSize: 13, fontWeight: '900' },
  sceneStage: { gap: 7 },
  screen: { backgroundColor: '#F9FAFB', flex: 1 },
  sparkleText: { color: '#F59E0B', fontSize: 24 },
  supportText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  xpResultCard: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  xpValue: { color: '#EA580C' },
});
