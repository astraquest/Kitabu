import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop, SvgUri } from 'react-native-svg';
import { AlertCircle, Award, BookOpen, Calculator, Frown, Globe, Meh, Star, TrendingUp, User, X } from 'lucide-react-native';

import { DEFAULT_GRADE } from '../constants/grades';
import { UserProfile } from '../types/app';

interface StudentDetailsModalProps {
  user: UserProfile;
  onClose: () => void;
  assessmentScore?: number;
}

type ActiveTab = 'performance' | 'profile';

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

export function StudentDetailsModal({ user, onClose, assessmentScore }: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('performance');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [isRemedial, setIsRemedial] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const bars = useRef(WEEKLY_STATS.map(() => new Animated.Value(0))).current;

  const score = assessmentScore ?? 75;
  const analysis = getPerformanceAnalysis(score);
  const displayedActivities = showAllActivities ? RECENT_ACTIVITY : RECENT_ACTIVITY.slice(0, 3);
  const avatarUri = getAvatarUri(user.avatar);
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
    setIsRemedial(false);
  }, [user.name, user.email, user.avatar, assessmentScore]);

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
              <Text style={s.headerTitle}>{activeTab === 'performance' ? 'Performance' : 'Student Profile'}</Text>
              <Text style={s.headerSub}>{activeTab === 'performance' ? 'Academic Analysis' : 'Personal Details'}</Text>
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
            <Pressable onPress={() => setIsRemedial(v => !v)} style={s.bottomItem}>
              <AlertCircle size={24} color={isRemedial ? '#DC2626' : '#9CA3AF'} />
              <Text style={[s.bottomText, isRemedial && s.remedialText]}>Remedial</Text>
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
  bottomBar: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row' },
  bottomItem: { flex: 1, alignItems: 'center', gap: 6 },
  bottomText: { color: '#9CA3AF', fontSize: 10, fontWeight: '800' },
  bottomTextActive: { color: '#2563EB' },
  remedialText: { color: '#DC2626' },
});
