import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
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
  Sparkles,
  Trophy,
  X,
} from 'lucide-react-native';

import { triggerHaptic } from '../../../services/haptics';
import type { OnboardingMascotKey } from '../../../types/app';
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
import { LearningInteractionView } from '../components/LearningInteraction';
import { LearningVisual } from '../components/LearningVisual';
import { SquishPressable } from '../components/SquishPressable';

interface ProgressiveLessonScreenProps {
  lessonKey: string;
  lessonVersion: number;
  grade: string;
  mascotKey: OnboardingMascotKey;
  onBack: () => void;
  onComplete: () => void;
}

export function ProgressiveLessonScreen({
  lessonKey,
  lessonVersion,
  grade,
  mascotKey,
  onBack,
  onComplete,
}: ProgressiveLessonScreenProps) {
  const clientAttemptId = useRef(createProgressiveClientId()).current;
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
  const [error, setError] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const stepStartedAt = useRef(Date.now());
  const progress = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(1)).current;
  const sceneEntrance = useRef(new Animated.Value(1)).current;
  const feedbackEntrance = useRef(new Animated.Value(1)).current;

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
      xpScale.stopAnimation();
    },
    [shake, xpScale],
  );

  useEffect(() => {
    let active = true;
    setError(null);
    startProgressiveLesson({ clientAttemptId, lessonKey, lessonVersion, grade })
      .then(result => {
        if (!active) {
          return;
        }
        setLesson(result.lesson);
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
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to start this lesson.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [clientAttemptId, grade, lessonKey, lessonVersion]);

  const step = lesson?.steps[currentIndex] ?? null;
  const progressPercent = lesson
    ? ((currentIndex + (feedback?.isCorrect ? 1 : 0)) / lesson.steps.length) *
      100
    : 0;

  useEffect(() => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: progressPercent,
      duration: reduceMotion ? 0 : 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.stopAnimation();
  }, [progress, progressPercent, reduceMotion]);

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

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const mascotMessage = completion
    ? completion.passed
      ? 'You worked that idea out beautifully!'
      : 'Good effort. One more practice run will make this stick.'
    : feedback?.message;
  const usesAnswerGrid = step
    ? step.options.length === 4 &&
      step.options.every(option => option.length <= 22)
    : false;
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

  async function submitAnswer() {
    if (
      !attemptId ||
      !step ||
      !selectedAnswer ||
      isChecking ||
      feedback?.isCorrect
    ) {
      return;
    }
    setIsChecking(true);
    setError(null);
    try {
      const result = await checkProgressiveLessonStep({
        attemptId,
        stepId: step.id,
        response: selectedAnswer,
        responseLatencyMs: Math.min(
          Date.now() - stepStartedAt.current,
          30 * 60 * 1000,
        ),
      });
      setFeedback(result);
      setSessionXp(value => value + result.xpAwarded);
      if (result.isCorrect) {
        setHintStage(0);
        triggerHaptic('success');
        AccessibilityInfo.announceForAccessibility(
          `Correct. ${result.message}`,
        );
        if (result.xpAwarded > 0 && !reduceMotion) {
          xpScale.setValue(1.22);
          Animated.spring(xpScale, {
            toValue: 1,
            damping: 12,
            stiffness: 230,
            useNativeDriver: true,
          }).start();
        }
      } else {
        if (result.attemptNumber >= 3) {
          setHintStage(2);
        } else if (result.attemptNumber >= 2) {
          setHintStage(stage => Math.max(stage, 1) as 0 | 1 | 2);
        }
        triggerHaptic('warning');
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
      setIsChecking(false);
    }
  }

  async function continueLesson() {
    if (!lesson || !step || !feedback?.isCorrect || !attemptId) {
      return;
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

  function retryStep() {
    setSelectedAnswer(null);
    setInteractionRevision(revision => revision + 1);
    setFeedback(null);
    stepStartedAt.current = Date.now();
  }

  if (!lesson && !error) {
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
    return (
      <View style={styles.centeredState}>
        <LearningMascotReaction
          mascotKey={mascotKey}
          reaction="encourage"
          size={112}
        />
        <Text style={styles.centeredTitle}>We could not open this lesson</Text>
        <Text style={styles.centeredText}>{error}</Text>
        <SquishPressable
          onPress={onBack}
          reduceMotion={reduceMotion}
          containerStyle={styles.centeredButtonWrap}
        >
          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to learning path</Text>
          </View>
        </SquishPressable>
      </View>
    );
  }

  if (completion) {
    return (
      <ScrollView contentContainerStyle={styles.completionScreen}>
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
        <Text style={styles.completionTitle}>
          {completion.passed ? 'Lesson complete!' : 'Practice run complete'}
        </Text>
        <Text style={styles.completionSubtitle}>
          {completion.passed
            ? completion.nextNode
              ? `Next up: ${completion.nextNode.title}`
              : 'You finished this chapter. Your next adventure is ready.'
            : 'Review the hints, then try again to unlock the next lesson.'}
        </Text>
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
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back to learning path"
          onPress={onBack}
          style={styles.backButton}
        >
          <ArrowLeft color="#0F172A" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.lessonTitleRow}>
            <Text numberOfLines={1} style={styles.lessonTitle}>
              {lesson.shortTitle || lesson.title}
            </Text>
            <Text style={styles.headerStepCount}>
              {currentIndex + 1}/{lesson.steps.length}
            </Text>
          </View>
          <View
            accessibilityLabel={`Lesson progress: ${Math.round(
              progressPercent,
            )} percent`}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: Math.round(progressPercent),
            }}
            style={styles.progressTrack}
          >
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>
        </View>
        <Animated.View
          style={[styles.xpPill, { transform: [{ scale: xpScale }] }]}
        >
          <Sparkles color="#D97706" size={14} />
          <Text style={styles.xpText}>{sessionXp} XP</Text>
        </Animated.View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepMetaRow}>
          <Text
            style={[
              styles.phasePill,
              step.phase === 'checkpoint' && styles.checkpointPill,
            ]}
          >
            {step.phase === 'checkpoint' ? 'CHECKPOINT' : 'GUIDED CHALLENGE'}
          </Text>
          <View style={styles.stageMarkers}>
            {lesson.steps.map((lessonStep, index) => {
              const markerComplete =
                index < currentIndex ||
                (index === currentIndex && Boolean(feedback?.isCorrect));
              const markerCurrent =
                index === currentIndex && !feedback?.isCorrect;
              return (
                <View
                  key={lessonStep.id}
                  style={[
                    styles.stageMarker,
                    markerComplete && styles.stageMarkerComplete,
                    markerCurrent && styles.stageMarkerCurrent,
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Text style={styles.prompt}>{step.prompt}</Text>
        {step.supportText ? (
          <Text style={styles.supportText}>{step.supportText}</Text>
        ) : null}
        <Animated.View
          style={[
            styles.sceneStage,
            {
              opacity: sceneEntrance,
              transform: [{ translateY: sceneTranslateY }],
            },
          ]}
        >
          <View style={styles.sceneLabelRow}>
            <Text style={styles.sceneLabel}>EXPLORE THE SCENE</Text>
            <Text style={styles.scenePrompt}>What do you notice?</Text>
          </View>
          <LearningVisual spec={step.visual} />
        </Animated.View>

        <Animated.View style={{ transform: [{ translateX: shake }] }}>
          {step.interaction ? (
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

        {feedback ? (
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

        {!feedback && hintStage > 0 ? (
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
          onPress={feedback?.isCorrect ? continueLesson : submitAnswer}
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
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  centeredButtonWrap: { marginTop: 16, width: '100%' },
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
  checkpointPill: { backgroundColor: '#F3E8FF', color: '#7E22CE' },
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
  header: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerCenter: { flex: 1 },
  headerStepCount: { color: '#64748B', fontSize: 11, fontWeight: '900' },
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
  lessonTitle: { color: '#0F172A', flex: 1, fontSize: 14, fontWeight: '900' },
  lessonTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
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
  phasePill: {
    backgroundColor: '#CCFBF1',
    borderRadius: 999,
    color: '#0F766E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
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
  progressFill: {
    backgroundColor: '#4EB6A5',
    borderRadius: 999,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 6,
    marginTop: 6,
    overflow: 'hidden',
  },
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
  sceneLabel: {
    color: '#0F766E',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sceneLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 3,
  },
  scenePrompt: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  sceneStage: { gap: 7 },
  screen: { backgroundColor: '#F9FAFB', flex: 1 },
  sparkleText: { color: '#F59E0B', fontSize: 24 },
  stageMarker: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    flex: 1,
    height: 5,
    maxWidth: 24,
    minWidth: 8,
  },
  stageMarkerComplete: { backgroundColor: '#4EB6A5' },
  stageMarkerCurrent: { backgroundColor: '#4F7CE8' },
  stageMarkers: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    maxWidth: '48%',
  },
  stepMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supportText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  xpPill: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  xpResultCard: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  xpText: { color: '#92400E', fontSize: 11, fontWeight: '900' },
  xpValue: { color: '#EA580C' },
});
