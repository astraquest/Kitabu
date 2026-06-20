import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, GraduationCap, Sparkles } from 'lucide-react-native';
import { FoxMascotArt, FoxMascotMood } from '../components/FoxMascotArt';
import {
  completeOnboardingDiagnostic,
  completeProgressiveDiagnostic,
  startOnboardingDiagnostic,
  startProgressiveDiagnostic,
  submitDiagnosticAnswer,
  submitProgressiveDiagnosticAnswer,
} from '../services/diagnosticService';
import { triggerHaptic } from '../services/haptics';
import { DiagnosticQuestion, DiagnosticResult } from '../types/app';

const HIDDEN_CONFIDENCE_SCORE = 3;
const MASCOT_FEEDBACK_MS = 520;

export interface PreviewDiagnosticQuestion extends DiagnosticQuestion {
  correctAnswer: string;
}

interface DiagnosticScreenProps {
  mode?: 'onboarding' | 'progressive';
  subjectId?: string;
  subjectName?: string;
  previewQuestions?: PreviewDiagnosticQuestion[];
  onComplete: (result: DiagnosticResult) => void;
}

export function DiagnosticScreen({
  mode = 'onboarding',
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
  const [mascotMood, setMascotMood] = useState<FoxMascotMood>('thinking');
  const [previewCorrectCount, setPreviewCorrectCount] = useState(0);
  const isPreview = Boolean(previewQuestions?.length);

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const groupedSubjects = useMemo(
    () => Array.from(new Set(questions.map(question => question.subjectName))).join(' + '),
    [questions],
  );

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
          <FoxMascotArt mood="thinking" size={148} />
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
              <FoxMascotArt mood="celebrate" size={168} />
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
        <FoxMascotArt mood="note" size={150} />
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.shell}>
          <LinearGradient
            colors={['rgba(59,130,246,0.36)', 'rgba(139,92,246,0.26)']}
            style={styles.header}>
            <View style={styles.headerCopyRow}>
              <View style={styles.headerIcon}>
                <GraduationCap color="#FFFFFF" size={22} />
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.eyebrow}>Personal learning path</Text>
                <Text style={styles.title}>Help us find your real starting point</Text>
                <Text style={styles.subtitle}>
                  {mode === 'progressive' && subjectName ? subjectName : groupedSubjects}. Question {currentIndex + 1} of {questions.length}.
                </Text>
              </View>
            </View>
            <View style={styles.mascotStage}>
              <FoxMascotArt mood={isSubmitting ? mascotMood : 'thinking'} size={154} />
              <View style={styles.mascotBubble}>
                <Sparkles color="#FBBF24" size={15} />
                <Text style={styles.mascotBubbleText}>
                  {isSubmitting
                    ? mascotMood === 'thumbs-up'
                      ? 'Nice work'
                      : mascotMood === 'note'
                        ? 'Checking notes'
                        : 'Thinking'
                    : 'Thinking with you'}
                </Text>
              </View>
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
              return (
                <Pressable
                  key={option}
                  disabled={isSubmitting}
                  onPress={() => submitCurrentAnswer(option)}
                  style={[
                    styles.optionButton,
                    selected && styles.optionButtonSelected,
                    selected && mascotMood === 'thumbs-up' && styles.optionButtonCorrect,
                    selected && mascotMood === 'note' && styles.optionButtonReview,
                  ]}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {isSubmitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#FFFFFF" />
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
  content: {
    flexGrow: 1,
    padding: 14,
    paddingBottom: 24,
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
  },
  header: {
    gap: 12,
    padding: 18,
    paddingBottom: 14,
  },
  headerCopyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    color: '#BFDBFE',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 4,
  },
  subtitle: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
  },
  mascotStage: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  mascotBubble: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.34)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: -10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mascotBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    height: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#60A5FA',
    borderRadius: 999,
    height: 7,
  },
  questionCard: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 22,
    borderWidth: 1,
    margin: 18,
    marginTop: 14,
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
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 32,
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
    minHeight: 62,
    padding: 15,
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
    color: '#FFFFFF',
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
