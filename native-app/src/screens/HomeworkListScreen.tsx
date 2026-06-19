import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Beaker,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Globe,
  Languages,
  RotateCcw,
} from 'lucide-react-native';

import { Assignment, DueReview, WeeklyExamPayload } from '../types/app';

interface HomeworkListScreenProps {
  assignments: Assignment[];
  dueReviews: DueReview[];
  weeklyExam: WeeklyExamPayload | null;
  onBack: () => void;
  onStartAssignment: (assignment: Assignment) => void;
  onStartReview: (review: DueReview) => void;
  onOpenWeeklyExam: () => void;
}

export function HomeworkListScreen({
  assignments,
  dueReviews,
  weeklyExam,
  onBack,
  onStartAssignment,
  onStartReview,
  onOpenWeeklyExam,
}: HomeworkListScreenProps) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const pendingAssignmentCount = assignments.filter(item => item.status === 'pending').length;
  const hasPendingWeeklyExam = Boolean(weeklyExam && weeklyExam.attempt?.status !== 'completed');
  const pendingCount = pendingAssignmentCount + dueReviews.length + (hasPendingWeeklyExam ? 1 : 0);

  const filteredAssignments = useMemo(() => {
    return [...assignments]
      .filter(item => (filter === 'all' ? true : item.status === filter))
      .sort((left, right) => {
        if (left.status === right.status) {
          return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
        }

        return left.status === 'pending' ? -1 : 1;
      });
  }, [assignments, filter]);
  const visibleReviews = filter === 'completed' ? [] : dueReviews;
  const showWeeklyExam =
    weeklyExam &&
    ((filter === 'completed' && weeklyExam.attempt?.status === 'completed') ||
      (filter !== 'completed' && weeklyExam.attempt?.status !== 'completed'));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft color="#1D4ED8" size={22} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.headerTitle}>Homework</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.filterBar}>
          <FilterChip
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterChip
            label={`Pending (${pendingCount})`}
            active={filter === 'pending'}
            onPress={() => setFilter('pending')}
          />
          <FilterChip
            label="Done"
            active={filter === 'completed'}
            onPress={() => setFilter('completed')}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {showWeeklyExam ? (
          <WeeklyExamAssignmentCard
            weeklyExam={weeklyExam}
            onPress={onOpenWeeklyExam}
          />
        ) : null}

        {visibleReviews.length > 0 ? (
          visibleReviews.map(review => (
            <ReviewAssignmentCard
              key={review.id}
              review={review}
              onPress={() => onStartReview(review)}
            />
          ))
        ) : null}

        {filteredAssignments.length > 0 ? (
          filteredAssignments.map(assignment => {
            const config = getSubjectConfig(assignment.subject);
            const isCompleted = assignment.status === 'completed';
            const Icon = config.icon;

            return (
              <Pressable
                key={assignment.id}
                onPress={() => onStartAssignment(assignment)}
                style={({ pressed }) => [
                  styles.assignmentCard,
                  pressed && styles.assignmentCardPressed,
                ]}>
                {isCompleted ? <View style={styles.completedStrip} /> : null}

                <View style={styles.assignmentTopRow}>
                  <View
                    style={[
                      styles.subjectBadge,
                      { backgroundColor: config.bg, borderColor: config.border },
                    ]}>
                    <Icon color={config.color} size={16} strokeWidth={2.2} />
                    <Text style={[styles.subjectBadgeText, { color: config.color }]}>
                      {assignment.subject}
                    </Text>
                  </View>

                  <View style={styles.statusWrap}>
                    {isCompleted ? (
                      <>
                        <CheckCircle2 color="#15803D" size={14} strokeWidth={2.4} />
                        <Text style={styles.completedText}>Completed</Text>
                      </>
                    ) : (
                      <>
                        <Clock color="#6B7280" size={14} strokeWidth={2.4} />
                        <Text style={styles.pendingText}>Due {assignment.dueDate}</Text>
                      </>
                    )}
                  </View>
                </View>

                <View>
                  <Text
                    style={[
                      styles.assignmentTitle,
                      isCompleted && styles.assignmentTitleCompleted,
                    ]}>
                    {assignment.title}
                  </Text>
                  <Text style={styles.assignmentBody}>{assignment.description}</Text>
                </View>

                <View style={styles.assignmentFooter}>
                  <Text style={styles.questionCount}>
                    {assignment.questions.length} Questions
                  </Text>

                  {isCompleted ? (
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeText}>
                        Score: {assignment.score}%
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.startWrap}>
                      <Text style={styles.startText}>Start Assignment</Text>
                      <ChevronRight color="#1D4ED8" size={16} strokeWidth={2.6} />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        ) : null}

        {!showWeeklyExam && visibleReviews.length === 0 && filteredAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 color="#9CA3AF" size={30} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyBody}>No homework found in this filter.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function WeeklyExamAssignmentCard({
  weeklyExam,
  onPress,
}: {
  weeklyExam: WeeklyExamPayload;
  onPress: () => void;
}) {
  const status = weeklyExam.attempt?.status ?? 'pending';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const dueDate = weeklyExam.exam.closesAt.split('T')[0] || weeklyExam.exam.closesAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.assignmentCard,
        styles.examCard,
        pressed && styles.assignmentCardPressed,
      ]}>
      {isCompleted ? <View style={styles.completedStrip} /> : <View style={styles.examStrip} />}

      <View style={styles.assignmentTopRow}>
        <View style={styles.examBadge}>
          <GraduationCap color="#92400E" size={16} strokeWidth={2.4} />
          <Text style={styles.examBadgeText}>Weekly Exam</Text>
        </View>

        <View style={styles.statusWrap}>
          {isCompleted ? (
            <>
              <CheckCircle2 color="#15803D" size={14} strokeWidth={2.4} />
              <Text style={styles.completedText}>Completed</Text>
            </>
          ) : (
            <>
              <Clock color="#6B7280" size={14} strokeWidth={2.4} />
              <Text style={styles.pendingText}>{isInProgress ? 'In progress' : `Due ${dueDate}`}</Text>
            </>
          )}
        </View>
      </View>

      <View>
        <Text
          style={[
            styles.assignmentTitle,
            isCompleted && styles.assignmentTitleCompleted,
          ]}>
          {weeklyExam.exam.title}
        </Text>
        <Text style={styles.assignmentBody}>
          A timed weekly check across your current subjects.
        </Text>
      </View>

      <View style={styles.assignmentFooter}>
        <Text style={styles.questionCount}>
          {weeklyExam.exam.questions.length} Questions
        </Text>

        {isCompleted ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreBadgeText}>
              Score: {Math.round(weeklyExam.attempt?.score ?? 0)}%
            </Text>
          </View>
        ) : (
          <View style={styles.startWrap}>
            <Text style={styles.startText}>{isInProgress ? 'Continue Exam' : 'Start Exam'}</Text>
            <ChevronRight color="#1D4ED8" size={16} strokeWidth={2.6} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

function ReviewAssignmentCard({
  review,
  onPress,
}: {
  review: DueReview;
  onPress: () => void;
}) {
  const subject = formatReviewLabel(review.subjectId);
  const title = formatReviewLabel(review.subStrandKey);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.assignmentCard,
        styles.reviewCard,
        pressed && styles.assignmentCardPressed,
      ]}>
      <View style={styles.reviewStrip} />

      <View style={styles.assignmentTopRow}>
        <View style={styles.reviewBadge}>
          <RotateCcw color="#1D4ED8" size={16} strokeWidth={2.4} />
          <Text style={styles.reviewBadgeText}>Review Due</Text>
        </View>

        <View style={styles.statusWrap}>
          <Clock color="#6B7280" size={14} strokeWidth={2.4} />
          <Text style={styles.pendingText}>Due {review.nextReviewDate}</Text>
        </View>
      </View>

      <View>
        <Text style={styles.assignmentTitle}>{title}</Text>
        <Text style={styles.assignmentBody}>
          Spaced review for {subject}. Complete a quick self-check to keep your mastery schedule accurate.
        </Text>
      </View>

      <View style={styles.assignmentFooter}>
        <Text style={styles.questionCount}>1 Review</Text>

        <View style={styles.startWrap}>
          <Text style={styles.startText}>Start Review</Text>
          <ChevronRight color="#1D4ED8" size={16} strokeWidth={2.6} />
        </View>
      </View>
    </Pressable>
  );
}

function formatReviewLabel(value: string) {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.filterChipPressed,
      ]}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function getSubjectConfig(subject: string) {
  const normalized = subject.toLowerCase();

  if (normalized.includes('math')) {
    return {
      color: '#1D4ED8',
      bg: '#DBEAFE',
      border: '#BFDBFE',
      icon: Calculator,
    };
  }

  if (normalized.includes('science')) {
    return {
      color: '#047857',
      bg: '#D1FAE5',
      border: '#A7F3D0',
      icon: Beaker,
    };
  }

  if (normalized.includes('english')) {
    return {
      color: '#BE185D',
      bg: '#FCE7F3',
      border: '#FBCFE8',
      icon: BookOpen,
    };
  }

  if (normalized.includes('social')) {
    return {
      color: '#C2410C',
      bg: '#FFEDD5',
      border: '#FED7AA',
      icon: Globe,
    };
  }

  if (normalized.includes('kiswahili')) {
    return {
      color: '#6D28D9',
      bg: '#F3E8FF',
      border: '#DDD6FE',
      icon: Languages,
    };
  }

  return {
    color: '#374151',
    bg: '#F3F4F6',
    border: '#E5E7EB',
    icon: BookOpen,
  };
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F2F2F7',
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomColor: 'rgba(229,231,235,0.8)',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  backButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  filterBar: {
    backgroundColor: 'rgba(118,118,128,0.15)',
    borderRadius: 10,
    flexDirection: 'row',
    padding: 2,
  },
  filterChip: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  filterChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  filterChipPressed: {
    opacity: 0.85,
  },
  filterChipText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#111827',
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
  reviewCard: {
    borderColor: '#BFDBFE',
  },
  examCard: {
    borderColor: '#FCD34D',
  },
  assignmentCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  completedStrip: {
    backgroundColor: '#22C55E',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  reviewStrip: {
    backgroundColor: '#2563EB',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  examStrip: {
    backgroundColor: '#F59E0B',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  assignmentTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subjectBadge: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subjectBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  reviewBadge: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reviewBadgeText: {
    color: '#1D4ED8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  examBadge: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  examBadgeText: {
    color: '#92400E',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  completedText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  assignmentTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  assignmentTitleCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  assignmentBody: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 18,
  },
  assignmentFooter: {
    alignItems: 'center',
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  questionCount: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '800',
  },
  startWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  startText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    width: 64,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyBody: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});
