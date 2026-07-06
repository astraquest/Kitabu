import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop, SvgUri } from 'react-native-svg';
import { Activity, AlertCircle, Award, BookOpen, Calculator, CheckCircle2, ClipboardList, Frown, Globe, Heart, Meh, Star, Target, TrendingUp, User, X } from 'lucide-react-native';

import { DEFAULT_GRADE } from '../constants/grades';
import { UserProfile } from '../types/app';
import {
  buildRemedialReport,
  generateRemedialReport,
  remedialAssignmentDraft,
  RemedialAssignmentPayload,
  RemedialReport,
} from './studentRemedialLogic';

interface StudentDetailsModalProps {
  user: UserProfile;
  onClose: () => void;
  assessmentScore?: number;
  onCreateRemedialAssignment?: (assignment: RemedialAssignmentPayload) => void;
}

type ActiveTab = 'performance' | 'remedial' | 'profile';
type RemedialStatus = 'idle' | 'running' | 'complete';

const RECENT_ACTIVITY = [
  { id: 1, title: 'Algebra Quiz', time: 'Today, 9:30 AM', score: 92, icon: Calculator },
  { id: 2, title: 'Biology Reading', time: 'Today, 8:15 AM', score: 75, icon: BookOpen },
  { id: 3, title: 'World War II Essay', time: 'Yesterday, 8:30 AM', score: 45, icon: Globe },
  { id: 4, title: 'Poetry Analysis', time: 'Yesterday, 8:30 AM', score: 88, icon: BookOpen },
  { id: 5, title: 'Geometry Test', time: '2 days ago', score: 85, icon: Calculator },
  { id: 6, title: 'Lab Report', time: '3 days ago', score: 90, icon: BookOpen },
];

const WEEKLY_STATS = [
  { day: 'Sun', val: 80, color: '#22C55E' },
  { day: 'Mon', val: 40, color: '#FBBF24' },
  { day: 'Tue', val: 90, color: '#22C55E' },
  { day: 'Wed', val: 65, color: '#22C55E' },
  { day: 'Thu', val: 70, color: '#22C55E' },
  { day: 'Fri', val: 30, color: '#EF4444' },
  { day: 'Sat', val: 85, color: '#22C55E' },
];

function getPerformanceAnalysis(score: number) {
  if (score >= 80) return { label: 'Exceeding Expectations', color: '#16A34A', Icon: Award };
  if (score >= 60) return { label: 'Meeting Expectations', color: '#2563EB', Icon: Star };
  if (score >= 40) return { label: 'Approaching Expectations', color: '#F97316', Icon: Meh };
  return { label: 'Below Expectations', color: '#EF4444', Icon: Frown };
}

function initials(name: string) {
  return name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
}

function isSvgUri(uri?: string) {
  return Boolean(uri && /\.svg(\?|$)/i.test(uri));
}

function getAvatarUri(value?: string) {
  if (!value) {
    return null;
  }

  if (value.startsWith('avatar-seed-')) {
    const normalizedSeed = value.replace(/^avatar-seed-/, '');
    return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(normalizedSeed)}`;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.replace('/svg?seed=', '/png?seed=').replace('/svg/', '/png/');
  }

  return `https://api.dicebear.com/7.x/adventurer/png?seed=${encodeURIComponent(value)}`;
}

export function StudentDetailsModal({
  user,
  onClose,
  assessmentScore,
  onCreateRemedialAssignment,
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('performance');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [remedialStatus, setRemedialStatus] = useState<RemedialStatus>('idle');
  const [remedialReport, setRemedialReport] = useState<RemedialReport | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const bars = useRef(WEEKLY_STATS.map(() => new Animated.Value(0))).current;

  const score = assessmentScore ?? 75;
  const analysis = getPerformanceAnalysis(score);
  const displayedActivities = showAllActivities ? RECENT_ACTIVITY : RECENT_ACTIVITY.slice(0, 3);
  const avatarUri = getAvatarUri(user.avatar);
  const report = remedialReport ?? buildRemedialReport(user);
  const details = useMemo(() => ({
    school: user.school || 'ABC High School',
    grade: user.grade || DEFAULT_GRADE,
    dateJoined: user.dateJoined || '2024-01-15',
    lastSeen: user.lastSeen || 'Today',
    assignmentsAttempted: 25,
    phone: user.phone || 'Not Set',
    email: user.email || 'student@example.com',
  }), [user]);

  useEffect(() => {
    progress.setValue(0);
    bars.forEach(bar => bar.setValue(0));
    Animated.parallel([
      Animated.timing(progress, { toValue: score, duration: 1000, useNativeDriver: false }),
      ...bars.map((bar, index) => Animated.timing(bar, { toValue: WEEKLY_STATS[index].val, duration: 1000, delay: index * 40, useNativeDriver: false })),
    ]).start();
  }, [bars, progress, score]);

  useEffect(() => {
    setActiveTab('performance');
    setShowAllActivities(false);
    setRemedialStatus('idle');
    setRemedialReport(null);
  }, [user.id, user.name, user.email, user.avatar, assessmentScore]);

  async function runRemedialAnalysis() {
    setActiveTab('remedial');
    setRemedialStatus('running');
    const result = await generateRemedialReport(user);
    setRemedialReport(result);
    setRemedialStatus('complete');
  }

  function createRemedialAssignment() {
    onCreateRemedialAssignment?.(remedialAssignmentDraft(user, report));
  }

  const gaugeOffset = progress.interpolate({
    inputRange: [0, 100],
    outputRange: [251.2, 0],
  });
  const AnimatedPath = Animated.createAnimatedComponent(Path);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.modal}>
          <View style={s.header}>
            <View>
              <Text style={s.headerTitle}>
                {activeTab === 'performance'
                  ? 'Performance'
                  : activeTab === 'remedial'
                    ? 'Remedial Report'
                    : 'Student Profile'}
              </Text>
              <Text style={s.headerSub}>
                {activeTab === 'performance'
                  ? 'Academic Analysis'
                  : activeTab === 'remedial'
                    ? `${user.name} - ${details.grade} - ${report.periodLabel}`
                    : 'Personal Details'}
              </Text>
            </View>
            <Pressable onPress={onClose} style={s.closeButton}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {activeTab === 'performance' ? (
              <>
                <View style={s.cardCenter}>
                  <Text style={s.sectionEyebrow}>Overall Performance</Text>
                  <View style={s.gaugeWrap}>
                    <Svg width="100%" height="100%" viewBox="0 0 200 110">
                      <Defs>
                        <SvgLinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#EF4444" />
                          <Stop offset="40%" stopColor="#F59E0B" />
                          <Stop offset="100%" stopColor="#22C55E" />
                        </SvgLinearGradient>
                      </Defs>
                      <Path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#F3F4F6" strokeWidth={20} strokeLinecap="round" />
                      <AnimatedPath d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGradient)" strokeWidth={20} strokeLinecap="round" strokeDasharray="251.2" strokeDashoffset={gaugeOffset} />
                    </Svg>
                    <View style={s.gaugeValueWrap}>
                      <Text style={s.gaugeValue}>{score}%</Text>
                    </View>
                  </View>
                  <View style={s.analysisRow}>
                    <analysis.Icon size={18} color={analysis.color} />
                    <Text style={[s.analysisText, { color: analysis.color }]}>{analysis.label}</Text>
                  </View>
                </View>

                <View style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>Recent Activity</Text>
                    <Pressable onPress={() => setShowAllActivities(v => !v)}>
                      <Text style={s.link}>{showAllActivities ? 'View Less' : 'View All'}</Text>
                    </Pressable>
                  </View>
                  <View style={s.activityList}>
                    {displayedActivities.map(item => {
                      const Icon = item.icon;
                      return (
                        <View key={item.id} style={s.activityRow}>
                          <View style={s.activityLead}>
                            <View style={s.activityIconWrap}>
                              <Icon size={16} color="#6B7280" />
                            </View>
                            <View>
                              <Text style={s.activityTitle}>{item.title}</Text>
                              <Text style={s.activityTime}>{item.time}</Text>
                            </View>
                          </View>
                          <Text style={[s.activityScore, item.score >= 80 ? s.goodText : s.normalText]}>{item.score}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                <View style={s.card}>
                  <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>Performance Trend</Text>
                    <Text style={s.trendMeta}>Last 7 Days</Text>
                  </View>
                  <View style={s.trendBars}>
                    {WEEKLY_STATS.map((stat, index) => (
                      <View key={stat.day} style={s.trendCol}>
                        <View style={s.trendTrack}>
                          <Animated.View style={[s.trendFill, { backgroundColor: stat.color, height: bars[index].interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
                        </View>
                        <Text style={s.trendLabel}>{stat.day}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            ) : activeTab === 'remedial' ? (
              remedialStatus === 'complete' ? (
                <View style={s.remedialStack}>
                  <View style={s.remedialStats}>
                    <RemedialStat
                      color="#2563EB"
                      icon={<Award size={18} color="#2563EB" />}
                      label="Mastery"
                      value={`${report.mastery}%`}
                    />
                    <RemedialStat
                      color="#EF4444"
                      icon={<X size={18} color="#EF4444" />}
                      label="Wrong"
                      value={String(report.wrongAnswers)}
                    />
                    <RemedialStat
                      color="#F97316"
                      icon={<AlertCircle size={18} color="#F97316" />}
                      label="Priority Gaps"
                      value={String(report.priorityGaps)}
                    />
                  </View>
                  <Text style={s.remedialSource}>{report.sourceLabel} - {report.periodLabel}</Text>

                  <View style={s.remedialReportCard}>
                    <View style={s.remedialCardIcon}>
                      <ClipboardList size={22} color="#2563EB" />
                    </View>
                    <View style={s.flex}>
                      <Text style={s.remedialCardTitle}>Diagnosis</Text>
                      <Text style={s.remedialBody}>{report.diagnosis}</Text>
                    </View>
                  </View>

                  <View style={s.card}>
                    <Text style={s.cardTitle}>Priority Gaps</Text>
                    <View style={s.gapList}>
                      {report.topAreas.map((area, index) => (
                        <View key={`${area.subject}-${area.subStrand}`} style={s.gapRow}>
                          <View style={[s.gapRank, index === 0 ? s.gapRankHigh : index === 1 ? s.gapRankWarn : s.gapRankOk]}>
                            <Text style={s.gapRankText}>{index + 1}</Text>
                          </View>
                          <View style={s.flex}>
                            <Text style={s.gapTitle}>{area.subStrand}</Text>
                            <Text style={s.gapMeta}>{area.subject}</Text>
                            <View style={s.gapTrack}>
                              <View style={[s.gapFill, { width: `${Math.max(38, Math.min(88, area.wrong * 16))}%` }]} />
                            </View>
                          </View>
                          <Text style={s.gapMissed}>{area.wrong} missed</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={s.remedialReportCard}>
                    <View style={[s.remedialCardIcon, s.remedialActionIcon]}>
                      <Target size={22} color="#0D9488" />
                    </View>
                    <View style={s.flex}>
                      <Text style={s.remedialCardTitle}>Recommended Action</Text>
                      <Text style={s.remedialBody}>
                        <Text style={s.remedialStrong}>{report.actionTitle}</Text>
                        {report.actionNote}
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    disabled={!onCreateRemedialAssignment}
                    onPress={createRemedialAssignment}
                    style={[s.assignmentButton, !onCreateRemedialAssignment && s.assignmentButtonDisabled]}>
                    <ClipboardList size={18} color="#FFFFFF" />
                    <Text style={s.assignmentButtonText}>Set Assignment</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[s.remedialRunCard, remedialStatus === 'running' && s.remedialRunCardActive]}>
                  <View style={s.remedialRunIcon}>
                    <Activity size={34} color="#2563EB" />
                  </View>
                  <Text style={s.remedialRunTitle}>Remedial</Text>
                  <Text style={s.remedialRunCopy}>
                    Scan this week's wrong answers across quizzes and assignments to build a focused remedial report.
                  </Text>
                  <Pressable
                    disabled={remedialStatus === 'running'}
                    onPress={runRemedialAnalysis}
                    style={[s.runAnalysisButton, remedialStatus === 'running' && s.runAnalysisButtonDisabled]}>
                    <Activity size={20} color="#FFFFFF" />
                    <Text style={s.runAnalysisText}>
                      {remedialStatus === 'running' ? 'Analyzing...' : 'Run Analysis'}
                    </Text>
                  </Pressable>
                  <View style={s.remedialChipRow}>
                    <View style={s.remedialChip}>
                      <ClipboardList size={16} color="#2563EB" />
                      <Text style={s.remedialChipText}>All quizzes</Text>
                    </View>
                    <View style={s.remedialChip}>
                      <CheckCircle2 size={16} color="#2563EB" />
                      <Text style={s.remedialChipText}>Assignments</Text>
                    </View>
                    <View style={s.remedialChip}>
                      <Target size={16} color="#2563EB" />
                      <Text style={s.remedialChipText}>Learning gaps</Text>
                    </View>
                  </View>
                </View>
              )
            ) : (
              <View style={s.profileStack}>
                <View style={s.profileHero}>
                  <View style={s.profileGradient} />
                  <View style={s.profileInner}>
                    <View style={s.avatarRing}>
                      {user.avatar ? (
                        isSvgUri(user.avatar) ? (
                          <SvgUri uri={user.avatar} width="100%" height="100%" />
                        ) : (
                          <Image source={{ uri: avatarUri || user.avatar }} style={s.avatarImage} resizeMode="cover" />
                        )
                      ) : avatarUri ? (
                        <Image source={{ uri: avatarUri }} style={s.avatarImage} resizeMode="cover" />
                      ) : (
                        <View style={s.avatarFallback}>
                          <Text style={s.avatarFallbackText}>{initials(user.name)}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={s.profileName}>{user.name}</Text>
                    <Text style={s.profileSchool}>{details.school}</Text>
                  </View>
                </View>

                <View style={s.card}>
                  <View style={s.profileSectionHeader}>
                    <User size={16} color="#3B82F6" />
                    <Text style={s.cardTitle}>Academic Info</Text>
                  </View>
                  <View style={s.infoList}>
                    {[
                      { label: 'Grade', value: details.grade },
                      { label: 'Date Joined', value: details.dateJoined },
                      { label: 'Last Active', value: details.lastSeen },
                      { label: 'Assignments', value: `${details.assignmentsAttempted} Completed` },
                    ].map(item => (
                      <View key={item.label} style={s.infoRow}>
                        <Text style={s.infoLabel}>{item.label}</Text>
                        <Text style={s.infoValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={s.card}>
                  <Text style={s.cardTitle}>Contact Details</Text>
                  <View style={s.contactGroup}>
                    <View>
                      <Text style={s.contactLabel}>Email</Text>
                      <Text style={s.contactValue}>{details.email}</Text>
                    </View>
                    <View>
                      <Text style={s.contactLabel}>Phone</Text>
                      <Text style={s.contactValue}>{details.phone}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={s.bottomBar}>
            <Pressable onPress={() => setActiveTab('performance')} style={s.bottomItem}>
              <TrendingUp size={24} color={activeTab === 'performance' ? '#2563EB' : '#9CA3AF'} />
              <Text style={[s.bottomText, activeTab === 'performance' && s.bottomTextActive]}>Dashboard</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('remedial')} style={s.bottomItem}>
              <Heart size={24} color={activeTab === 'remedial' ? '#0D9488' : '#9CA3AF'} />
              <Text style={[s.bottomText, activeTab === 'remedial' && s.remedialText]}>Remedial</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('profile')} style={s.bottomItem}>
              <User size={24} color={activeTab === 'profile' ? '#2563EB' : '#9CA3AF'} />
              <Text style={[s.bottomText, activeTab === 'profile' && s.bottomTextActive]}>Profile</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RemedialStat({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={s.remedialStat}>
      {icon}
      <Text style={[s.remedialStatValue, { color }]}>{value}</Text>
      <Text style={s.remedialStatLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', padding: 16 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modal: { backgroundColor: '#F8F9FA', borderRadius: 40, overflow: 'hidden', maxHeight: '90%' },
  header: { paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  headerSub: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginTop: 2 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F3F4F6' },
  cardCenter: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
  sectionEyebrow: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  gaugeWrap: { width: 192, height: 116, marginTop: 8, marginBottom: 6, justifyContent: 'flex-end' },
  gaugeValueWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  gaugeValue: { color: '#111827', fontSize: 40, fontWeight: '900', lineHeight: 42 },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  analysisText: { fontSize: 14, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  link: { color: '#2563EB', fontSize: 12, fontWeight: '800' },
  activityList: { marginTop: 16, gap: 16 },
  activityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activityLead: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  activityIconWrap: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  activityTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  activityTime: { color: '#9CA3AF', fontSize: 10, fontWeight: '500', marginTop: 2 },
  activityScore: { fontSize: 14, fontWeight: '800' },
  goodText: { color: '#16A34A' },
  normalText: { color: '#4B5563' },
  trendMeta: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 104, marginTop: 20 },
  trendCol: { flex: 1, alignItems: 'center', gap: 8 },
  trendTrack: { width: '100%', flex: 1, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'flex-end', overflow: 'hidden' },
  trendFill: { width: '100%', borderRadius: 10, opacity: 0.8 },
  trendLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800' },
  profileStack: { gap: 24, paddingTop: 8 },
  profileHero: { backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#F3F4F6', overflow: 'hidden', alignItems: 'center' },
  profileGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 96, backgroundColor: 'rgba(59,130,246,0.1)' },
  profileInner: { paddingTop: 24, paddingBottom: 24, alignItems: 'center', width: '100%' },
  avatarRing: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, borderColor: '#FFFFFF', backgroundColor: '#F3F4F6', overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB' },
  avatarFallbackText: { color: '#334155', fontSize: 28, fontWeight: '900' },
  profileName: { color: '#111827', fontSize: 22, fontWeight: '900', marginTop: 14 },
  profileSchool: { color: '#2563EB', fontSize: 12, fontWeight: '800', marginTop: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#DBEAFE', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  profileSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoList: { marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  infoLabel: { color: '#9CA3AF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { color: '#1F2937', fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  contactGroup: { gap: 14, marginTop: 16 },
  contactLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  contactValue: { color: '#1F2937', fontSize: 14, fontWeight: '500' },
  flex: { flex: 1 },
  remedialStack: { gap: 16 },
  remedialRunCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 24,
    borderWidth: 1,
    gap: 18,
    minHeight: 420,
    paddingHorizontal: 24,
    paddingVertical: 38,
  },
  remedialRunCardActive: {
    borderColor: '#BFDBFE',
  },
  remedialRunIcon: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 22,
    borderWidth: 1,
    height: 84,
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    width: 84,
  },
  remedialRunTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  remedialRunCopy: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 23,
    maxWidth: 300,
    textAlign: 'center',
  },
  runAnalysisButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 58,
    minWidth: 230,
    paddingHorizontal: 22,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
  },
  runAnalysisButtonDisabled: {
    backgroundColor: '#60A5FA',
  },
  runAnalysisText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  remedialChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 18,
  },
  remedialChip: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  remedialChipText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  remedialStats: {
    flexDirection: 'row',
    gap: 10,
  },
  remedialStat: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  remedialStatValue: {
    fontSize: 19,
    fontWeight: '900',
  },
  remedialStatLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  remedialSource: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  remedialReportCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 18,
  },
  remedialCardIcon: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  remedialActionIcon: {
    backgroundColor: '#ECFDF5',
  },
  remedialCardTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },
  remedialBody: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  remedialStrong: {
    color: '#111827',
    fontWeight: '900',
  },
  gapList: {
    gap: 14,
    marginTop: 16,
  },
  gapRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
  },
  gapRank: {
    alignItems: 'center',
    borderRadius: 14,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  gapRankHigh: { backgroundColor: '#FEE2E2' },
  gapRankWarn: { backgroundColor: '#FFEDD5' },
  gapRankOk: { backgroundColor: '#DCFCE7' },
  gapRankText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  gapTitle: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
  },
  gapMeta: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  gapTrack: {
    backgroundColor: '#EEF2F7',
    borderRadius: 999,
    height: 6,
    marginTop: 7,
    overflow: 'hidden',
  },
  gapFill: {
    backgroundColor: '#2563EB',
    borderRadius: 999,
    height: '100%',
  },
  gapMissed: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
  },
  assignmentButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    minHeight: 54,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
  },
  assignmentButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  assignmentButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  bottomBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row' },
  bottomItem: { flex: 1, alignItems: 'center', gap: 6 },
  bottomText: { color: '#9CA3AF', fontSize: 10, fontWeight: '800' },
  bottomTextActive: { color: '#2563EB' },
  remedialText: { color: '#DC2626' },
});
