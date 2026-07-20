import React from 'react';
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
  RotateCcw,
  Target,
  XCircle,
} from 'lucide-react-native';

import { DueReview } from '../types/app';

interface ReviewSessionScreenProps {
  review: DueReview | null;
  error: string | null;
  isSubmitting: boolean;
  onBack: () => void;
  onComplete: (passed: boolean) => Promise<void>;
}

function formatReviewTitle(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSubject(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ReviewSessionScreen({
  review,
  error,
  isSubmitting,
  onBack,
  onComplete,
}: ReviewSessionScreenProps) {
  if (!review) {
    return (
      <View style={styles.centered}>
        <XCircle color="#DC2626" size={34} />
        <Text style={styles.centeredTitle}>Review unavailable</Text>
        <Text style={styles.centeredText}>This review is no longer due.</Text>
        <Pressable onPress={onBack} style={styles.centeredButton}>
          <Text style={styles.centeredButtonText}>Back to homework</Text>
        </Pressable>
      </View>
    );
  }

  const masteryPercent = Math.round(review.masteryScore * 100);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back to homework" onPress={onBack} style={styles.iconButton}>
          <ArrowLeft color="#0F172A" size={22} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>Spaced review</Text>
          <Text style={styles.title}>{formatReviewTitle(review.subStrandKey)}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <RotateCcw color="#2563EB" size={28} />
        </View>
        <Text style={styles.heroTitle}>Can you still explain this?</Text>
        <Text style={styles.heroText}>
          Spend a minute recalling the main idea before you mark the review. Honest answers keep your practice schedule useful.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <Stat label="Subject" value={formatSubject(review.subjectId)} />
        <Stat label="Mastery" value={`${masteryPercent}%`} />
        <Stat label="Interval" value={`${review.intervalDays} days`} />
        <Stat label="Due" value={review.nextReviewDate} />
      </View>

      <View style={styles.promptCard}>
        <View style={styles.promptHeader}>
          <Target color="#15803D" size={20} />
          <Text style={styles.promptTitle}>Quick self-check</Text>
        </View>
        <Text style={styles.promptText}>
          Say the idea out loud, write one example, or solve one related question. Then choose the result below.
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          disabled={isSubmitting}
          onPress={() => onComplete(true)}
          style={[styles.primaryAction, isSubmitting && styles.disabled]}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <CheckCircle2 color="#FFFFFF" size={20} />
              <Text style={styles.primaryActionText}>I remembered it</Text>
            </>
          )}
        </Pressable>
        <Pressable
          disabled={isSubmitting}
          onPress={() => onComplete(false)}
          style={[styles.secondaryAction, isSubmitting && styles.disabled]}>
          <RotateCcw color="#1D4ED8" size={20} />
          <Text style={styles.secondaryActionText}>Needs more practice</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerText: { flex: 1 },
  eyebrow: { color: '#2563EB', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '900', lineHeight: 30, marginTop: 2 },
  hero: { backgroundColor: '#0F172A', borderRadius: 8, padding: 22 },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 18,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 16 },
  heroText: { color: '#CBD5E1', fontSize: 14, lineHeight: 21, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    width: '48%',
  },
  statValue: { color: '#0F172A', fontSize: 17, fontWeight: '900' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  promptCard: { backgroundColor: '#FFFFFF', borderColor: '#DCFCE7', borderRadius: 8, borderWidth: 1, padding: 16 },
  promptHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  promptTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  promptText: { color: '#475569', fontSize: 14, lineHeight: 21, marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  actions: { gap: 10 },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 54,
  },
  secondaryActionText: { color: '#1D4ED8', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  centered: { alignItems: 'center', backgroundColor: '#F8FAFC', flex: 1, justifyContent: 'center', padding: 28 },
  centeredTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', marginTop: 12 },
  centeredText: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' },
  centeredButton: { backgroundColor: '#2563EB', borderRadius: 8, marginTop: 16, paddingHorizontal: 20, paddingVertical: 12 },
  centeredButtonText: { color: '#FFFFFF', fontWeight: '900' },
});
