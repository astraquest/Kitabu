import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2 } from 'lucide-react-native';
import { LEARNING_MASCOT_SOURCES } from '../features/progressiveLearning/components/LearningMascotReaction';
import {
  completeOnboardingDiagnostic,
  completeProgressiveDiagnostic,
  startOnboardingDiagnostic,
  startProgressiveDiagnostic,
  submitDiagnosticAnswer,
  submitProgressiveDiagnosticAnswer,
} from '../services/diagnosticService';
import { triggerHaptic } from '../services/haptics';
import { DiagnosticQuestion, DiagnosticResult, OnboardingMascotKey } from '../types/app';

const HIDDEN_CONFIDENCE_SCORE = 3;
const MASCOT_FEEDBACK_MS = 520;
const logoAsset = require('../assets/logo.png');

export interface PreviewDiagnosticQuestion extends DiagnosticQuestion {
  correctAnswer: string;
}

interface DiagnosticScreenProps {
  mode?: 'onboarding' | 'progressive';
  subjectId?: string;
  subjectName?: string;
  mascotKey?: OnboardingMascotKey;
  previewQuestions?: PreviewDiagnosticQuestion[];
  onComplete: (result: DiagnosticResult) => void;
}

export function DiagnosticScreen({
  mode = 'onboarding',
  subjectId,
  subjectName,
  mascotKey = 'rabbit',
  previewQuestions,
  onComplete,
}: DiagnosticScreenProps) {
  const { height, width } = useWindowDimensions();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [mascotMood, setMascotMood] = useState<'thinking' | 'thumbs-up' | 'note' | 'celebrate'>('thinking');
  const [previewCorrectCount, setPreviewCorrectCount] = useState(0);
  const isPreview = Boolean(previewQuestions?.length);

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const compactLayout = height < 760 || width < 370;
  const mascotSource = LEARNING_MASCOT_SOURCES[mascotKey];

  useEffect(() => {
    if (previewQuestions?.length) {
      setSessionId('preview-diagnostic');
      setQuestions(previewQuestions);
      setQuestionStartedAt(Date.now());
      setPreviewCorrectCount(0);
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

      setMascotMood(answerResult.isCorrect ? 'thumbs-up' : 'note');
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
        setMascotMood('thinking');
        triggerHaptic('impact');
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
      setMascotMood('celebrate');
      triggerHaptic('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save answer');
      setMascotMood('note');
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
          <Image
            accessibilityLabel={`${mascotKey} learning mascot`}
            resizeMode="contain"
            source={mascotSource}
            style={styles.loadingMascot}
          />
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={styles.loadingText}>Preparing your learning diagnostic...</Text>
        </View>
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
              <Image
                accessibilityLabel={`${mascotKey} learning mascot celebrating`}
                resizeMode="contain"
                source={mascotSource}
                style={styles.resultMascot}
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
        <Image
          accessibilityLabel={`${mascotKey} learning mascot`}
          resizeMode="contain"
          source={mascotSource}
          style={styles.emptyMascot}
        />
        <Text style={styles.errorText}>{error || 'No diagnostic questions available.'}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0b1c32', '#15385f', '#2b557f', '#6b3fd8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.content, compactLayout && styles.contentCompact]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.shell, compactLayout && styles.shellCompact]}>
          <LinearGradient
            colors={['rgba(59,130,246,0.36)', 'rgba(139,92,246,0.26)']}
            style={[styles.header, compactLayout && styles.headerCompact]}>
            <View style={styles.heroRow}>
              <View style={styles.headerTitleGroup}>
                <View style={styles.headerLogoWrap}>
                  <Image
                    accessibilityLabel="Kitabu AI logo"
                    resizeMode="contain"
                    source={logoAsset}
                    style={styles.headerLogo}
                  />
                </View>
                <Text
                  adjustsFontSizeToFit
                  maxFontSizeMultiplier={1.1}
                  minimumFontScale={0.78}
                  numberOfLines={1}
                  style={[styles.title, compactLayout && styles.titleCompact]}>
                  Find your starting point
                </Text>
              </View>
              <Image
                accessibilityLabel={`${mascotKey} learning mascot`}
                resizeMode="contain"
                source={mascotSource}
                style={[styles.headerMascot, compactLayout && styles.headerMascotCompact]}
              />
            </View>
            <View
              accessibilityLabel={`Question ${currentIndex + 1} of ${questions.length}`}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: questions.length, now: currentIndex + 1 }}
              style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          </LinearGradient>

          <View style={[styles.questionCard, compactLayout && styles.questionCardCompact]}>
          <Text maxFontSizeMultiplier={1.15} style={styles.subjectLabel}>{currentQuestion.subjectName}</Text>
          <Text
            maxFontSizeMultiplier={1.15}
            style={[styles.questionText, compactLayout && styles.questionTextCompact]}>
            {currentQuestion.prompt}
          </Text>
          <View style={[styles.options, compactLayout && styles.optionsCompact]}>
            {currentQuestion.options.map(option => {
              const selected = selectedAnswer === option;
              return (
                <Pressable
                  key={option}
                  accessibilityLabel={`Answer ${option}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting, selected }}
                  disabled={isSubmitting}
                  onPress={() => submitCurrentAnswer(option)}
                  style={[
                    styles.optionButton,
                    compactLayout && styles.optionButtonCompact,
                    selected && styles.optionButtonSelected,
                    selected && mascotMood === 'thumbs-up' && styles.optionButtonCorrect,
                    selected && mascotMood === 'note' && styles.optionButtonReview,
                  ]}>
                  <Text
                    maxFontSizeMultiplier={1.15}
                    style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {isSubmitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#1D4ED8" />
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
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  loadingText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingMascot: {
    height: 104,
    width: 104,
  },
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contentCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  shell: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 390,
    width: '100%',
  },
  shellCompact: {
    borderRadius: 20,
  },
  header: {
    gap: 8,
    padding: 12,
  },
  headerCompact: {
    gap: 6,
    padding: 9,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  headerTitleGroup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 9,
  },
  headerLogoWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerLogo: {
    height: 30,
    width: 30,
  },
  title: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 23,
  },
  titleCompact: {
    fontSize: 17,
    lineHeight: 21,
  },
  headerMascot: {
    height: 60,
    width: 60,
  },
  headerMascotCompact: {
    height: 48,
    width: 48,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    height: 5,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#60A5FA',
    borderRadius: 999,
    height: 5,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    borderWidth: 1,
    margin: 12,
    marginTop: 10,
    padding: 14,
  },
  questionCardCompact: {
    borderRadius: 17,
    margin: 8,
    marginTop: 7,
    padding: 11,
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
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 7,
  },
  questionTextCompact: {
    fontSize: 18,
    lineHeight: 23,
  },
  options: {
    gap: 8,
    marginTop: 14,
  },
  optionsCompact: {
    gap: 6,
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderColor: 'rgba(148,163,184,0.5)',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionButtonCompact: {
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
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
  resultWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 18,
  },
  resultHero: {
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    width: '100%',
  },
  resultMascot: {
    height: 132,
    width: 132,
  },
  emptyMascot: {
    height: 112,
    width: 112,
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
});
