import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Lock,
} from 'lucide-react-native';

import { LearningStrand, SubStrand } from '../types/app';

interface LetsLearnListScreenProps {
  strands: LearningStrand[];
  subjectName: string;
  grade: string;
  onBack: () => void;
  onSelectSubStrand: (subStrand: SubStrand) => void;
}

export function LetsLearnListScreen({
  strands,
  subjectName,
  grade,
  onBack,
  onSelectSubStrand,
}: LetsLearnListScreenProps) {
  const [expandedStrands, setExpandedStrands] = useState<Record<string, boolean>>(() =>
    buildExpandedState(strands),
  );

  useEffect(() => {
    setExpandedStrands(buildExpandedState(strands));
  }, [strands]);

  const strandRows = useMemo(
    () =>
      strands.map((strand, index) => ({
        strand,
        index,
        completedCount: strand.subStrands.filter(sub => sub.isCompleted).length,
        isExpanded: expandedStrands[strand.id] ?? true,
      })),
    [expandedStrands, strands],
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowLeft color="#FFFFFF" size={22} strokeWidth={2.4} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Let&apos;s Learn</Text>
            <Text style={styles.headerSubtitle}>
              {subjectName} - {grade.replace('Grade ', '')}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {strandRows.length > 0 ? (
          strandRows.map(({ strand, index, completedCount, isExpanded }) => (
            <View key={strand.id} style={styles.strandShell}>
              <View style={styles.strandAccent} />
              <View style={styles.strandCard}>
                <Pressable
                  onPress={() =>
                    setExpandedStrands(prev => ({
                      ...prev,
                      [strand.id]: !isExpanded,
                    }))
                  }
                  style={styles.strandHeader}>
                  <View style={styles.strandLead}>
                    <View style={styles.iconBadge}>
                      <BookOpen color="#FFFFFF" size={22} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.strandTitle}>
                      {strand.title.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.strandMeta}>
                    <View style={styles.countPill}>
                      <Text style={styles.countPillText}>
                        {strand.subStrands.length} sub-strands
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp color="#9CA3AF" size={20} strokeWidth={2.4} />
                    ) : (
                      <ChevronDown color="#9CA3AF" size={20} strokeWidth={2.4} />
                    )}
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.subStrandRail}>
                    {strand.subStrands.map((sub, subIndex) => (
                      <SubStrandCard
                        key={sub.id}
                        sub={sub}
                        isFirst={subIndex === 0}
                        isLast={subIndex === strand.subStrands.length - 1}
                        onSelect={onSelectSubStrand}
                      />
                    ))}

                    {strand.subStrands.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyCardText}>
                          This strand does not have sub-strands yet.
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryText}>
                    {completedCount} of {strand.subStrands.length} completed
                  </Text>
                  <Text style={styles.summaryText}>Strand {strand.number || index + 1}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <BookOpen color="#D1D5DB" size={52} strokeWidth={1.8} />
            <Text style={styles.emptyTitle}>No curriculum yet</Text>
            <Text style={styles.emptyBody}>
              This subject does not have learning strands available yet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function buildExpandedState(strands: LearningStrand[]) {
  return strands.reduce<Record<string, boolean>>((state, strand) => {
    state[strand.id] = true;
    return state;
  }, {});
}

function SubStrandCard({
  sub,
  isFirst,
  isLast,
  onSelect,
}: {
  sub: SubStrand;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (subStrand: SubStrand) => void;
}) {
  const isLocked = sub.isLocked;
  const isCompleted = sub.isCompleted;
  const needsRemediation = Boolean(sub.needsRemediation);
  const isActive = !isLocked && !isCompleted;
  const prompt =
    sub.outcomes?.[0]?.text ||
    sub.description ||
    'Proceed to explore this lesson.';

  return (
    <View style={styles.subShell}>
      {!isLast ? <View style={styles.subConnector} /> : null}
      <View style={styles.subTopRow}>
        <View style={styles.statusDots}>
          {isCompleted ? (
            <CheckCircle2 color="#4F7CE8" size={22} strokeWidth={2.2} />
          ) : (
            <Circle color="#4F7CE8" size={22} strokeWidth={2.2} />
          )}
          <Lock color="#A3A3A3" size={18} strokeWidth={2.2} />
          <Lock color="#A3A3A3" size={18} strokeWidth={2.2} />
        </View>

        <View style={styles.subCollapseChip}>
          {isFirst ? (
            <ChevronUp color="#A1A1AA" size={18} strokeWidth={2.4} />
          ) : (
            <ChevronDown color="#A1A1AA" size={18} strokeWidth={2.4} />
          )}
        </View>
      </View>

      <Text style={[styles.subTitle, isLocked && styles.subTitleMuted]}>
        {sub.number ? `${sub.number} ` : ''}
        {sub.title}
      </Text>

      <View style={styles.sectionLabelRow}>
        <BookOpen color="#4F7CE8" size={18} strokeWidth={2.2} />
        <Text style={styles.sectionLabel}>Learning Outcomes</Text>
      </View>

      <View
        style={[
          styles.outcomeCard,
          isLocked && styles.outcomeCardLocked,
          isActive && styles.outcomeCardActive,
          needsRemediation && styles.outcomeCardRemediation,
        ]}>
        <View style={styles.outcomeAccent} />
        <View style={styles.outcomeBody}>
          {isLocked ? (
            <View style={styles.lockedPill}>
              <Text style={styles.lockedPillText}>Locked</Text>
            </View>
          ) : null}

          {needsRemediation ? (
            <View style={styles.remediationBanner}>
              <Text style={styles.remediationTitle}>Practice recommended</Text>
              <Text style={styles.remediationText}>
                Your best score is {Math.round(sub.masteryScore ?? 0)}%. Reach 70% to unlock the next topic.
              </Text>
            </View>
          ) : null}

          <Text style={[styles.outcomeText, isLocked && styles.outcomeTextMuted]}>
            {isLocked ? sub.unlockReason || `${sub.title} is locked.` : prompt}
          </Text>

          <View style={styles.topicPill}>
            <Text style={styles.topicPillText}>{sub.type}</Text>
          </View>

          {!isLocked ? (
            <Pressable
              onPress={() => onSelect(sub)}
              style={({ pressed }) => [
                styles.proceedButton,
                isCompleted && styles.reviewButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.proceedButtonText}>
                {isCompleted ? 'Review' : needsRemediation ? 'Practice again' : 'Proceed'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#4EB6A5',
  },
  header: {
    backgroundColor: '#479C8E',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 86,
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 4,
  },
  headerSpacer: {
    minWidth: 86,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 36,
    gap: 18,
  },
  strandShell: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  strandAccent: {
    width: 6,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    backgroundColor: '#4F7CE8',
  },
  strandCard: {
    flex: 1,
    backgroundColor: '#EDF3F3',
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#D8DFE0',
    padding: 18,
    gap: 16,
  },
  strandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  strandLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strandTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  strandMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countPill: {
    backgroundColor: '#F4F6F7',
    borderWidth: 1,
    borderColor: '#D6DDDF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countPillText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  subStrandRail: {
    gap: 16,
    paddingLeft: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#4F7CE8',
  },
  subShell: {
    position: 'relative',
    backgroundColor: '#F7F7F7',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    padding: 18,
    gap: 14,
  },
  subConnector: {
    position: 'absolute',
    left: -21,
    top: 24,
    bottom: -18,
    width: 3,
    backgroundColor: '#D4D4D8',
  },
  subTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subCollapseChip: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 34,
  },
  subTitleMuted: {
    color: '#6B7280',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionLabel: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
  },
  outcomeCard: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADADA',
    overflow: 'hidden',
  },
  outcomeCardActive: {
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  outcomeCardLocked: {
    backgroundColor: '#F8F8F8',
  },
  outcomeCardRemediation: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  remediationBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  remediationTitle: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '900',
  },
  remediationText: {
    color: '#A16207',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  outcomeAccent: {
    width: 6,
    backgroundColor: '#F97316',
  },
  outcomeBody: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  lockedPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECECEC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  lockedPillText: {
    color: '#7C7C7C',
    fontSize: 14,
    fontWeight: '700',
  },
  outcomeText: {
    color: '#1F2937',
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '500',
  },
  outcomeTextMuted: {
    color: '#7A7A7A',
  },
  topicPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  topicPillText: {
    color: '#5B5FD6',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  proceedButton: {
    backgroundColor: '#4F7CE8',
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButton: {
    backgroundColor: '#0F766E',
  },
  proceedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 320,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },
  emptyCardText: {
    color: '#6B7280',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
