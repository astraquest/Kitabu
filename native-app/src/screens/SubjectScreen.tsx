import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Lock,
} from 'lucide-react-native';

import { LearningStrand, Subject } from '../types/app';

interface SubjectScreenProps {
  subject: Subject;
  strands: LearningStrand[];
  currentStrandIndex: number;
  hasStudied: boolean;
  isBrainTeaseComplete: boolean;
  isLoading: boolean;
  onPrevStrand: () => void;
  onNextStrand: () => void;
  onStartLearning: () => void;
  onStartBrainTease: () => void;
  onTakeQuiz: () => void;
  onBack: () => void;
}

export function SubjectScreen({
  subject,
  strands,
  currentStrandIndex,
  hasStudied,
  isBrainTeaseComplete,
  isLoading,
  onPrevStrand,
  onNextStrand,
  onStartLearning,
  onStartBrainTease,
  onTakeQuiz,
  onBack,
}: SubjectScreenProps) {
  const currentStrand = strands[currentStrandIndex];
  const totalStrands = strands.length;

  return (
    <LinearGradient
      colors={[subject.colorFrom, subject.colorTo || subject.colorFrom]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerButton}>
          <ChevronLeft color="#FFFFFF" size={24} strokeWidth={2.4} />
        </Pressable>
        <Text style={styles.headerTitle}>{subject.name.toUpperCase()}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.featuredCard}>
          <View style={styles.featuredNavRow}>
            <Pressable
              onPress={onPrevStrand}
              disabled={currentStrandIndex === 0}
              style={[
                styles.strandNavButton,
                currentStrandIndex === 0 && styles.strandNavButtonDisabled,
              ]}>
              <ChevronLeft color="#FFFFFF" size={16} strokeWidth={2.8} />
            </Pressable>

            <Text style={styles.featuredMeta}>
              Strand {Math.min(currentStrandIndex + 1, Math.max(totalStrands, 1))} of{' '}
              {Math.max(totalStrands, 1)}
            </Text>

            <Pressable
              onPress={onNextStrand}
              disabled={currentStrandIndex === totalStrands - 1 || totalStrands <= 1}
              style={[
                styles.strandNavButton,
                (currentStrandIndex === totalStrands - 1 || totalStrands <= 1) &&
                  styles.strandNavButtonDisabled,
              ]}>
              <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.8} />
            </Pressable>
          </View>

          <View style={styles.featuredCenterCard}>
            <Text style={styles.featuredCenterTitle}>
              {currentStrand ? currentStrand.title : 'No Strands Available'}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={getProgressBarStyle(currentStrandIndex, totalStrands)} />
          </View>
        </View>

        <ActionCard
          title={isBrainTeaseComplete ? 'Brain Tease Completed' : 'Brain Tease'}
          body={
            isBrainTeaseComplete
              ? 'New challenge unlocks with next topic'
              : 'Warm up your mind with quick exercises'
          }
          accent="#16A34A"
          icon={
            isBrainTeaseComplete ? (
              <CheckCircle color="#9CA3AF" size={24} strokeWidth={2.4} />
            ) : (
              <Brain color="#16A34A" size={24} strokeWidth={2.4} />
            )
          }
          actionLabel={isBrainTeaseComplete ? 'Completed' : 'Start Practice'}
          disabled={isBrainTeaseComplete}
          completed={isBrainTeaseComplete}
          onPress={onStartBrainTease}
        />

        <ActionCard
          title="Let's Learn"
          body="Master the concepts with interactive lessons"
          accent="#2563EB"
          icon={
            isBrainTeaseComplete ? (
              <BookOpen color="#2563EB" size={24} strokeWidth={2.4} />
            ) : (
              <Lock color="#9CA3AF" size={20} strokeWidth={2.4} />
            )
          }
          actionLabel={
            isBrainTeaseComplete
              ? 'View Curriculum'
              : 'Unlock by playing Brain Tease'
          }
          disabled={!isBrainTeaseComplete}
          onPress={onStartLearning}
        />

        <ActionCard
          title="Take Quiz"
          body="Check your understanding with a quiz"
          accent="#9333EA"
          icon={
            hasStudied ? (
              <ClipboardList color="#9333EA" size={24} strokeWidth={2.4} />
            ) : (
              <Lock color="#9CA3AF" size={20} strokeWidth={2.4} />
            )
          }
          actionLabel={
            isLoading
              ? 'Generating Quiz...'
              : hasStudied
                ? 'Start Quiz'
                : 'Unlock by finishing a Lesson'
          }
          disabled={!hasStudied || isLoading}
          loading={isLoading}
          onPress={onTakeQuiz}
        />
      </ScrollView>
    </LinearGradient>
  );
}

function getProgressBarStyle(currentStrandIndex: number, totalStrands: number) {
  return [
    styles.progressBar,
    {
      width:
        totalStrands > 0
          ? (`${((currentStrandIndex + 1) / totalStrands) * 100}%` as const)
          : ('0%' as const),
    },
  ];
}

function getActionDecorStyle(accent: string, completed?: boolean) {
  return [
    styles.actionDecor,
    completed ? styles.actionDecorCompleted : { backgroundColor: `${accent}18` },
  ];
}

function getActionIconWrapStyle(accent: string, completed?: boolean, disabled?: boolean) {
  return [
    styles.actionIconWrap,
    completed
      ? styles.actionIconCompleted
      : disabled
        ? styles.actionIconDisabled
        : { backgroundColor: `${accent}18` },
  ];
}

function getActionButtonStyle(accent: string, completed?: boolean, disabled?: boolean) {
  return [
    styles.actionButton,
    completed
      ? styles.actionButtonCompleted
      : disabled
        ? styles.actionButtonDisabled
        : { backgroundColor: accent },
  ];
}

function ActionCard({
  title,
  body,
  accent,
  icon,
  actionLabel,
  disabled,
  completed,
  loading,
  onPress,
}: {
  title: string;
  body: string;
  accent: string;
  icon: React.ReactNode;
  actionLabel: string;
  disabled: boolean;
  completed?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.actionCard, disabled && !completed && styles.actionCardDisabled]}>
      <View
        style={getActionDecorStyle(accent, completed)}
      />

      <View style={styles.actionHeader}>
        <View style={styles.actionHeadLeft}>
          <View
            style={getActionIconWrapStyle(accent, completed, disabled)}>
            {icon}
          </View>
          <View style={styles.actionTextWrap}>
            <Text
              style={[
                styles.actionTitle,
                (disabled || completed) && styles.actionTitleMuted,
              ]}>
              {title}
            </Text>
            <Text style={styles.actionBody}>{body}</Text>
          </View>
        </View>
        {!completed && !disabled ? (
          <ChevronRight color="#D1D5DB" size={20} strokeWidth={2.4} />
        ) : null}
      </View>

      <Pressable
        onPress={completed ? undefined : onPress}
        disabled={disabled || completed}
        style={({ pressed }) => [
          ...getActionButtonStyle(accent, completed, disabled),
          pressed && !disabled && !completed && styles.actionButtonPressed,
        ]}>
        {loading ? (
          <View style={styles.buttonInline}>
            <Loader2 color="#FFFFFF" size={16} strokeWidth={2.4} />
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </View>
        ) : completed ? (
          <View style={styles.buttonInline}>
            <Text style={styles.actionButtonTextCompleted}>{actionLabel}</Text>
            <CheckCircle color="#9CA3AF" size={16} strokeWidth={2.4} />
          </View>
        ) : disabled ? (
          <View style={styles.buttonInline}>
            <Lock color="#6B7280" size={14} strokeWidth={2.4} />
            <Text style={styles.actionButtonTextDisabled}>{actionLabel}</Text>
          </View>
        ) : (
          <View style={styles.buttonInline}>
            <Text style={styles.actionButtonText}>{actionLabel}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerButton: {
    borderRadius: 999,
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.92,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    gap: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  featuredCard: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  featuredNavRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  strandNavButton: {
    borderRadius: 999,
    padding: 4,
  },
  strandNavButtonDisabled: {
    opacity: 0.3,
  },
  featuredMeta: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.92,
  },
  featuredCenterCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    marginBottom: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featuredCenterTitle: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTrack: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
  },
  progressBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: '100%',
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  actionCardDisabled: {
    opacity: 0.9,
  },
  actionDecor: {
    borderBottomLeftRadius: 999,
    height: 80,
    position: 'absolute',
    right: -34,
    top: -22,
    width: 80,
  },
  actionDecorCompleted: {
    backgroundColor: '#E5E7EB',
  },
  actionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionHeadLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  actionIconCompleted: {
    backgroundColor: '#F3F4F6',
  },
  actionIconDisabled: {
    backgroundColor: '#E5E7EB',
  },
  actionTextWrap: {
    flexShrink: 1,
    paddingTop: 1,
  },
  actionTitle: {
    color: '#1F2937',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionTitleMuted: {
    color: '#6B7280',
  },
  actionBody: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  actionButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#D1D5DB',
    borderWidth: 1,
  },
  actionButtonCompleted: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  buttonInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonTextDisabled: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '800',
  },
  actionButtonTextCompleted: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '800',
  },
});
