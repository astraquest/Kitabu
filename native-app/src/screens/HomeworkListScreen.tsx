import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

type HomeworkFeedItem =
  | {
      type: 'assignment';
      id: string;
      dueAt: number;
      completed: boolean;
      assignment: Assignment;
    }
  | {
      type: 'review';
      id: string;
      dueAt: number;
      completed: false;
      review: DueReview;
    }
  | {
      type: 'exam';
      id: string;
      dueAt: number;
      completed: boolean;
      weeklyExam: WeeklyExamPayload;
    };

export function HomeworkListScreen({
  assignments,
  dueReviews,
  weeklyExam,
  onBack,
  onStartAssignment,
  onStartReview,
  onOpenWeeklyExam,
}: HomeworkListScreenProps) {
  const homeworkItems = useMemo<HomeworkFeedItem[]>(() => {
    const items: HomeworkFeedItem[] = [
      ...assignments.map(assignment => ({
        type: 'assignment' as const,
        id: `assignment-${assignment.id}`,
        dueAt: dueTime(assignment.dueDate),
        completed: assignment.status === 'completed',
        assignment,
      })),
      ...dueReviews.map(review => ({
        type: 'review' as const,
        id: `review-${review.id}`,
        dueAt: dueTime(review.nextReviewDate),
        completed: false as const,
        review,
      })),
    ];

    if (weeklyExam) {
      items.push({
        type: 'exam',
        id: `exam-${weeklyExam.exam.id}`,
        dueAt: dueTime(weeklyExam.exam.closesAt),
        completed: weeklyExam.attempt?.status === 'completed',
        weeklyExam,
      });
    }

    return items.sort((left, right) => {
      if (left.completed !== right.completed) {
        return left.completed ? 1 : -1;
      }

      return left.completed
        ? right.dueAt - left.dueAt
        : left.dueAt - right.dueAt;
    });
  }, [assignments, dueReviews, weeklyExam]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ChevronLeft color="#0B1F4D" size={22} strokeWidth={2.4} />
          </Pressable>
          <Text style={styles.headerTitle}>Homework</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {homeworkItems.map(item => {
          if (item.type === 'exam') {
            return (
              <WeeklyExamAssignmentCard
                key={item.id}
                weeklyExam={item.weeklyExam}
                onPress={onOpenWeeklyExam}
              />
            );
          }

          if (item.type === 'review') {
            return (
              <ReviewAssignmentCard
                key={item.id}
                review={item.review}
                onPress={() => onStartReview(item.review)}
              />
            );
          }

          const assignment = item.assignment;
          const config = getSubjectConfig(assignment.subject);
          const isCompleted = assignment.status === 'completed';
          const Icon = config.icon;

          return (
            <Pressable
              key={item.id}
              onPress={() => onStartAssignment(assignment)}
              style={({ pressed }) => [
                styles.assignmentCard,
                isCompleted && styles.assignmentCardCompleted,
                pressed && styles.assignmentCardPressed,
              ]}
            >
              {isCompleted ? <View style={styles.completedStrip} /> : null}

              <View style={styles.assignmentTopRow}>
                <View
                  style={[
                    styles.subjectBadge,
                    { backgroundColor: config.bg, borderColor: config.border },
                  ]}
                >
                  <Icon color={config.color} size={16} strokeWidth={2.2} />
                  <Text
                    style={[styles.subjectBadgeText, { color: config.color }]}
                  >
                    {assignment.subject}
                  </Text>
                </View>

                <View style={styles.statusWrap}>
                  {isCompleted ? (
                    <>
                      <CheckCircle2
                        color="#15803D"
                        size={14}
                        strokeWidth={2.4}
                      />
                      <Text style={styles.completedText}>Completed</Text>
                    </>
                  ) : (
                    <>
                      <Clock color="#6B7280" size={14} strokeWidth={2.4} />
                      <Text style={styles.pendingText}>
                        Due {assignment.dueDate}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <View>
                <Text
                  style={[
                    styles.assignmentTitle,
                    isCompleted && styles.assignmentTitleCompleted,
                  ]}
                >
                  {assignment.title}
                </Text>
                <Text style={styles.assignmentBody}>
                  {assignment.description}
                </Text>
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
                    <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.6} />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {homeworkItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <CheckCircle2 color="#9CA3AF" size={30} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyBody}>
              No homework has been assigned yet.
            </Text>
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
  const dueDate =
    weeklyExam.exam.closesAt.split('T')[0] || weeklyExam.exam.closesAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.assignmentCard,
        styles.examCard,
        isCompleted && styles.assignmentCardCompleted,
        pressed && styles.assignmentCardPressed,
      ]}
    >
      {isCompleted ? (
        <View style={styles.completedStrip} />
      ) : (
        <View style={styles.examStrip} />
      )}

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
              <Text style={styles.pendingText}>
                {isInProgress ? 'In progress' : `Due ${dueDate}`}
              </Text>
            </>
          )}
        </View>
      </View>

      <View>
        <Text
          style={[
            styles.assignmentTitle,
            isCompleted && styles.assignmentTitleCompleted,
          ]}
        >
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
            <Text style={styles.startText}>
              {isInProgress ? 'Continue Exam' : 'Start Exam'}
            </Text>
            <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.6} />
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
      ]}
    >
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
          Spaced review for {subject}. Complete a quick self-check to keep your
          mastery schedule accurate.
        </Text>
      </View>

      <View style={styles.assignmentFooter}>
        <Text style={styles.questionCount}>1 Review</Text>

        <View style={styles.startWrap}>
          <Text style={styles.startText}>Start Review</Text>
          <ChevronRight color="#FFFFFF" size={16} strokeWidth={2.6} />
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

function dueTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
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
      color: '#C2410C',
      bg: '#FFEDD5',
      border: '#FED7AA',
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
      color: '#15803D',
      bg: '#DCFCE7',
      border: '#BBF7D0',
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
    backgroundColor: '#F9FBFD',
    flex: 1,
  },
  header: {
    backgroundColor: '#F9FBFD',
    borderBottomColor: '#E3E8F1',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E3E8F1',
    borderRadius: 15,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    width: 42,
  },
  headerSpacer: {
    width: 42,
  },
  headerTitle: {
    color: '#0B1F4D',
    fontSize: 21,
    fontWeight: '900',
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 28,
  },
  assignmentCard: {
    backgroundColor: '#FFFBEC',
    borderColor: '#E5D7B3',
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 2,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#8A6C2E',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  assignmentCardCompleted: {
    backgroundColor: '#F2FBF5',
    borderColor: '#BDE7CB',
  },
  reviewCard: {
    borderColor: '#BFD7FF',
  },
  examCard: {
    borderColor: '#F4B84A',
  },
  assignmentCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.992 }],
  },
  completedStrip: {
    backgroundColor: '#22A45D',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  reviewStrip: {
    backgroundColor: '#4F7CE8',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  examStrip: {
    backgroundColor: '#FF8A24',
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
    color: '#18864A',
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    color: '#65738D',
    fontSize: 12,
    fontWeight: '700',
  },
  assignmentTitle: {
    color: '#0B1F4D',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 6,
  },
  assignmentTitleCompleted: {
    color: '#628071',
    textDecorationLine: 'line-through',
  },
  assignmentBody: {
    color: '#5F6F89',
    fontSize: 13,
    lineHeight: 18,
  },
  assignmentFooter: {
    alignItems: 'center',
    borderTopColor: '#EEE4CC',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  questionCount: {
    color: '#65738D',
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
    backgroundColor: '#FF6B1A',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  startText: {
    color: '#FFFFFF',
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
    backgroundColor: '#EAF5FF',
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    width: 64,
  },
  emptyTitle: {
    color: '#0B1F4D',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyBody: {
    color: '#65738D',
    fontSize: 14,
    fontWeight: '500',
  },
});
