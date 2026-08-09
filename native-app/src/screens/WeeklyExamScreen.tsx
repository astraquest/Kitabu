import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  History,
  RefreshCw,
  Trophy,
  XCircle,
} from 'lucide-react-native';

import { WeeklyExamPayload } from '../types/app';
import { AssessmentNarrationControls } from '../components/AssessmentNarrationControls';

interface WeeklyExamScreenProps {
  data: WeeklyExamPayload | null;
  error: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onRetry: () => void;
  onStart: () => Promise<void>;
  onSubmit: (
    answers: Array<{ questionId: string; answer: string }>,
    timedOut?: boolean,
  ) => Promise<void>;
}

export function WeeklyExamScreen({
  data,
  error,
  isLoading,
  isSubmitting,
  onBack,
  onRetry,
  onStart,
  onSubmit,
}: WeeklyExamScreenProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const timedOutRef = useRef(false);
  const attempt = data?.attempt ?? null;
  const isInProgress = attempt?.status === 'in_progress';

  useEffect(() => {
    if (!data || !isInProgress) {
      return;
    }
    const deadline = new Date(attempt.startedAt).getTime() + data.exam.durationMinutes * 60_000;
    setSecondsRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const interval = setInterval(() => {
      setSecondsRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt?.startedAt, data, isInProgress]);

  useEffect(() => {
    if (!isInProgress || secondsRemaining > 0 || timedOutRef.current || !data) {
      return;
    }
    timedOutRef.current = true;
    const submittedAnswers = data.exam.questions
      .filter(question => answers[question.id] !== undefined)
      .map(question => ({ questionId: question.id, answer: answers[question.id] }));
    onSubmit(submittedAnswers, true).catch(() => {
      timedOutRef.current = false;
    });
  }, [answers, data, isInProgress, onSubmit, secondsRemaining]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (isLoading && !data) {
    return <CenteredState icon={<ActivityIndicator color="#2563EB" />} title="Loading weekly exam" />;
  }

  if (error && !data) {
    return (
      <CenteredState
        icon={<XCircle color="#DC2626" size={34} />}
        title="Weekly exam unavailable"
        message={error}
        actionLabel="Try again"
        onAction={onRetry}
      />
    );
  }

  if (!data) {
    return null;
  }

  if (attempt?.status === 'completed') {
    return (
      <ExamResults
        data={data}
        onBack={onBack}
        onRetry={onRetry}
        isLoading={isLoading}
      />
    );
  }

  if (!isInProgress) {
    return (
      <ExamOverview
        data={data}
        error={error}
        isSubmitting={isSubmitting}
        onBack={onBack}
        onStart={onStart}
      />
    );
  }

  const question = data.exam.questions[questionIndex];
  const allAnswered = answeredCount === data.exam.questions.length;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <View style={styles.screen}>
      <View style={styles.examHeader}>
        <Pressable accessibilityLabel="Leave exam" onPress={onBack} style={styles.iconButton}>
          <ArrowLeft color="#0F172A" size={22} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{data.exam.title}</Text>
          <Text style={styles.headerMeta}>Question {questionIndex + 1} of {data.exam.questions.length}</Text>
        </View>
        <View style={[styles.timer, secondsRemaining < 120 && styles.timerUrgent]}>
          <Clock3 color={secondsRemaining < 120 ? '#B91C1C' : '#1D4ED8'} size={16} />
          <Text style={[styles.timerText, secondsRemaining < 120 && styles.timerTextUrgent]}>
            {minutes}:{String(seconds).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((questionIndex + 1) / data.exam.questions.length) * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.examContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.subjectLabel}>{question.subjectName}</Text>
        <Text style={styles.questionText}>{question.prompt}</Text>
        <AssessmentNarrationControls
          descriptorId={`weekly:${question.id}`}
          nextDescriptorIds={data.exam.questions.slice(questionIndex + 1, questionIndex + 3).map(item => `weekly:${item.id}`)}
        />
        <View style={styles.options}>
          {question.options.map((option, index) => {
            const selected = answers[question.id] === option;
            return (
              <Pressable
                key={option}
                onPress={() => setAnswers(current => ({ ...current, [question.id]: option }))}
                style={[styles.option, selected && styles.optionSelected]}>
                <View style={[styles.optionMarker, selected && styles.optionMarkerSelected]}>
                  <Text style={[styles.optionMarkerText, selected && styles.optionMarkerTextSelected]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.examFooter}>
        <Pressable
          disabled={questionIndex === 0}
          onPress={() => setQuestionIndex(index => Math.max(0, index - 1))}
          style={[styles.secondaryButton, questionIndex === 0 && styles.buttonDisabled]}>
          <Text style={styles.secondaryButtonText}>Previous</Text>
        </Pressable>
        {questionIndex < data.exam.questions.length - 1 ? (
          <Pressable
            onPress={() => setQuestionIndex(index => Math.min(data.exam.questions.length - 1, index + 1))}
            style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        ) : (
          <Pressable
            disabled={!allAnswered || isSubmitting}
            onPress={() =>
              onSubmit(data.exam.questions.map(item => ({
                questionId: item.id,
                answer: answers[item.id],
              })))
            }
            style={[styles.primaryButton, (!allAnswered || isSubmitting) && styles.buttonDisabled]}>
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Submit exam</Text>}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ExamOverview({
  data,
  error,
  isSubmitting,
  onBack,
  onStart,
}: {
  data: WeeklyExamPayload;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onStart: () => Promise<void>;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.overviewContent}>
      <Pressable accessibilityLabel="Back to homework" onPress={onBack} style={styles.iconButton}>
        <ArrowLeft color="#0F172A" size={22} />
      </Pressable>
      <View style={styles.heroBand}>
        <Trophy color="#F59E0B" size={38} />
        <Text style={styles.heroEyebrow}>This week</Text>
        <Text style={styles.heroTitle}>{data.exam.title}</Text>
        <Text style={styles.heroText}>A balanced check across the subjects you are learning.</Text>
      </View>
      <View style={styles.infoGrid}>
        <InfoCell label="Questions" value={String(data.exam.questions.length)} />
        <InfoCell label="Time" value={`${data.exam.durationMinutes} min`} />
        <InfoCell label="Grade" value={data.exam.gradeLevel} />
        <InfoCell label="Attempts" value="1" />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Pressable disabled={isSubmitting} onPress={onStart} style={[styles.startButton, isSubmitting && styles.buttonDisabled]}>
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.startButtonText}>Start weekly exam</Text>}
      </Pressable>
      {data.history.length > 0 ? (
        <View style={styles.historyPanel}>
          <View style={styles.panelHeader}>
            <History color="#2563EB" size={19} />
            <Text style={styles.panelTitle}>Previous results</Text>
          </View>
          {data.history.slice(0, 4).map(item => (
            <View key={item.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyMeta}>{item.weekStart}</Text>
              </View>
              <Text style={styles.historyScore}>{Math.round(item.score)}%</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function ExamResults({
  data,
  onBack,
  onRetry,
  isLoading,
}: {
  data: WeeklyExamPayload;
  onBack: () => void;
  onRetry: () => void;
  isLoading: boolean;
}) {
  const attempt = data.attempt!;
  const answerMap = new Map(attempt.answers.map(answer => [answer.questionId, answer]));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.resultsContent}>
      <View style={styles.resultsHeader}>
        <Pressable accessibilityLabel="Back to homework" onPress={onBack} style={styles.iconButton}>
          <ArrowLeft color="#0F172A" size={22} />
        </Pressable>
        <Pressable accessibilityLabel="Refresh results" onPress={onRetry} style={styles.iconButton}>
          {isLoading ? <ActivityIndicator color="#2563EB" /> : <RefreshCw color="#2563EB" size={20} />}
        </Pressable>
      </View>
      <View style={styles.scorePanel}>
        <Trophy color="#F59E0B" size={42} />
        <Text style={styles.scoreValue}>{Math.round(attempt.score ?? 0)}%</Text>
        <Text style={styles.scoreTitle}>Weekly exam complete</Text>
        <Text style={styles.scoreMeta}>{attempt.correctCount} of {attempt.totalQuestions} correct</Text>
      </View>
      <Text style={styles.reviewHeading}>Answer review</Text>
      {data.exam.questions.map((question, index) => {
        const answer = answerMap.get(question.id);
        return (
          <View key={question.id} style={styles.reviewCard}>
            <View style={styles.reviewTitleRow}>
              {answer?.isCorrect ? <CheckCircle2 color="#16A34A" size={20} /> : <XCircle color="#DC2626" size={20} />}
              <Text style={styles.reviewNumber}>Question {index + 1} · {question.subjectName}</Text>
            </View>
            <Text style={styles.reviewQuestion}>{question.prompt}</Text>
            <AssessmentNarrationControls descriptorId={`weekly:${question.id}`} />
            <Text style={styles.reviewAnswer}>Your answer: {answer?.answer || 'No answer'}</Text>
            {!answer?.isCorrect ? <Text style={styles.correctAnswer}>Correct: {question.correctAnswer}</Text> : null}
            <Text style={styles.explanation}>{question.explanation}</Text>
            <AssessmentNarrationControls descriptorId={`weekly:${question.id}`} segment="explanation" />
          </View>
        );
      })}
    </ScrollView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoCell}><Text style={styles.infoValue}>{value}</Text><Text style={styles.infoLabel}>{label}</Text></View>;
}

function CenteredState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.centeredState}>
      {icon}
      <Text style={styles.centeredTitle}>{title}</Text>
      {message ? <Text style={styles.centeredMessage}>{message}</Text> : null}
      {actionLabel && onAction ? <Pressable onPress={onAction} style={styles.retryButton}><Text style={styles.retryButtonText}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8FAFC', flex: 1 },
  examHeader: { alignItems: 'center', backgroundColor: '#FFFFFF', flexDirection: 'row', gap: 10, padding: 14 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  headerMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  timer: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 999, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  timerUrgent: { backgroundColor: '#FEE2E2' },
  timerText: { color: '#1D4ED8', fontSize: 13, fontWeight: '900' },
  timerTextUrgent: { color: '#B91C1C' },
  progressTrack: { backgroundColor: '#E2E8F0', height: 8 },
  progressFill: { backgroundColor: '#2563EB', height: 8 },
  examContent: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 20, borderWidth: 1, margin: 18, padding: 18, paddingBottom: 22 },
  subjectLabel: { color: '#2563EB', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  questionText: { color: '#0F172A', fontSize: 24, fontWeight: '900', lineHeight: 32, marginTop: 10 },
  options: { gap: 12, marginTop: 22 },
  option: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 62, padding: 13 },
  optionSelected: { backgroundColor: '#EFF6FF', borderColor: '#2563EB', borderWidth: 2 },
  optionMarker: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  optionMarkerSelected: { backgroundColor: '#2563EB' },
  optionMarkerText: { color: '#475569', fontWeight: '900' },
  optionMarkerTextSelected: { color: '#FFFFFF' },
  optionText: { color: '#334155', flex: 1, fontSize: 15, lineHeight: 21 },
  optionTextSelected: { color: '#0F172A', fontWeight: '800' },
  examFooter: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 10, padding: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 16, flex: 1, justifyContent: 'center', minHeight: 52 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondaryButton: { alignItems: 'center', borderColor: '#CBD5E1', borderRadius: 16, borderWidth: 1, justifyContent: 'center', minHeight: 52, width: 112 },
  secondaryButtonText: { color: '#334155', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.45 },
  overviewContent: { gap: 16, padding: 18, paddingBottom: 36 },
  heroBand: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, padding: 24 },
  heroEyebrow: { color: '#FBBF24', fontSize: 12, fontWeight: '900', marginTop: 10, textTransform: 'uppercase' },
  heroTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4, textAlign: 'center' },
  heroText: { color: '#CBD5E1', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCell: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, padding: 14, width: '48%' },
  infoValue: { color: '#0F172A', fontSize: 18, fontWeight: '900' },
  infoLabel: { color: '#64748B', fontSize: 12, marginTop: 3 },
  startButton: { alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 8, justifyContent: 'center', minHeight: 54 },
  startButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  historyPanel: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, padding: 14 },
  panelHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  panelTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  historyRow: { alignItems: 'center', borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  historyTitle: { color: '#334155', fontSize: 14, fontWeight: '800' },
  historyMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  historyScore: { color: '#2563EB', fontSize: 18, fontWeight: '900' },
  resultsContent: { gap: 14, padding: 18, paddingBottom: 36 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  scorePanel: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 8, padding: 24 },
  scoreValue: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', marginTop: 8 },
  scoreTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  scoreMeta: { color: '#CBD5E1', fontSize: 14, marginTop: 4 },
  reviewHeading: { color: '#0F172A', fontSize: 20, fontWeight: '900', marginTop: 4 },
  reviewCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, padding: 14 },
  reviewTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  reviewNumber: { color: '#475569', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  reviewQuestion: { color: '#0F172A', fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: 10 },
  reviewAnswer: { color: '#475569', fontSize: 13, marginTop: 8 },
  correctAnswer: { color: '#15803D', fontSize: 13, fontWeight: '800', marginTop: 4 },
  explanation: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  centeredState: { alignItems: 'center', backgroundColor: '#F8FAFC', flex: 1, justifyContent: 'center', padding: 28 },
  centeredTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', marginTop: 12 },
  centeredMessage: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  retryButton: { backgroundColor: '#2563EB', borderRadius: 8, marginTop: 16, paddingHorizontal: 20, paddingVertical: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '900' },
});
