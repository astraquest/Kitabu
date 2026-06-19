import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, GraduationCap } from 'lucide-react-native';
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

interface DiagnosticScreenProps {
  mode?: 'onboarding' | 'progressive';
  subjectId?: string;
  subjectName?: string;
  onComplete: (result: DiagnosticResult) => void;
}

export function DiagnosticScreen({
  mode = 'onboarding',
  subjectId,
  subjectName,
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

  const currentQuestion = questions[currentIndex] ?? null;
  const progress = questions.length > 0 ? (currentIndex + 1) / questions.length : 0;
  const groupedSubjects = useMemo(
    () => Array.from(new Set(questions.map(question => question.subjectName))).join(' + '),
    [questions],
  );

  useEffect(() => {
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
  }, [mode, subjectId]);

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
      if (mode === 'progressive' && subjectId) {
        await submitProgressiveDiagnosticAnswer(subjectId, sessionId, answerPayload);
      } else {
        await submitDiagnosticAnswer(sessionId, answerPayload);
      }

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(index => index + 1);
        setSelectedAnswer('');
        setQuestionStartedAt(Date.now());
        triggerHaptic('impact');
        return;
      }

      const completion =
        mode === 'progressive' && subjectId
          ? await completeProgressiveDiagnostic(subjectId, sessionId)
          : await completeOnboardingDiagnostic(sessionId);
      setResult(completion.result);
      triggerHaptic('success');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save answer');
      triggerHaptic('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator color="#2563EB" size="large" />
        <Text style={styles.loadingText}>Preparing your learning diagnostic...</Text>
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.screen}>
        <View style={styles.resultCard}>
          <View style={styles.resultIcon}>
            <CheckCircle2 color="#16A34A" size={34} />
          </View>
          <Text style={styles.resultTitle}>Your path is ready</Text>
          <Text style={styles.resultScore}>
            {result.correct}/{result.total} correct ({result.percentage}%)
          </Text>
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
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorText}>{error || 'No diagnostic questions available.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <GraduationCap color="#2563EB" size={24} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.eyebrow}>Personal learning path</Text>
          <Text style={styles.title}>Help us find your real starting point</Text>
          <Text style={styles.subtitle}>
            {mode === 'progressive' && subjectName ? subjectName : groupedSubjects}. Question {currentIndex + 1} of {questions.length}.
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
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
                  style={[styles.optionButton, selected && styles.optionButtonSelected]}>
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                    {option}
                  </Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerScreen: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  header: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 20,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  headerTextWrap: {
    flex: 1,
  },
  eyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 29,
    marginTop: 4,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    height: 8,
  },
  progressFill: {
    backgroundColor: '#2563EB',
    height: 8,
  },
  content: {
    gap: 16,
    padding: 18,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  subjectLabel: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '900',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 62,
    padding: 15,
  },
  optionButtonSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
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
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    margin: 20,
    marginTop: 72,
    padding: 24,
  },
  resultIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  resultTitle: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  resultScore: {
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  resultBody: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  subjectSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginVertical: 22,
  },
  subjectPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
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
