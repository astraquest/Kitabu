import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, CheckCircle2, GraduationCap, Sparkles, XCircle } from 'lucide-react-native';
import {
  completeOnboardingDiagnostic,
  completeProgressiveDiagnostic,
  startOnboardingDiagnostic,
  startProgressiveDiagnostic,
  submitDiagnosticAnswer,
  submitProgressiveDiagnosticAnswer,
} from '../services/diagnosticService';
import { triggerHaptic } from '../services/haptics';
import { playQuizSoundEffect } from '../services/soundEffects';
import { DiagnosticQuestion, DiagnosticResult, OnboardingMascotKey } from '../types/app';

const HIDDEN_CONFIDENCE_SCORE = 3;
const MASCOT_FEEDBACK_MS = 560;
const RESULT_BUILD_MS = 1900;
const RESULT_BUILD_TICK_MS = 80;

const sunguraRabbitMascot = require('../assets/mascot/sungura-rabbit.png');
const simbaLionMascot = require('../assets/mascot/simba-lion.png');
const ndovuElephantMascot = require('../assets/mascot/ndovu-elephant.png');

type DiagnosticFeedbackKind = 'idle' | 'correct' | 'wrong' | 'celebrate';

type DiagnosticMascotTheme = {
  source: ImageSourcePropType;
  label: string;
  accent: string;
  soft: string;
};

const DIAGNOSTIC_MASCOTS: Record<OnboardingMascotKey, DiagnosticMascotTheme> = {
  lion: {
    source: simbaLionMascot,
    label: 'Rafiki the Lion',
    accent: '#F59E0B',
    soft: 'rgba(245,158,11,0.2)',
  },
  rabbit: {
    source: sunguraRabbitMascot,
    label: 'Rafiki the Rabbit',
    accent: '#10B981',
    soft: 'rgba(16,185,129,0.18)',
  },
  elephant: {
    source: ndovuElephantMascot,
    label: 'Rafiki the Elephant',
    accent: '#60A5FA',
    soft: 'rgba(96,165,250,0.2)',
  },
};

const RESULT_CONFETTI: Array<{
  color: string;
  left: `${number}%`;
  rotate: string;
  top: number;
}> = [
  { color: '#FBBF24', left: '12%', rotate: '-18deg', top: 20 },
  { color: '#60A5FA', left: '44%', rotate: '24deg', top: 12 },
  { color: '#34D399', left: '78%', rotate: '-34deg', top: 28 },
  { color: '#F472B6', left: '88%', rotate: '18deg', top: 68 },
  { color: '#A78BFA', left: '18%', rotate: '32deg', top: 76 },
  { color: '#FB923C', left: '62%', rotate: '-22deg', top: 86 },
  { color: '#22D3EE', left: '30%', rotate: '15deg', top: 118 },
  { color: '#FDE047', left: '82%', rotate: '-28deg', top: 124 },
];

const PATH_BUILD_STATUS_LABELS = [
  'Saving your baseline...',
  'Mapping strengths...',
  'Tuning review path...',
  'Preparing quick wins...',
  'Path ready',
];

const PATH_BUILD_CHECKLIST = [
  'Baseline saved',
  'Subject level mapped',
  'Review path tuned',
  'Quick wins prepared',
];

export interface PreviewDiagnosticQuestion extends DiagnosticQuestion {
  correctAnswer: string;
}

interface DiagnosticScreenProps {
  mode?: 'onboarding' | 'progressive';
  mascotKey?: OnboardingMascotKey;
  subjectId?: string;
  subjectName?: string;
  previewQuestions?: PreviewDiagnosticQuestion[];
  onComplete: (result: DiagnosticResult) => void;
}

export function DiagnosticScreen({
  mode = 'onboarding',
  mascotKey = 'rabbit',
  subjectId,
  subjectName,
  previewQuestions,
  onComplete,
}: DiagnosticScreenProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [isPreparingResult, setIsPreparingResult] = useState(false);
  const [pathBuildProgress, setPathBuildProgress] = useState(0);
  const [feedbackKind, setFeedbackKind] = useState<DiagnosticFeedbackKind>('idle');
  const [previewCorrectCount, setPreviewCorrectCount] = useState(0);
  const feedbackPop = useRef(new Animated.Value(0)).current;
  const isPreview = Boolean(previewQuestions?.length);
  const mascot = DIAGNOSTIC_MASCOTS[mascotKey] ?? DIAGNOSTIC_MASCOTS.rabbit;

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const groupedSubjects = useMemo(
    () => Array.from(new Set(questions.map(question => question.subjectName))).join(' + '),
    [questions],
  );

  function runFeedbackEffect(kind: DiagnosticFeedbackKind) {
    setFeedbackKind(kind);
    feedbackPop.setValue(0);
    Animated.sequence([
      Animated.spring(feedbackPop, {
        friction: 4,
        tension: 150,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(feedbackPop, {
        duration: 180,
        toValue: 0.86,
        useNativeDriver: true,
      }),
    ]).start();
  }

  useEffect(() => {
    if (previewQuestions?.length) {
      setSessionId('preview-diagnostic');
      setQuestions(previewQuestions);
      setQuestionStartedAt(Date.now());
      setPreviewCorrectCount(0);
      setResult(null);
      setIsPreparingResult(false);
      setPathBuildProgress(0);
      setError(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    const starter =
      mode === 'progressive' && subjectId
        ? startProgressiveDiagnostic(subjectId)
        : startOnboardingDiagnostic();

    starter
      .then(session => {
        if (!mounted) {
          return;
        }
        setSessionId(session.sessionId);
        setQuestions(session.questions);
        setQuestionStartedAt(Date.now());
        setResult(null);
        setIsPreparingResult(false);
        setPathBuildProgress(0);
        setError(null);
      })
      .catch(loadError => {
        if (!mounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to start diagnostic');
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [mode, previewQuestions, subjectId]);

  useEffect(() => {
    if (!isPreparingResult) {
      return undefined;
    }

    const startedAt = Date.now();
    setPathBuildProgress(0);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(98, Math.round((elapsed / RESULT_BUILD_MS) * 100));
      setPathBuildProgress(nextProgress);
    }, RESULT_BUILD_TICK_MS);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setPathBuildProgress(100);
      setIsPreparingResult(false);
      setFeedbackKind('celebrate');
      void playQuizSoundEffect('complete');
      triggerHaptic('success');
    }, RESULT_BUILD_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPreparingResult]);

  async function submitCurrentAnswer(answer: string) {
    if (!sessionId || !currentQuestion || !answer || isSubmitting) {
      triggerHaptic('error');
      return;
    }

    setSelectedAnswer(answer);
    setIsSubmitting(true);
    setError(null);
    try {
      const answerPayload = {
        questionId: currentQuestion.id,
        answer,
        confidenceScore: HIDDEN_CONFIDENCE_SCORE,
        responseLatencyMs: Date.now() - questionStartedAt,
      };
      const previewQuestion = previewQuestions?.find(question => question.id === currentQuestion.id);
      const answerResult = isPreview
        ? {
            recorded: true,
            isCorrect:
              previewQuestion?.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase(),
          }
        : mode === 'progressive' && subjectId
          ? await submitProgressiveDiagnosticAnswer(subjectId, sessionId, answerPayload)
          : await submitDiagnosticAnswer(sessionId, answerPayload);

      runFeedbackEffect(answerResult.isCorrect ? 'correct' : 'wrong');
      void playQuizSoundEffect(answerResult.isCorrect ? 'correct' : 'wrong');
      triggerHaptic(answerResult.isCorrect ? 'success' : 'error');
      await new Promise(resolve => setTimeout(resolve, MASCOT_FEEDBACK_MS));
      const nextPreviewCorrectCount =
        isPreview && answerResult.isCorrect ? previewCorrectCount + 1 : previewCorrectCount;

      if (currentIndex < questions.length - 1) {
        if (isPreview) {
          setPreviewCorrectCount(nextPreviewCorrectCount);
        }
        setCurrentIndex(index => index + 1);
        setSelectedAnswer('');
        setQuestionStartedAt(Date.now());
        setFeedbackKind('idle');
        return;
      }

      if (isPreview) {
        const answeredQuestions = [...questions];
        const correct = nextPreviewCorrectCount;
        const percentage = Math.round((correct / answeredQuestions.length) * 100);
        setResult({
          correct,
          total: answeredQuestions.length,
          percentage,
          subjects: Array.from(new Set(answeredQuestions.map(question => question.subjectId))).map(subject => {
            const subjectQuestions = answeredQuestions.filter(question => question.subjectId === subject);
            const subjectCorrect =
              subjectQuestions.some(question => question.id === currentQuestion.id) && answerResult.isCorrect
                ? 1
                : 0;
            return {
              subjectId: subject,
              correct: subjectCorrect,
              total: subjectQuestions.length,
              percentage: Math.round((subjectCorrect / subjectQuestions.length) * 100),
              averageConfidence: HIDDEN_CONFIDENCE_SCORE,
            };
          }),
        });
      } else {
        const completion =
          mode === 'progressive' && subjectId
            ? await completeProgressiveDiagnostic(subjectId, sessionId)
            : await completeOnboardingDiagnostic(sessionId);
        setResult(completion.result);
      }
      setPathBuildProgress(0);
      setIsPreparingResult(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save answer');
      runFeedbackEffect('wrong');
      void playQuizSoundEffect('wrong');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centerScreen}>
        <View style={styles.loadingMascotCard}>
          <DiagnosticMascot
            feedbackKind="idle"
            mascot={mascot}
            size={112}
          />
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.loadingText}>Preparing your learning diagnostic...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (result && isPreparingResult) {
    return (
      <LinearGradient
        colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.screen}>
        <ScrollView contentContainerStyle={styles.resultWrap} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <PathBuildLoadingCard
              accent={mascot.accent}
              mascot={mascot}
              progress={pathBuildProgress}
              subjectName={mode === 'progressive' && subjectName ? subjectName : groupedSubjects}
            />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (result) {
    return (
      <LinearGradient
        colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.screen}>
        <ScrollView contentContainerStyle={styles.resultWrap} showsVerticalScrollIndicator={false}>
          <View style={styles.resultCard}>
            <LinearGradient
              colors={['rgba(59,130,246,0.34)', 'rgba(139,92,246,0.26)']}
              style={styles.resultHero}>
              <ResultConfetti />
              <DiagnosticMascot
                feedbackKind="celebrate"
                mascot={mascot}
                size={132}
              />
              <View style={styles.resultIcon}>
                <CheckCircle2 color="#FFFFFF" size={24} />
              </View>
              <Text style={styles.resultTitle}>Your path is ready</Text>
              <Text style={styles.resultScore}>
                {result.correct}/{result.total} correct ({result.percentage}%)
              </Text>
            </LinearGradient>
            <Text style={styles.resultBody}>
              Kitabu will use this baseline to tune your lessons and review schedule.
            </Text>
            <View style={styles.subjectSummary}>
              {result.subjects.map(subject => (
                <View key={subject.subjectId} style={styles.subjectPill}>
                  <Text style={styles.subjectPillTitle}>{subject.subjectId}</Text>
                  <Text style={styles.subjectPillText}>{subject.percentage}%</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => onComplete(result)} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {mode === 'progressive' ? `Continue to ${subjectName || 'subject'}` : 'Go to dashboard'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (!currentQuestion) {
    return (
      <LinearGradient
        colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.centerScreen}>
        <DiagnosticMascot
          feedbackKind="wrong"
          mascot={mascot}
          size={120}
        />
        <Text style={styles.errorText}>{error || 'No diagnostic questions available.'}</Text>
      </LinearGradient>
    );
  }

  const feedbackBadgeScale = feedbackPop.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  return (
    <LinearGradient
      colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <LinearGradient
            colors={['rgba(59,130,246,0.36)', 'rgba(139,92,246,0.26)']}
            style={styles.header}>
            <View style={styles.headerCopyRow}>
              <View style={styles.headerIcon}>
                <GraduationCap color="#FFFFFF" size={17} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.eyebrow}>Personal learning path</Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  numberOfLines={1}
                  style={styles.title}>
                  Find your starting point
                </Text>
                <Text style={styles.subtitle}>
                  {mode === 'progressive' && subjectName ? subjectName : groupedSubjects}. Question {currentIndex + 1} of {questions.length}.
                </Text>
              </View>
              <DiagnosticMascot
                feedbackKind={feedbackKind}
                mascot={mascot}
                size={70}
              />
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </LinearGradient>

          <View style={styles.questionCard}>
            <Text style={styles.subjectLabel}>{currentQuestion.subjectName}</Text>
            <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
            <View style={styles.options}>
              {currentQuestion.options.map(option => {
                const selected = selectedAnswer === option;
                const showFeedback = selected && feedbackKind !== 'idle' && feedbackKind !== 'celebrate';

                return (
                  <Pressable
                    key={option}
                    disabled={isSubmitting}
                    onPress={() => submitCurrentAnswer(option)}
                    style={[
                      styles.optionButton,
                      selected && styles.optionButtonSelected,
                      selected && feedbackKind === 'correct' && styles.optionButtonCorrect,
                      selected && feedbackKind === 'wrong' && styles.optionButtonReview,
                      showFeedback && styles.optionButtonWithFeedback,
                    ]}>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                      {option}
                    </Text>
                    {showFeedback ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.answerFeedbackBadge,
                          feedbackKind === 'correct'
                            ? styles.answerFeedbackBadgeCorrect
                            : styles.answerFeedbackBadgeWrong,
                          {
                            opacity: feedbackPop,
                            transform: [{ scale: feedbackBadgeScale }],
                          },
                        ]}>
                        {feedbackKind === 'correct' ? (
                          <CheckCircle2 color="#FFFFFF" size={18} strokeWidth={2.6} />
                        ) : (
                          <XCircle color="#FFFFFF" size={18} strokeWidth={2.6} />
                        )}
                        <Text style={styles.answerFeedbackText}>
                          {feedbackKind === 'correct' ? 'Nice' : 'Try next'}
                        </Text>
                      </Animated.View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {isSubmitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.submittingText}>Loading next question...</Text>
              </View>
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function DiagnosticMascot({
  feedbackKind,
  mascot,
  size,
}: {
  feedbackKind: DiagnosticFeedbackKind;
  mascot: DiagnosticMascotTheme;
  size: number;
}) {
  const iconSize = Math.max(18, Math.round(size * 0.28));

  return (
    <View
      accessibilityLabel={mascot.label}
      style={[
        styles.diagnosticMascotWrap,
        {
          backgroundColor: mascot.soft,
          height: size,
          width: size,
        },
      ]}>
      <Image
        resizeMode="contain"
        source={mascot.source}
        style={[
          styles.diagnosticMascot,
          {
            height: size * 0.94,
            width: size * 0.94,
          },
        ]}
      />
      {feedbackKind === 'correct' ? (
        <View
          style={[
            styles.mascotStatusBadge,
            styles.mascotStatusBadgeCorrect,
            { height: iconSize, width: iconSize },
          ]}>
          <CheckCircle2 color="#FFFFFF" size={iconSize * 0.7} strokeWidth={2.8} />
        </View>
      ) : null}
      {feedbackKind === 'wrong' ? (
        <View
          style={[
            styles.mascotStatusBadge,
            styles.mascotStatusBadgeWrong,
            { height: iconSize, width: iconSize },
          ]}>
          <XCircle color="#FFFFFF" size={iconSize * 0.7} strokeWidth={2.8} />
        </View>
      ) : null}
      {feedbackKind === 'celebrate' ? (
        <View
          style={[
            styles.mascotStatusBadge,
            styles.mascotStatusBadgeCelebrate,
            { height: iconSize, width: iconSize },
          ]}>
          <Sparkles color="#FFFFFF" size={iconSize * 0.66} strokeWidth={2.8} />
        </View>
      ) : null}
    </View>
  );
}

function PathBuildLoadingCard({
  accent,
  mascot,
  progress,
  subjectName,
}: {
  accent: string;
  mascot: DiagnosticMascotTheme;
  progress: number;
  subjectName: string;
}) {
  const progressNow = Math.min(100, Math.max(0, progress));
  const statusLabel =
    PATH_BUILD_STATUS_LABELS[
      Math.min(
        Math.floor(progressNow / 25),
        PATH_BUILD_STATUS_LABELS.length - 1,
      )
    ];

  return (
    <View style={styles.pathBuildWrap}>
      <Text style={[styles.pathBuildKicker, { color: accent }]}>
        Customizing learner path
      </Text>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.74}
        numberOfLines={1}
        style={styles.pathBuildTitle}>
        Setting your baseline
      </Text>
      <View style={[styles.pathBuildPanel, { borderColor: `${accent}55` }]}>
        <View
          style={[
            styles.pathBuildRing,
            {
              backgroundColor: mascot.soft,
              borderColor: accent,
            },
          ]}>
          <Image
            accessibilityLabel={`${mascot.label} mascot loading avatar`}
            resizeMode="contain"
            source={mascot.source}
            style={styles.pathBuildMascot}
          />
          <View style={styles.pathBuildBadge}>
            <Text style={[styles.pathBuildBadgeText, { color: accent }]}>
              {progressNow}%
            </Text>
          </View>
        </View>
        <Text style={[styles.pathBuildStatus, { color: accent }]}>
          {statusLabel}
        </Text>
        <View
          accessibilityLabel="Learner path build progress"
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: progressNow,
            text: `${progressNow}% complete`,
          }}
          style={styles.pathBuildTrack}>
          <View
            style={[
              styles.pathBuildFill,
              {
                backgroundColor: accent,
                width: `${progressNow}%`,
              },
            ]}
          />
        </View>
        <Text style={[styles.pathBuildProgressText, { color: accent }]}>
          {progressNow}%
        </Text>
        <Text style={styles.pathBuildBody}>
          We are combining your answers, {subjectName || 'subject'} baseline,
          and review rhythm.
        </Text>
      </View>
      <View style={styles.pathBuildChecklist}>
        {PATH_BUILD_CHECKLIST.map(item => (
          <View key={item} style={styles.pathBuildChecklistRow}>
            <View style={[styles.pathBuildCheck, { backgroundColor: accent }]}>
              <Check color="#FFFFFF" size={12} strokeWidth={3} />
            </View>
            <Text style={styles.pathBuildChecklistText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResultConfetti() {
  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {RESULT_CONFETTI.map((piece, index) => (
        <View
          key={`${piece.color}-${index}`}
          style={[
            styles.confettiPiece,
            {
              backgroundColor: piece.color,
              left: piece.left,
              top: piece.top,
              transform: [{ rotate: piece.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centerScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingMascotCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    width: '100%',
    maxWidth: 340,
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  shell: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 12,
    maxWidth: 344,
    width: '100%',
  },
  header: {
    gap: 9,
    padding: 11,
    paddingBottom: 10,
  },
  headerCopyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 13,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: '#BFDBFE',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
    marginTop: 2,
  },
  subtitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 3,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#60A5FA',
    borderRadius: 999,
    height: 6,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 22,
    borderWidth: 1,
    margin: 14,
    marginTop: 12,
    padding: 18,
  },
  subjectLabel: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  questionText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
    marginTop: 10,
  },
  options: {
    gap: 12,
    marginTop: 22,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderColor: 'rgba(148,163,184,0.5)',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 62,
    padding: 15,
  },
  optionButtonWithFeedback: {
    paddingRight: 104,
  },
  optionButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  optionButtonCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  optionButtonReview: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  optionText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800',
  },
  optionTextSelected: {
    color: '#1D4ED8',
  },
  submittingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 16,
  },
  submittingText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  answerFeedbackBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
    right: 10,
    top: 12,
  },
  answerFeedbackBadgeCorrect: {
    backgroundColor: '#10B981',
  },
  answerFeedbackBadgeWrong: {
    backgroundColor: '#F97316',
  },
  answerFeedbackText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  diagnosticMascotWrap: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  diagnosticMascot: {
    marginTop: 4,
  },
  mascotStatusBadge: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    top: -2,
  },
  mascotStatusBadgeCorrect: {
    backgroundColor: '#10B981',
  },
  mascotStatusBadgeWrong: {
    backgroundColor: '#F97316',
  },
  mascotStatusBadgeCelebrate: {
    backgroundColor: '#8B5CF6',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    paddingHorizontal: 18,
    paddingBottom: 18,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  pathBuildWrap: {
    padding: 20,
    width: '100%',
  },
  pathBuildKicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.45,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  pathBuildTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 5,
    textAlign: 'center',
  },
  pathBuildPanel: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
    width: '100%',
  },
  pathBuildRing: {
    alignItems: 'center',
    borderRadius: 80,
    borderWidth: 4,
    height: 150,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 150,
  },
  pathBuildMascot: {
    height: 104,
    marginTop: 4,
    width: 104,
  },
  pathBuildBadge: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    bottom: 12,
    minWidth: 64,
    paddingHorizontal: 11,
    paddingVertical: 6,
    position: 'absolute',
  },
  pathBuildBadgeText: {
    fontSize: 19,
    fontWeight: '900',
  },
  pathBuildStatus: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  pathBuildTrack: {
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    height: 10,
    marginTop: 14,
    overflow: 'hidden',
    width: '100%',
  },
  pathBuildFill: {
    borderRadius: 999,
    height: '100%',
  },
  pathBuildProgressText: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  pathBuildBody: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  pathBuildChecklist: {
    gap: 10,
    marginTop: 16,
  },
  pathBuildChecklistRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  pathBuildCheck: {
    alignItems: 'center',
    borderRadius: 999,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  pathBuildChecklistText: {
    color: '#475569',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  resultWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  resultHero: {
    alignItems: 'center',
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    width: '100%',
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(22,163,74,0.72)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    marginTop: -10,
    width: 44,
  },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  resultScore: {
    color: '#BFDBFE',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  resultBody: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    paddingHorizontal: 22,
    paddingTop: 18,
    textAlign: 'center',
  },
  subjectSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  subjectPill: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  subjectPillTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  subjectPillText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  confettiPiece: {
    borderRadius: 2,
    height: 16,
    opacity: 0.88,
    position: 'absolute',
    width: 7,
  },
});
