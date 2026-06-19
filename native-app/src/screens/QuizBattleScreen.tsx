import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, Swords, Trophy, Zap } from 'lucide-react-native';

interface QuizBattleScreenProps {
  onBack: () => void;
  onAddPoints: (points: number) => void;
}

const QUESTIONS = [
  {
    id: 'q1',
    subject: 'Mathematics',
    prompt: 'What is 12 x 8?',
    options: ['86', '92', '96', '108'],
    answer: '96',
  },
  {
    id: 'q2',
    subject: 'English',
    prompt: 'Choose the correct plural of “child”.',
    options: ['childs', 'children', 'childes', 'childrens'],
    answer: 'children',
  },
  {
    id: 'q3',
    subject: 'Science',
    prompt: 'Which organ pumps blood around the body?',
    options: ['Lungs', 'Heart', 'Kidney', 'Stomach'],
    answer: 'Heart',
  },
  {
    id: 'q4',
    subject: 'Kiswahili',
    prompt: '“Kitabu” in English means:',
    options: ['Desk', 'Book', 'School', 'Pen'],
    answer: 'Book',
  },
];

export function QuizBattleScreen({ onBack, onAddPoints }: QuizBattleScreenProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);
  const current = QUESTIONS[index];

  const score = useMemo(
    () => QUESTIONS.filter(question => answers[question.id] === question.answer).length,
    [answers],
  );
  const opponentScore = Math.min(QUESTIONS.length, Math.max(1, Math.floor(QUESTIONS.length * 0.65)));
  const won = score >= opponentScore;

  function choose(option: string) {
    setAnswers(previous => ({ ...previous, [current.id]: option }));
  }

  function continueBattle() {
    if (index < QUESTIONS.length - 1) {
      setIndex(value => value + 1);
      return;
    }
    setIsComplete(true);
    onAddPoints(won ? 25 : 10);
  }

  if (isComplete) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to game zone" onPress={onBack} style={styles.iconButton}>
            <ArrowLeft color="#0F172A" size={22} />
          </Pressable>
        </View>
        <View style={styles.resultHero}>
          <Trophy color="#FBBF24" size={44} />
          <Text style={styles.resultTitle}>{won ? 'Battle won' : 'Battle complete'}</Text>
          <Text style={styles.resultScore}>You {score} - {opponentScore} Rival</Text>
          <Text style={styles.resultText}>
            {won ? 'Clean work. Your reward has been added.' : 'You earned practice points. Try again to beat the rival score.'}
          </Text>
        </View>
        <View style={styles.reviewList}>
          {QUESTIONS.map(question => {
            const selected = answers[question.id];
            const correct = selected === question.answer;
            return (
              <View key={question.id} style={styles.reviewCard}>
                <Text style={styles.reviewSubject}>{question.subject}</Text>
                <Text style={styles.reviewPrompt}>{question.prompt}</Text>
                <Text style={[styles.reviewAnswer, correct ? styles.good : styles.bad]}>
                  {correct ? 'Correct' : `Correct answer: ${question.answer}`}
                </Text>
              </View>
            );
          })}
        </View>
        <Pressable onPress={onBack} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Return to Game Zone</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const selected = answers[current.id];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to game zone" onPress={onBack} style={styles.iconButton}>
          <ArrowLeft color="#0F172A" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Quiz Battle</Text>
          <Text style={styles.title}>Beat the rival</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <ScorePill label="You" value={String(score)} />
        <View style={styles.versus}>
          <Swords color="#FFFFFF" size={20} />
        </View>
        <ScorePill label="Rival" value={String(Math.min(opponentScore, index + 1))} />
      </View>

      <View style={styles.questionCard}>
        <View style={styles.questionTop}>
          <Text style={styles.questionMeta}>Question {index + 1} of {QUESTIONS.length}</Text>
          <Text style={styles.subject}>{current.subject}</Text>
        </View>
        <Text style={styles.prompt}>{current.prompt}</Text>
        <View style={styles.options}>
          {current.options.map((option, optionIndex) => {
            const isSelected = selected === option;
            return (
              <Pressable
                key={option}
                onPress={() => choose(option)}
                style={[styles.option, isSelected && styles.optionSelected]}>
                <View style={[styles.optionMarker, isSelected && styles.optionMarkerSelected]}>
                  <Text style={[styles.optionMarkerText, isSelected && styles.optionMarkerTextSelected]}>
                    {String.fromCharCode(65 + optionIndex)}
                  </Text>
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        disabled={!selected}
        onPress={continueBattle}
        style={[styles.primaryButton, !selected && styles.disabled]}>
        <Zap color="#FFFFFF" size={18} />
        <Text style={styles.primaryButtonText}>
          {index < QUESTIONS.length - 1 ? 'Lock answer' : 'Finish battle'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ScorePill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.scorePill}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8FAFC', flex: 1 },
  content: { gap: 16, padding: 18, paddingBottom: 36 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#7C3AED', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 25, fontWeight: '900', marginTop: 2 },
  scoreRow: { alignItems: 'center', flexDirection: 'row', gap: 10, justifyContent: 'center' },
  scorePill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  scoreValue: { color: '#0F172A', fontSize: 26, fontWeight: '900' },
  scoreLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  versus: { alignItems: 'center', backgroundColor: '#7C3AED', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  questionCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 20, borderWidth: 1, padding: 18 },
  questionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  questionMeta: { color: '#64748B', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  subject: { color: '#2563EB', fontSize: 12, fontWeight: '900' },
  prompt: { color: '#0F172A', fontSize: 24, fontWeight: '900', lineHeight: 32, marginTop: 18 },
  options: { gap: 12, marginTop: 22 },
  option: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 62, padding: 13 },
  optionSelected: { backgroundColor: '#EDE9FE', borderColor: '#7C3AED', borderWidth: 2 },
  optionMarker: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  optionMarkerSelected: { backgroundColor: '#7C3AED' },
  optionMarkerText: { color: '#475569', fontSize: 14, fontWeight: '900' },
  optionMarkerTextSelected: { color: '#FFFFFF' },
  optionText: { color: '#334155', flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  optionTextSelected: { color: '#4C1D95' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.45 },
  resultHero: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 20, padding: 24 },
  resultTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginTop: 12 },
  resultScore: { color: '#FBBF24', fontSize: 18, fontWeight: '900', marginTop: 6 },
  resultText: { color: '#CBD5E1', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  reviewList: { gap: 10 },
  reviewCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, padding: 14 },
  reviewSubject: { color: '#2563EB', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  reviewPrompt: { color: '#0F172A', fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: 8 },
  reviewAnswer: { fontSize: 13, fontWeight: '900', marginTop: 8 },
  good: { color: '#15803D' },
  bad: { color: '#B91C1C' },
});
