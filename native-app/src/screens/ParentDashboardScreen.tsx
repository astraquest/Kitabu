import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  Link2,
  LogOut,
  MailPlus,
  Phone,
  RefreshCw,
  Trash2,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react-native';

import { ParentChildSummary } from '../types/app';

interface ParentDashboardScreenProps {
  children: ParentChildSummary[];
  selectedChildId: string | null;
  linkIdentifier: string;
  linkMethod: 'email' | 'phone';
  isLoading: boolean;
  isLinking: boolean;
  error: string | null;
  onSelectChild: (childId: string) => void;
  onLinkIdentifierChange: (value: string) => void;
  onLinkMethodChange: (method: 'email' | 'phone') => void;
  onLinkChild: () => void;
  onUnlinkChild: (childId: string) => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

export function ParentDashboardScreen({
  children,
  selectedChildId,
  linkIdentifier,
  linkMethod,
  isLoading,
  isLinking,
  error,
  onSelectChild,
  onLinkIdentifierChange,
  onLinkMethodChange,
  onLinkChild,
  onUnlinkChild,
  onRefresh,
  onSignOut,
}: ParentDashboardScreenProps) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'report'>('overview');
  const selectedChild = useMemo(
    () => children.find(child => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  );
  const childCountLabel =
    children.length === 1 ? '1 linked child' : `${children.length} linked children`;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Parent dashboard</Text>
          <Text style={styles.title}>Children</Text>
          <Text style={styles.headerMeta}>{childCountLabel}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Refresh dashboard" onPress={onRefresh} style={styles.iconButton}>
            {isLoading ? (
              <ActivityIndicator color="#2563EB" />
            ) : (
              <RefreshCw color="#2563EB" size={20} strokeWidth={2.5} />
            )}
          </Pressable>
          <Pressable accessibilityLabel="Sign out" onPress={onSignOut} style={styles.iconButton}>
            <LogOut color="#475569" size={20} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.linkPanel}>
          <View style={styles.linkHeader}>
            {linkMethod === 'email' ? (
              <MailPlus color="#2563EB" size={20} strokeWidth={2.4} />
            ) : (
              <Phone color="#2563EB" size={20} strokeWidth={2.4} />
            )}
            <Text style={styles.panelTitle}>Add a child</Text>
          </View>
          <View style={styles.methodRow}>
            {(['email', 'phone'] as const).map(method => (
              <Pressable
                key={method}
                onPress={() => onLinkMethodChange(method)}
                style={[styles.methodButton, linkMethod === method && styles.methodButtonActive]}>
                <Text style={[styles.methodText, linkMethod === method && styles.methodTextActive]}>
                  {method === 'email' ? 'Email' : 'Phone'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.linkRow}>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={linkMethod === 'email' ? 'email-address' : 'phone-pad'}
              onChangeText={onLinkIdentifierChange}
              placeholder={linkMethod === 'email' ? 'Student email' : 'Student phone'}
              placeholderTextColor="#94A3B8"
              style={styles.input}
              value={linkIdentifier}
            />
            <Pressable
              disabled={isLinking || !linkIdentifier.trim()}
              onPress={onLinkChild}
              style={[
                styles.linkButton,
                (isLinking || !linkIdentifier.trim()) && styles.disabledButton,
              ]}>
              {isLinking ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Link2 color="#FFFFFF" size={18} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {children.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childTabs}>
            {children.map(child => {
              const active = child.id === selectedChild?.id;
              return (
                <Pressable
                  key={child.id}
                  onPress={() => onSelectChild(child.id)}
                  style={[styles.childTab, active && styles.childTabActive]}>
                  <Text style={[styles.childTabName, active && styles.childTabNameActive]}>
                    {child.name}
                  </Text>
                  <Text style={[styles.childTabMeta, active && styles.childTabMetaActive]}>
                    {child.grade}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {selectedChild ? (
          <View style={styles.viewTabs}>
            {(['overview', 'report'] as const).map(view => (
              <Pressable
                key={view}
                onPress={() => setActiveView(view)}
                style={[styles.viewTab, activeView === view && styles.viewTabActive]}>
                <Text style={[styles.viewTabText, activeView === view && styles.viewTabTextActive]}>
                  {view === 'overview' ? 'Overview' : 'Weekly report'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isLoading && children.length === 0 ? (
          <View style={styles.emptyPanel}>
            <ActivityIndicator color="#2563EB" />
            <Text style={styles.emptyTitle}>Loading children</Text>
            <Text style={styles.emptyText}>Fetching the latest learning statistics.</Text>
          </View>
        ) : error && children.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Dashboard unavailable</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <Pressable onPress={onRefresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : !selectedChild ? (
          <View style={styles.emptyPanel}>
            <Users color="#64748B" size={32} strokeWidth={2.3} />
            <Text style={styles.emptyTitle}>No children linked yet</Text>
            <Text style={styles.emptyText}>
              Add a verified student by email or phone to view learning progress, homework, diagnostics, and review load.
            </Text>
          </View>
        ) : activeView === 'report' ? (
          <WeeklyReport child={selectedChild} />
        ) : (
          <>
            <View style={styles.childHero}>
              <View>
                <Text style={styles.childName}>{selectedChild.name}</Text>
                <Text style={styles.childMeta}>
                  {selectedChild.grade}
                  {selectedChild.school ? ` - ${selectedChild.school}` : ''}
                </Text>
                <Text style={styles.childMeta}>Last active: {selectedChild.last_active}</Text>
              </View>
              <Pressable
                onPress={() =>
                  confirmRemoveId === selectedChild.id
                    ? onUnlinkChild(selectedChild.id)
                    : setConfirmRemoveId(selectedChild.id)
                }
                style={styles.removeButton}>
                <Trash2 color="#DC2626" size={17} strokeWidth={2.4} />
                <Text style={styles.removeButtonText}>
                  {confirmRemoveId === selectedChild.id ? 'Confirm' : 'Remove'}
                </Text>
              </Pressable>
            </View>

            <View style={styles.statsGrid}>
              <StatCard
                label="Assessment"
                value={formatPercentStat(selectedChild.assessment_average, hasAssessmentData(selectedChild))}
                tone="#2563EB"
              />
              <StatCard
                label="Homework"
                value={formatPercentStat(selectedChild.homework_completion, hasHomeworkData(selectedChild))}
                tone="#16A34A"
              />
              <StatCard
                label="Mastery"
                value={formatPercentStat(selectedChild.mastery_average, hasMasteryData(selectedChild))}
                tone="#9333EA"
              />
              <StatCard label="Due reviews" value={String(selectedChild.due_reviews)} tone="#EA580C" />
            </View>

            <View style={styles.panel}>
              <View style={styles.linkHeader}>
                <BookOpenCheck color="#2563EB" size={20} strokeWidth={2.4} />
                <Text style={styles.panelTitle}>Learning progress</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        selectedChild.total_lessons > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (selectedChild.completed_lessons / selectedChild.total_lessons) * 100,
                              ),
                            )
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.panelText}>
                {selectedChild.completed_lessons} of {selectedChild.total_lessons} lessons completed
              </Text>
              <Text style={styles.panelText}>
                Diagnostic:{' '}
                {selectedChild.diagnostic.completed
                  ? `${selectedChild.diagnostic.percentage ?? 0}%`
                  : 'not completed'}
              </Text>
            </View>

            <View style={styles.panel}>
              <View style={styles.linkHeader}>
                <BarChart3 color="#2563EB" size={20} strokeWidth={2.4} />
                <Text style={styles.panelTitle}>Recent assignments</Text>
              </View>
              {selectedChild.recent_assignments.length > 0 ? (
                selectedChild.recent_assignments.map(assignment => (
                  <View key={assignment.id} style={styles.assignmentRow}>
                    <View style={styles.assignmentText}>
                      <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                      <Text style={styles.assignmentMeta}>{assignment.subject}</Text>
                    </View>
                    <View style={styles.assignmentScore}>
                      <Text style={styles.assignmentStatus}>{assignment.status}</Text>
                      <Text style={styles.assignmentScoreText}>
                        {assignment.score === null ? '-' : `${assignment.score}%`}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.panelText}>No assignments yet.</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function WeeklyReport({ child }: { child: ParentChildSummary }) {
  const report = child.weekly_report;
  const hasTrendActivity = child.weekly_trends.some(
    item => item.lessonsCompleted > 0 || item.assignmentsCompleted > 0 || item.assessmentAverage > 0,
  );
  const maxActivity = Math.max(
    1,
    ...child.weekly_trends.map(item => item.lessonsCompleted + item.assignmentsCompleted),
  );
  return (
    <>
      <View style={styles.reportHero}>
        <View style={styles.linkHeader}>
          <CalendarDays color="#60A5FA" size={20} />
          <Text style={styles.reportHeroTitle}>This week for {child.name.split(' ')[0]}</Text>
        </View>
        <Text style={styles.reportHeroText}>
          {report.activeDays} active days · {report.lessonsCompleted} lessons ·{' '}
          {report.assignmentsCompleted} assignments
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <StatCard
          label="Assessment"
          value={formatPercentStat(report.assessmentAverage, hasTrendActivity)}
          tone="#2563EB"
        />
        <StatCard
          label="Weekly exam"
          value={report.weeklyExamScore === null ? 'No data' : `${report.weeklyExamScore}%`}
          tone="#7C3AED"
        />
      </View>

      <View style={styles.panel}>
        <View style={styles.linkHeader}>
          <TrendingUp color="#2563EB" size={20} />
          <Text style={styles.panelTitle}>Six-week activity</Text>
        </View>
        {hasTrendActivity ? (
          <View style={styles.trendChart}>
            {child.weekly_trends.map(item => {
              const total = item.lessonsCompleted + item.assignmentsCompleted;
              return (
                <View key={item.weekStart} style={styles.trendColumn}>
                  <View style={styles.trendBarTrack}>
                    <View
                      style={[
                        styles.trendBar,
                        { height: `${Math.max(6, (total / maxActivity) * 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.trendValue}>{total}</Text>
                  <Text style={styles.trendLabel}>{item.weekStart.slice(5)}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.panelText}>Weekly activity appears after lessons, assignments, or exams are completed.</Text>
        )}
      </View>

      <ReportList
        icon={<TrendingUp color="#16A34A" size={19} />}
        title="Strengths"
        items={report.strengths}
        empty="Strengths will appear as learning data grows."
        tone="success"
      />
      <ReportList
        icon={<Target color="#EA580C" size={19} />}
        title="Focus next"
        items={report.focusAreas}
        empty="No urgent focus areas this week."
        tone="focus"
      />
    </>
  );
}

function ReportList({
  icon,
  title,
  items,
  empty,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  empty: string;
  tone: 'success' | 'focus';
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.linkHeader}>
        {icon}
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {(items.length > 0 ? items : [empty]).map(item => (
        <View key={item} style={styles.reportListRow}>
          <View
            style={[
              styles.reportDot,
              tone === 'success' ? styles.reportDotSuccess : styles.reportDotFocus,
            ]}
          />
          <Text style={styles.reportListText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function hasAssessmentData(child: ParentChildSummary) {
  return child.recent_assignments.some(assignment => assignment.score !== null);
}

function hasHomeworkData(child: ParentChildSummary) {
  return child.recent_assignments.length > 0;
}

function hasMasteryData(child: ParentChildSummary) {
  return child.mastery_average > 0 || child.weekly_report.strengths.length > 0 || child.weekly_report.focusAreas.length > 0;
}

function formatPercentStat(value: number, hasData: boolean) {
  return hasData ? `${value}%` : 'No data';
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F8FAFC', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  eyebrow: { color: '#2563EB', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '900', marginTop: 2 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerMeta: { color: '#64748B', fontSize: 12, fontWeight: '800', marginTop: 2 },
  content: { gap: 16, padding: 16, paddingBottom: 28 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodButton: {
    alignItems: 'center',
    borderColor: '#CBD5E1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 9,
  },
  methodButtonActive: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  methodText: { color: '#64748B', fontSize: 13, fontWeight: '800' },
  methodTextActive: { color: '#1D4ED8' },
  viewTabs: { backgroundColor: '#E2E8F0', borderRadius: 8, flexDirection: 'row', padding: 3 },
  viewTab: { alignItems: 'center', borderRadius: 6, flex: 1, paddingVertical: 10 },
  viewTabActive: { backgroundColor: '#FFFFFF' },
  viewTabText: { color: '#64748B', fontSize: 13, fontWeight: '800' },
  viewTabTextActive: { color: '#0F172A' },
  linkPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  linkHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  panelTitle: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  linkRow: { flexDirection: 'row', gap: 10 },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0F172A',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    width: 52,
  },
  disabledButton: { opacity: 0.55 },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '800', marginTop: 10 },
  childTabs: { gap: 10, paddingRight: 8 },
  childTab: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 132,
    padding: 12,
  },
  childTabActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  childTabName: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  childTabNameActive: { color: '#FFFFFF' },
  childTabMeta: { color: '#64748B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  childTabMetaActive: { color: '#DBEAFE' },
  emptyPanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
  },
  emptyTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', marginTop: 12 },
  emptyText: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: 'center' },
  retryButton: { backgroundColor: '#2563EB', borderRadius: 8, marginTop: 14, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  childHero: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  childName: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  childMeta: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', marginTop: 4 },
  removeButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    height: 38,
    paddingHorizontal: 10,
  },
  removeButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    width: '48.4%',
  },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', marginTop: 4 },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  progressTrack: { backgroundColor: '#E2E8F0', borderRadius: 999, height: 10, overflow: 'hidden' },
  progressFill: { backgroundColor: '#2563EB', height: '100%' },
  panelText: { color: '#475569', fontSize: 14, fontWeight: '700', lineHeight: 21, marginTop: 10 },
  reportHero: { backgroundColor: '#0F172A', borderRadius: 8, padding: 18 },
  reportHeroTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  reportHeroText: { color: '#CBD5E1', fontSize: 14, lineHeight: 21, marginTop: 6 },
  trendChart: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 150, paddingTop: 8 },
  trendColumn: { alignItems: 'center', flex: 1 },
  trendBarTrack: { backgroundColor: '#EFF6FF', height: 96, justifyContent: 'flex-end', overflow: 'hidden', width: 24 },
  trendBar: { backgroundColor: '#2563EB', width: '100%' },
  trendValue: { color: '#334155', fontSize: 11, fontWeight: '900', marginTop: 4 },
  trendLabel: { color: '#94A3B8', fontSize: 9, marginTop: 2 },
  reportListRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9, marginTop: 9 },
  reportListText: { color: '#475569', flex: 1, fontSize: 13, lineHeight: 19 },
  reportDot: { borderRadius: 4, height: 8, marginTop: 6, width: 8 },
  reportDotSuccess: { backgroundColor: '#16A34A' },
  reportDotFocus: { backgroundColor: '#EA580C' },
  assignmentRow: {
    alignItems: 'center',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  assignmentText: { flex: 1, paddingRight: 12 },
  assignmentTitle: { color: '#0F172A', fontSize: 14, fontWeight: '900' },
  assignmentMeta: { color: '#64748B', fontSize: 12, fontWeight: '700', marginTop: 2 },
  assignmentScore: { alignItems: 'flex-end' },
  assignmentStatus: { color: '#64748B', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  assignmentScoreText: { color: '#0F172A', fontSize: 16, fontWeight: '900', marginTop: 2 },
});
