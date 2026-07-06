import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileBarChart,
  HelpCircle,
  Home,
  Link2,
  LockKeyhole,
  MessageCircle,
  MessageSquareText,
  Settings,
  Shield,
  ShieldCheck,
  Target,
  Trash2,
  WalletCards,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

import { ParentChildAssignment, ParentChildSummary } from '../types/app';
import {
  getParentTeacherMessages,
  sendParentTeacherMessage,
} from '../services/parentService';
import { TeacherParentMessage } from '../services/teacherService';

interface ParentDashboardScreenProps {
  children: ParentChildSummary[];
  selectedChildId: string | null;
  parentName?: string;
  linkIdentifier: string;
  linkMethod: 'email' | 'phone';
  isLoading: boolean;
  isLinking: boolean;
  error: string | null;
  focusModeActive: boolean;
  focusModeSetupRequired: boolean;
  focusModeError: string | null;
  focusModeSecondsRemaining: number;
  dailyLimitSeconds: number;
  isStartingFocusMode: boolean;
  onSelectChild: (childId: string) => void;
  onLinkIdentifierChange: (value: string) => void;
  onLinkMethodChange: (method: 'email' | 'phone') => void;
  onLinkChild: () => void;
  onUnlinkChild: (childId: string) => void;
  onStartFocusMode: () => void;
  onOpenFocusModeSettings: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

type DashboardTab = 'home' | 'report' | 'messages';

export function ParentDashboardScreen({
  children,
  selectedChildId,
  parentName,
  linkIdentifier,
  linkMethod,
  isLoading,
  isLinking,
  error,
  focusModeActive,
  focusModeSetupRequired,
  focusModeError,
  focusModeSecondsRemaining,
  dailyLimitSeconds,
  isStartingFocusMode,
  onSelectChild,
  onLinkIdentifierChange,
  onLinkMethodChange,
  onLinkChild,
  onUnlinkChild,
  onStartFocusMode,
  onOpenFocusModeSettings,
  onRefresh,
  onSignOut,
}: ParentDashboardScreenProps) {
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<DashboardTab>('home');
  const [teacherMessages, setTeacherMessages] = useState<TeacherParentMessage[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const selectedChild = useMemo(
    () => children.find(child => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  );
  const childCountLabel =
    children.length === 1 ? '1 linked child' : `${children.length} linked children`;
  const selectedChildFirstName = getFirstName(selectedChild?.name || 'your child');
  const parentFirstName = getFirstName(parentName || 'Parent');
  const score = selectedChild ? getOverallScore(selectedChild) : 0;
  const teacherThreads = useMemo(() => {
    const byTeacher = new Map<string, TeacherParentMessage>();
    teacherMessages.forEach(message => {
      if (!byTeacher.has(message.teacher_user_id)) {
        byTeacher.set(message.teacher_user_id, message);
      }
    });
    return Array.from(byTeacher.values());
  }, [teacherMessages]);
  const activeTeacherId = selectedTeacherId || teacherThreads[0]?.teacher_user_id || null;
  const activeThreadMessages = teacherMessages.filter(
    message => !activeTeacherId || message.teacher_user_id === activeTeacherId,
  );

  async function loadParentMessages() {
    setIsLoadingMessages(true);
    setMessageError(null);
    try {
      const messages = await getParentTeacherMessages();
      setTeacherMessages(messages);
      if (!selectedTeacherId && messages[0]) {
        setSelectedTeacherId(messages[0].teacher_user_id);
      }
    } catch (requestError) {
      console.error('Error loading parent messages:', requestError);
      setMessageError('Could not load teacher messages right now.');
    } finally {
      setIsLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (activeView === 'messages') {
      loadParentMessages();
    }
  }, [activeView]);

  async function sendParentMessage() {
    const body = messageDraft.trim();
    if (!body || !activeTeacherId) {
      return;
    }
    setIsSendingMessage(true);
    setMessageError(null);
    try {
      await sendParentTeacherMessage({ teacherUserId: activeTeacherId, body });
      setMessageDraft('');
      await loadParentMessages();
    } catch (requestError) {
      console.error('Error sending parent message:', requestError);
      setMessageError('Could not send this message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.phoneShell}>
        {Platform.OS === 'web' ? <StatusChrome /> : null}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          <View style={styles.topBar}>
            <BrandLogo />
            <View style={styles.topActions}>
              <Pressable
                accessibilityLabel="Refresh dashboard"
                onLongPress={onSignOut}
                onPress={onRefresh}
                style={styles.bellButton}>
                {isLoading ? (
                  <ActivityIndicator color="#FF4B10" size="small" />
                ) : (
                  <>
                <Bell color="#101014" size={28} strokeWidth={2.5} />
                <View style={styles.notificationDot} />
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.greetingRow}>
            <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={1} style={styles.greeting}>
              Good afternoon, {parentFirstName} 👋
            </Text>
            {selectedChild ? (
              <Pressable accessibilityLabel="Selected child" style={styles.childSelector}>
                <MiniStudentAvatar />
                <Text numberOfLines={1} style={styles.childSelectorText}>
                  {selectedChild.name} - {selectedChild.grade}
                </Text>
                <ChevronDown color="#101014" size={18} strokeWidth={2.7} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.subtitle}>Here is {selectedChildFirstName}'s learning update today.</Text>

          {children.length > 1 && selectedChild ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childTabs}>
              {children.map(child => {
                const active = child.id === selectedChild.id;
                const pendingRemoval = confirmRemoveId === child.id;
                return (
                  <View key={child.id} style={[styles.childTab, active && styles.childTabActive]}>
                    <Pressable onPress={() => onSelectChild(child.id)} style={styles.childTabMain}>
                      <Text style={[styles.childTabName, active && styles.childTabNameActive]}>
                        {child.name}
                      </Text>
                      <Text style={[styles.childTabMeta, active && styles.childTabMetaActive]}>
                        {child.grade}
                      </Text>
                    </Pressable>
                    {active ? (
                      <Pressable
                        onPress={() =>
                          pendingRemoval ? onUnlinkChild(child.id) : setConfirmRemoveId(child.id)
                        }
                        style={styles.childRemoveButton}>
                        <Trash2 color="#DC2626" size={14} strokeWidth={2.4} />
                        <Text style={styles.childRemoveText}>{pendingRemoval ? 'Confirm' : 'Remove'}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          ) : null}

          {isLoading && children.length === 0 ? (
            <EmptyState
              title="Loading children"
              body="Fetching the latest learning statistics."
              isLoading
            />
          ) : error && children.length === 0 ? (
            <EmptyState
              title="Dashboard unavailable"
              body={error}
              actionLabel="Try again"
              onAction={onRefresh}
            />
          ) : !selectedChild ? (
            <AddChildPanel
              error={error}
              isLinking={isLinking}
              linkIdentifier={linkIdentifier}
              linkMethod={linkMethod}
              onLinkChild={onLinkChild}
              onLinkIdentifierChange={onLinkIdentifierChange}
              onLinkMethodChange={onLinkMethodChange}
            />
          ) : activeView === 'report' ? (
            <WeeklyReport child={selectedChild} onBack={() => setActiveView('home')} />
          ) : activeView === 'messages' ? (
            <ParentMessagesView
              activeTeacherId={activeTeacherId}
              draft={messageDraft}
              error={messageError}
              isLoading={isLoadingMessages}
              isSending={isSendingMessage}
              messages={activeThreadMessages}
              teachers={teacherThreads}
              onBack={() => setActiveView('home')}
              onChangeDraft={setMessageDraft}
              onSelectTeacher={setSelectedTeacherId}
              onSend={sendParentMessage}
            />
          ) : (
            <>
              <HeroCard child={selectedChild} score={score} />

              <QuickActions
                isStartingFocusMode={isStartingFocusMode}
                onLockPhone={onStartFocusMode}
                onMessages={() => setActiveView('messages')}
                onViewReport={() => setActiveView('report')}
              />

              {focusModeActive || focusModeSetupRequired || focusModeError ? (
                <FocusModeNotice
                  active={focusModeActive}
                  setupRequired={focusModeSetupRequired}
                  error={focusModeError}
                  secondsRemaining={focusModeSecondsRemaining}
                  limitSeconds={dailyLimitSeconds}
                  isStarting={isStartingFocusMode}
                  onStart={onStartFocusMode}
                  onOpenSettings={onOpenFocusModeSettings}
                />
              ) : null}

              <View style={styles.cardGrid}>
                <TodayLearningCard child={selectedChild} />
                <RemedialFocusCard child={selectedChild} onViewReport={() => setActiveView('report')} />
                <AssignmentsCard assignments={selectedChild.recent_assignments} onViewReport={() => setActiveView('report')} />
                <ParentingTipsCard />
              </View>

              <TeacherNoteCard />

              <Text style={styles.footerCount}>{childCountLabel}</Text>
            </>
          )}
        </ScrollView>

        <BottomNavigation
          activeView={activeView}
          isStartingFocusMode={isStartingFocusMode}
          onHome={() => setActiveView('home')}
          onReports={() => setActiveView('report')}
          onMessages={() => setActiveView('messages')}
          onLock={onStartFocusMode}
        />
      </View>
    </View>
  );
}

function StatusChrome() {
  return (
    <View style={styles.statusChrome}>
      <Text style={styles.statusTime}>1:30</Text>
      <View style={styles.statusRight}>
        <View style={styles.signalBars}>
          <View style={[styles.signalBar, styles.signalBarShort]} />
          <View style={[styles.signalBar, styles.signalBarMedium]} />
          <View style={[styles.signalBar, styles.signalBarTall]} />
          <View style={[styles.signalBar, styles.signalBarFull]} />
        </View>
        <Svg width={21} height={16} viewBox="0 0 21 16">
          <Path d="M2 6c5-5 12-5 17 0" stroke="#050505" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M6 10c3-3 7-3 10 0" stroke="#050505" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Circle cx="10.5" cy="14" r="2" fill="#050505" />
        </Svg>
        <View style={styles.battery}>
          <Text style={styles.batteryText}>86</Text>
        </View>
      </View>
    </View>
  );
}

function BrandLogo() {
  return (
    <View style={styles.brandWrap}>
      <Svg width={33} height={28} viewBox="0 0 48 42">
        <Path
          d="M4 6c9-3 16 0 20 6v26c-5-5-12-8-20-5V6z"
          fill="none"
          stroke="#FF4B10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.5"
        />
        <Path
          d="M44 6c-9-3-16 0-20 6v26c5-5 12-8 20-5V6z"
          fill="none"
          stroke="#FF4B10"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.5"
        />
        <Path d="M24 12c4-8 11-10 20-10" stroke="#FF4B10" strokeLinecap="round" strokeWidth="3.5" />
      </Svg>
      <Text style={styles.brandText}>Kitabu</Text>
      <View style={styles.aiBadge}>
        <Text style={styles.aiBadgeText}>AI</Text>
      </View>
    </View>
  );
}

function MiniStudentAvatar() {
  return (
    <LinearGradient colors={['#FFF1E9', '#FFE1D2']} style={styles.miniAvatar}>
      <Svg width={42} height={42} viewBox="0 0 64 64">
        <Circle cx="32" cy="31" r="18" fill="#7A4127" />
        <Circle cx="21" cy="20" r="8" fill="#24140F" />
        <Circle cx="30" cy="14" r="9" fill="#24140F" />
        <Circle cx="40" cy="16" r="8" fill="#24140F" />
        <Circle cx="46" cy="25" r="8" fill="#24140F" />
        <Ellipse cx="32" cy="33" rx="15" ry="17" fill="#A3653D" />
        <Circle cx="27" cy="32" r="1.8" fill="#111111" />
        <Circle cx="38" cy="32" r="1.8" fill="#111111" />
        <Path d="M28 41c3 3 8 3 11 0" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
        <Path d="M17 64c2-12 8-18 15-18s13 6 15 18H17z" fill="#0F172A" />
        <Path d="M25 48l7 8 7-8" fill="#FFFFFF" />
        <Path d="M32 56l3 8h-6l3-8z" fill="#F97316" />
      </Svg>
    </LinearGradient>
  );
}

function HeroCard({ child, score }: { child: ParentChildSummary; score: number }) {
  const firstName = getFirstName(child.name);
  const status = score >= 70 ? 'Meeting expectations' : 'Needs focused support';

  return (
    <LinearGradient
      colors={['#FF4620', '#FF6A19', '#FFA22B']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.heroCard}>
      <HeroTexture />
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>{firstName} is on track</Text>
        <View style={styles.heroScoreRow}>
          <Text style={styles.heroScore}>{score}</Text>
          <Text style={styles.heroPercent}>%</Text>
        </View>
        <Text style={styles.heroStatus}>{status}</Text>
        <View style={styles.improvementPill}>
          <View style={styles.improvementIcon}>
            <Text style={styles.improvementArrow}>^</Text>
          </View>
          <Text style={styles.improvementText}>+6% improvement this term</Text>
        </View>
      </View>
      <HeroStudentArt />
    </LinearGradient>
  );
}

function HeroTexture() {
  return (
    <Svg height="100%" preserveAspectRatio="none" style={styles.textureLayer} viewBox="0 0 394 138" width="100%">
      <Defs>
        <SvgLinearGradient id="heroGlow" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.34" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M150 102C205 54 260 42 393 70" fill="none" stroke="#FFFFFF" strokeOpacity="0.78" strokeWidth="1.2" />
      <Path d="M0 124C92 76 162 68 238 100C296 124 342 115 394 96" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />
      <Path d="M220 126C260 67 310 42 394 24" fill="none" stroke="#FFFFFF" strokeOpacity="0.42" strokeWidth="1" />
      {Array.from({ length: 13 }).map((_, index) => (
        <Path
          key={`wave-${index}`}
          d={`M218 ${132 - index * 4}C260 ${74 - index * 2} 316 ${45 - index} 402 ${42 + index * 4}`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.16"
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: 16 }).map((_, index) => (
        <Path
          key={`left-wave-${index}`}
          d={`M-18 ${118 - index * 3}C54 ${90 - index * 2} 132 ${87 - index * 3} 221 ${114 - index}`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.11"
          strokeWidth="0.7"
        />
      ))}
      <Path d="M244 42l4 16 15 4-15 4-4 16-4-16-15-4 15-4 4-16z" fill="#FFFFFF" opacity="0.5" />
      <Path d="M307 23l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z" fill="#FFFFFF" opacity="0.34" />
      <Circle cx="356" cy="116" r="92" fill="url(#heroGlow)" opacity="0.55" />
    </Svg>
  );
}

function HeroStudentArt() {
  return (
    <View pointerEvents="none" style={styles.heroStudent}>
      <Svg width={166} height={150} viewBox="0 0 166 150">
        <Defs>
          <SvgLinearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#C47A47" />
            <Stop offset="1" stopColor="#8E4F30" />
          </SvgLinearGradient>
          <SvgLinearGradient id="shirt" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#DCE8F3" />
          </SvgLinearGradient>
          <SvgLinearGradient id="bag" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#1F2937" />
            <Stop offset="1" stopColor="#0B1220" />
          </SvgLinearGradient>
        </Defs>
        <Path d="M24 150c8-42 32-62 65-62s55 21 63 62H24z" fill="url(#bag)" />
        <Path d="M42 150c4-35 20-57 47-57s43 22 47 57H42z" fill="url(#shirt)" />
        <Path d="M79 98l11 16 11-16" fill="#FFFFFF" />
        <Path d="M84 110l8 40h-15l8-40z" fill="#15315F" />
        <Path d="M89 111l27 39h-13L84 116z" fill="#C8281A" opacity="0.85" />
        <Rect x="116" y="126" width="34" height="15" rx="3" fill="#F97316" />
        <Rect x="120" y="130" width="25" height="3" rx="1.5" fill="#FFFFFF" opacity="0.55" />
        <Path d="M60 93c6 13 16 20 29 20s23-7 29-20" fill="#E9F1F8" />
        <Ellipse cx="88" cy="70" rx="34" ry="38" fill="url(#skin)" />
        <Circle cx="54" cy="73" r="7" fill="#9B5C38" />
        <Circle cx="122" cy="73" r="7" fill="#9B5C38" />
        <Path d="M73 78c9 7 22 7 31 0" stroke="#6F2E1A" strokeLinecap="round" strokeWidth="3" />
        <Path d="M74 83c8 6 20 6 29 0" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="3" />
        <Circle cx="76" cy="67" r="3.1" fill="#101014" />
        <Circle cx="101" cy="67" r="3.1" fill="#101014" />
        <Path d="M68 59c5-3 10-3 15 0" stroke="#1A0F0C" strokeLinecap="round" strokeWidth="3" />
        <Path d="M94 59c5-3 10-3 15 0" stroke="#1A0F0C" strokeLinecap="round" strokeWidth="3" />
        <Path d="M88 67c-2 7-1 12 4 15" stroke="#7A3921" strokeLinecap="round" strokeWidth="2.2" />
        <G fill="#1B0E0B">
          <Circle cx="50" cy="52" r="15" />
          <Circle cx="60" cy="34" r="15" />
          <Circle cx="78" cy="25" r="14" />
          <Circle cx="97" cy="25" r="15" />
          <Circle cx="116" cy="38" r="15" />
          <Circle cx="126" cy="57" r="13" />
          <Circle cx="44" cy="68" r="12" />
        </G>
        <Path d="M54 59c6-18 21-27 40-25 19 2 31 13 36 33-9-14-18-20-28-20-17 12-36 15-57 9z" fill="#24120E" />
        <Path d="M42 150h13l9-44c-12 9-19 23-22 44zM134 150h-13l-9-44c12 9 19 23 22 44z" fill="#111827" />
      </Svg>
    </View>
  );
}

function QuickActions({
  isStartingFocusMode,
  onLockPhone,
  onMessages,
  onViewReport,
}: {
  isStartingFocusMode: boolean;
  onLockPhone: () => void;
  onMessages: () => void;
  onViewReport: () => void;
}) {
  return (
    <View style={styles.quickRail}>
      <QuickAction
        borderColor="#CDE4FF"
        colors={['#F4FAFF', '#EDF6FF']}
        icon={<LockKeyhole color="#087CE4" size={36} strokeWidth={2.4} />}
        isLoading={isStartingFocusMode}
        label="Lock Phone"
        onPress={onLockPhone}
      />
      <QuickAction
        borderColor="#D8EED4"
        colors={['#FAFFF7', '#F1FAEF']}
        icon={<FileBarChart color="#22A83A" size={36} strokeWidth={2.4} />}
        label="View Report"
        onPress={onViewReport}
      />
      <QuickAction
        borderColor="#E2D5FF"
        colors={['#FBF9FF', '#F4F0FF']}
        icon={<MessageSquareText color="#8057E6" size={36} strokeWidth={2.4} />}
        label={'Message\nTeacher'}
        onPress={onMessages}
      />
      <QuickAction
        borderColor="#F4D2B7"
        colors={['#FFFDF9', '#FFF5EC']}
        icon={<WalletCards color="#FF7A00" size={36} strokeWidth={2.4} />}
        label={'Pay Fees /\nSubscription'}
      />
    </View>
  );
}

function QuickAction({
  borderColor,
  colors,
  icon,
  isLoading,
  label,
  onPress,
}: {
  borderColor: string;
  colors: [string, string];
  icon: React.ReactNode;
  isLoading?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.quickAction}>
      <LinearGradient colors={colors} style={[styles.quickIconBox, { borderColor }]}>
        {isLoading ? <ActivityIndicator color="#FF4B10" /> : icon}
      </LinearGradient>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function TodayLearningCard({ child }: { child: ParentChildSummary }) {
  const minutes = child.weekly_report.lessonsCompleted > 0 ? child.weekly_report.lessonsCompleted * 21 : 42;
  const quizCompleted = child.recent_assignments.filter(assignment => assignment.status === 'completed').length;
  const assignmentsDue = child.recent_assignments.filter(assignment => assignment.status !== 'completed').length || 2;
  const goalProgress = Math.min(100, Math.round((minutes / 70) * 100));

  return (
    <DashboardCard accent="#1388F2" borderColor="#9CC9FF" title="Today's Learning">
      <LearningMetric
        icon={<Clock3 color="#1388F2" size={24} strokeWidth={2.5} />}
        iconTone="#1388F2"
        label="Active learning"
        value={`${minutes} min`}
      />
      <LearningMetric
        icon={<CheckCircle2 color="#FFFFFF" size={22} strokeWidth={2.8} />}
        iconTone="#3EC53C"
        label="Quiz completed"
        value={String(Math.max(1, quizCompleted))}
      />
      <LearningMetric
        icon={<BriefcaseBusiness color="#FFFFFF" size={22} strokeWidth={2.7} />}
        iconTone="#FF870B"
        label="Assignments due"
        value={String(assignmentsDue)}
      />
      <View style={styles.progressBarTrack}>
        <LinearGradient colors={['#0A7CFF', '#129AFF']} style={[styles.progressBarFill, { width: `${goalProgress}%` }]} />
      </View>
      <View style={styles.goalRow}>
        <Text style={styles.goalText}>{goalProgress}% of daily goal</Text>
        <Text style={styles.goalText}>Goal: 70 min</Text>
      </View>
    </DashboardCard>
  );
}

function LearningMetric({
  icon,
  iconTone,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconTone: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.learningMetric}>
      <View style={[styles.metricIcon, { backgroundColor: iconTone }]}>{icon}</View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function RemedialFocusCard({
  child,
  onViewReport,
}: {
  child: ParentChildSummary;
  onViewReport: () => void;
}) {
  const items = getRemedialItems(child);
  return (
    <DashboardCard accent="#F22626" borderColor="#FFB7B7" title="Remedial Focus">
      <View style={styles.remedialRows}>
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.remedialRow}>
            <Text numberOfLines={1} style={styles.remedialName}>
              {item}
            </Text>
            <View style={[styles.priorityBadge, index === 0 ? styles.priorityHigh : styles.priorityMedium]}>
              <Text style={[styles.priorityText, index === 0 ? styles.priorityHighText : styles.priorityMediumText]}>
                {index === 0 ? 'High Priority' : 'Medium'}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable onPress={onViewReport} style={styles.remedialButton}>
        <LinearGradient colors={['#FA3228', '#EF1F27']} style={styles.remedialButtonGradient}>
          <Text style={styles.remedialButtonText}>View Remedial Plan</Text>
        </LinearGradient>
      </Pressable>
    </DashboardCard>
  );
}

function AssignmentsCard({
  assignments,
  onViewReport,
}: {
  assignments: ParentChildAssignment[];
  onViewReport: () => void;
}) {
  const visibleAssignments = assignments.length > 0 ? assignments.slice(0, 2) : DEFAULT_ASSIGNMENTS;
  return (
    <DashboardCard accent="#7446DD" borderColor="#D7C1FF" title="Assignments">
      <View style={styles.assignmentList}>
        {visibleAssignments.map((assignment, index) => {
          const isCompleted = assignment.status === 'completed';
          const statusLabel = isCompleted ? 'Done' : index === 0 ? 'Not started' : 'In progress';
          return (
            <View key={assignment.id} style={styles.assignmentItem}>
              <View style={styles.assignmentIconBox}>
                <ClipboardList color="#7446DD" size={20} strokeWidth={2.5} />
              </View>
              <View style={styles.assignmentTextWrap}>
                <Text numberOfLines={1} style={styles.assignmentTitle}>
                  {assignment.title}
                </Text>
                <Text style={styles.assignmentDue}>{formatAssignmentDue(assignment, index)}</Text>
              </View>
              <View style={[styles.assignmentStatusPill, index === 0 ? styles.statusRed : styles.statusBlue]}>
                <Text style={[styles.assignmentStatusText, index === 0 ? styles.statusRedText : styles.statusBlueText]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Pressable onPress={onViewReport} style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>View all assignments</Text>
        <ChevronRight color="#7446DD" size={22} strokeWidth={2.7} />
      </Pressable>
    </DashboardCard>
  );
}

function ParentingTipsCard() {
  const tips = [
    { icon: <Target color="#1FAA2B" size={18} strokeWidth={2.5} />, label: 'Praise effort, not just marks' },
    { icon: <HelpCircle color="#1FAA2B" size={18} strokeWidth={2.5} />, label: 'Ask what felt hard today' },
    { icon: <BookOpen color="#1FAA2B" size={18} strokeWidth={2.5} />, label: 'Read together for 10 min' },
  ];

  return (
    <DashboardCard accent="#1FAA2B" borderColor="#9EDC8C" title="Parenting Tips">
      <View style={styles.tipList}>
        {tips.map(tip => (
          <Pressable key={tip.label} style={styles.tipRow}>
            <View style={styles.tipIcon}>{tip.icon}</View>
            <Text numberOfLines={1} style={styles.tipText}>
              {tip.label}
            </Text>
            <ChevronRight color="#202125" size={18} strokeWidth={2.4} />
          </Pressable>
        ))}
      </View>
      <View style={styles.tipFooter}>
        <Shield color="#6B7280" size={17} strokeWidth={2.3} />
        <Text style={styles.tipFooterText}>Small daily support builds confidence.</Text>
      </View>
    </DashboardCard>
  );
}

function TeacherNoteCard() {
  return (
    <View style={styles.teacherNote}>
      <CardTexture accent="#FF7A16" opacity={0.16} />
      <View style={styles.teacherTitleRow}>
        <View style={styles.teacherIcon}>
          <Text style={styles.teacherIconText}>i</Text>
        </View>
        <Text style={styles.teacherTitle}>Teacher Note</Text>
      </View>
      <Text style={styles.teacherFrom}>From Ms. Njeri</Text>
      <View style={styles.teacherBodyRow}>
        <Text style={styles.teacherBody}>
          Alice is improving in English and Science.{'\n'}Please encourage fractions practice.
        </Text>
        <Pressable style={styles.replyButton}>
          <Text style={styles.replyText}>Reply</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DashboardCard({
  accent,
  borderColor,
  children,
  title,
}: {
  accent: string;
  borderColor: string;
  children: React.ReactNode;
  title: string;
}) {
  const isCompact = title === 'Assignments' || title === 'Parenting Tips';
  return (
    <View style={[styles.dashboardCard, isCompact && styles.dashboardCardCompact, { borderColor }]}>
      <CardTexture accent={accent} />
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBadge, { backgroundColor: accent }]}>
          {title === "Today's Learning" ? (
            <BookOpen color="#FFFFFF" size={20} strokeWidth={2.5} />
          ) : title === 'Remedial Focus' ? (
            <Target color="#FFFFFF" size={20} strokeWidth={2.5} />
          ) : title === 'Assignments' ? (
            <ClipboardList color="#FFFFFF" size={20} strokeWidth={2.5} />
          ) : (
            <LockKeyhole color="#FFFFFF" size={19} strokeWidth={2.5} />
          )}
        </View>
        <Text numberOfLines={1} style={[styles.cardTitle, { color: accent }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CardTexture({ accent, opacity = 0.13 }: { accent: string; opacity?: number }) {
  return (
    <Svg height="100%" preserveAspectRatio="none" style={styles.textureLayer} viewBox="0 0 188 180" width="100%">
      {Array.from({ length: 8 }).map((_, index) => (
        <Path
          key={`card-curve-${index}`}
          d={`M92 ${-14 + index * 5}C130 ${12 + index * 2} 161 ${24 + index * 6} 203 ${15 + index * 11}`}
          fill="none"
          stroke={accent}
          strokeOpacity={opacity}
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: 8 }).map((_, index) => (
        <Path
          key={`card-bottom-${index}`}
          d={`M89 ${174 - index * 4}C126 ${144 - index * 2} 153 ${132 - index * 3} 202 ${138 - index * 5}`}
          fill="none"
          stroke={accent}
          strokeOpacity={opacity * 0.7}
          strokeWidth="0.75"
        />
      ))}
    </Svg>
  );
}

function FocusModeNotice({
  active,
  setupRequired,
  error,
  secondsRemaining,
  limitSeconds,
  isStarting,
  onStart,
  onOpenSettings,
}: {
  active: boolean;
  setupRequired: boolean;
  error: string | null;
  secondsRemaining: number;
  limitSeconds: number;
  isStarting: boolean;
  onStart: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.focusNotice}>
      <View style={styles.focusNoticeHeader}>
        <View style={styles.focusNoticeIcon}>
          <ShieldCheck color="#0F8A4B" size={22} strokeWidth={2.5} />
        </View>
        <View style={styles.focusNoticeTitleWrap}>
          <Text style={styles.focusNoticeTitle}>Focus Mode</Text>
          <Text style={styles.focusNoticeMeta}>Default session: {formatDuration(limitSeconds)}</Text>
        </View>
      </View>
      <Text style={styles.focusNoticeText}>Focus Mode keeps KITABU on screen while your child learns.</Text>
      <Text style={styles.focusNoticeText}>To leave Focus Mode, Android will ask for your phone PIN.</Text>
      <Text style={styles.focusNoticeText}>KITABU does not create a separate PIN.</Text>

      {active ? (
        <View style={styles.focusStatusRow}>
          <Clock3 color="#0F8A4B" size={16} strokeWidth={2.4} />
          <Text style={styles.focusStatusText}>Active - {formatDuration(secondsRemaining)} remaining</Text>
        </View>
      ) : null}

      {setupRequired ? (
        <View style={styles.focusSetupBox}>
          <Text style={styles.focusSetupTitle}>Turn on App Pinning to keep KITABU on screen.</Text>
          <Text style={styles.focusSetupText}>
            After turning it on, Android will ask for your phone PIN when someone tries to leave KITABU.
          </Text>
          <Text style={styles.focusSetupText}>
            If the phone does not have a PIN, set one in Android security settings first.
          </Text>
          <Pressable onPress={onOpenSettings} style={styles.settingsButton}>
            <Settings color="#0F8A4B" size={17} strokeWidth={2.4} />
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.focusError}>{error}</Text> : null}

      <Pressable
        disabled={active || isStarting}
        onPress={onStart}
        style={[styles.focusButton, (active || isStarting) && styles.disabledButton]}>
        {isStarting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.focusButtonText}>Start Focus Mode</Text>}
      </Pressable>
    </View>
  );
}

function AddChildPanel({
  error,
  isLinking,
  linkIdentifier,
  linkMethod,
  onLinkChild,
  onLinkIdentifierChange,
  onLinkMethodChange,
}: {
  error: string | null;
  isLinking: boolean;
  linkIdentifier: string;
  linkMethod: 'email' | 'phone';
  onLinkChild: () => void;
  onLinkIdentifierChange: (value: string) => void;
  onLinkMethodChange: (method: 'email' | 'phone') => void;
}) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>No children linked yet</Text>
      <Text style={styles.emptyText}>
        Add a verified student by email or phone to view learning progress, homework, diagnostics, and review load.
      </Text>
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
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          value={linkIdentifier}
        />
        <Pressable
          disabled={isLinking || !linkIdentifier.trim()}
          onPress={onLinkChild}
          style={[styles.linkButton, (isLinking || !linkIdentifier.trim()) && styles.disabledButton]}>
          {isLinking ? <ActivityIndicator color="#FFFFFF" /> : <Link2 color="#FFFFFF" size={19} strokeWidth={2.6} />}
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function EmptyState({
  actionLabel,
  body,
  isLoading,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  isLoading?: boolean;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.emptyPanel}>
      {isLoading ? <ActivityIndicator color="#FF4B10" /> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function WeeklyReport({ child, onBack }: { child: ParentChildSummary; onBack: () => void }) {
  const report = child.weekly_report;
  const hasTrendActivity = child.weekly_trends.some(
    item => item.lessonsCompleted > 0 || item.assignmentsCompleted > 0 || item.assessmentAverage > 0,
  );
  const maxActivity = Math.max(
    1,
    ...child.weekly_trends.map(item => item.lessonsCompleted + item.assignmentsCompleted),
  );

  return (
    <View style={styles.reportWrap}>
      <View style={styles.reportTopRow}>
        <View>
          <Text style={styles.reportEyebrow}>Weekly report</Text>
          <Text style={styles.reportTitle}>This week for {getFirstName(child.name)}</Text>
        </View>
        <Pressable onPress={onBack} style={styles.reportBackButton}>
          <Home color="#FF4B10" size={20} strokeWidth={2.5} />
        </Pressable>
      </View>
      <LinearGradient colors={['#FFF7EF', '#FFFFFF']} style={styles.reportSummary}>
        <Text style={styles.reportSummaryText}>
          {report.activeDays} active days - {report.lessonsCompleted} lessons - {report.assignmentsCompleted} assignments
        </Text>
      </LinearGradient>
      <View style={styles.reportStatsRow}>
        <ReportStat
          label="Assessment"
          value={formatPercentStat(report.assessmentAverage, hasTrendActivity)}
        />
        <ReportStat
          label="Weekly exam"
          value={report.weeklyExamScore === null ? 'No data' : `${report.weeklyExamScore}%`}
        />
      </View>
      <View style={styles.reportPanel}>
        <View style={styles.reportPanelHeader}>
          <BarChart3 color="#FF4B10" size={20} strokeWidth={2.4} />
          <Text style={styles.reportPanelTitle}>Six-week activity</Text>
        </View>
        {hasTrendActivity ? (
          <View style={styles.trendChart}>
            {child.weekly_trends.map(item => {
              const total = item.lessonsCompleted + item.assignmentsCompleted;
              return (
                <View key={item.weekStart} style={styles.trendColumn}>
                  <View style={styles.trendBarTrack}>
                    <LinearGradient
                      colors={['#FF4B10', '#FF8A1D']}
                      style={[styles.trendBar, { height: `${Math.max(6, (total / maxActivity) * 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.trendValue}>{total}</Text>
                  <Text style={styles.trendLabel}>{item.weekStart.slice(5)}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.reportBodyText}>
            Weekly activity appears after lessons, assignments, or exams are completed.
          </Text>
        )}
      </View>
      <ReportList title="Strengths" items={report.strengths} empty="Strengths will appear as learning data grows." tone="success" />
      <ReportList title="Focus next" items={report.focusAreas} empty="No urgent focus areas this week." tone="focus" />
    </View>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reportStat}>
      <Text style={styles.reportStatValue}>{value}</Text>
      <Text style={styles.reportStatLabel}>{label}</Text>
    </View>
  );
}

function ReportList({
  empty,
  items,
  title,
  tone,
}: {
  empty: string;
  items: string[];
  title: string;
  tone: 'success' | 'focus';
}) {
  const renderedItems = items.length > 0 ? items : [empty];
  return (
    <View style={styles.reportPanel}>
      <View style={styles.reportPanelHeader}>
        {tone === 'success' ? (
          <CheckCircle2 color="#1FAA2B" size={20} strokeWidth={2.5} />
        ) : (
          <Target color="#FF7A16" size={20} strokeWidth={2.5} />
        )}
        <Text style={styles.reportPanelTitle}>{title}</Text>
      </View>
      {renderedItems.map(item => (
        <View key={item} style={styles.reportListRow}>
          <View style={[styles.reportDot, tone === 'success' ? styles.reportDotSuccess : styles.reportDotFocus]} />
          <Text style={styles.reportListText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ParentMessagesView({
  activeTeacherId,
  draft,
  error,
  isLoading,
  isSending,
  messages,
  teachers,
  onBack,
  onChangeDraft,
  onSelectTeacher,
  onSend,
}: {
  activeTeacherId: string | null;
  draft: string;
  error: string | null;
  isLoading: boolean;
  isSending: boolean;
  messages: TeacherParentMessage[];
  teachers: TeacherParentMessage[];
  onBack: () => void;
  onChangeDraft: (value: string) => void;
  onSelectTeacher: (teacherId: string) => void;
  onSend: () => void;
}) {
  const selectedTeacher = teachers.find(teacher => teacher.teacher_user_id === activeTeacherId);
  return (
    <View style={styles.parentMessagesWrap}>
      <View style={styles.reportTopRow}>
        <View>
          <Text style={styles.reportEyebrow}>Messages</Text>
          <Text style={styles.reportTitle}>Teacher chat</Text>
        </View>
        <Pressable onPress={onBack} style={styles.reportBackButton}>
          <Text style={styles.reportBackText}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.parentMessagePanel}>
        <View style={styles.parentMessageHeader}>
          <View>
            <Text style={styles.parentMessageTitle}>
              {selectedTeacher ? selectedTeacher.sender_name : 'Teacher messages'}
            </Text>
            <Text style={styles.parentMessageMeta}>
              {isLoading ? 'Loading...' : `${messages.length} saved messages`}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentTeacherTabs}>
          {teachers.length === 0 ? (
            <View style={styles.parentTeacherEmptyChip}>
              <Text style={styles.parentTeacherEmptyText}>No active teacher chats</Text>
            </View>
          ) : (
            teachers.map(thread => {
              const active = thread.teacher_user_id === activeTeacherId;
              return (
                <Pressable
                  key={thread.teacher_user_id}
                  onPress={() => onSelectTeacher(thread.teacher_user_id)}
                  style={[styles.parentTeacherChip, active && styles.parentTeacherChipActive]}>
                  <Text
                    style={[
                      styles.parentTeacherChipText,
                      active && styles.parentTeacherChipTextActive,
                    ]}>
                    {thread.sender_name}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {error ? <Text style={styles.parentMessageError}>{error}</Text> : null}

        <View style={styles.parentMessageThread}>
          {messages.length === 0 ? (
            <View style={styles.parentMessageEmpty}>
              <Text style={styles.parentMessageTitle}>No messages yet</Text>
              <Text style={styles.parentMessageMeta}>
                Teacher conversations will appear here after a teacher sends the first message.
              </Text>
            </View>
          ) : (
            messages.map(message => {
              const fromParent = message.sender_user_id === message.parent_user_id;
              return (
                <View
                  key={message.id}
                  style={[
                    styles.parentMessageBubble,
                    fromParent ? styles.parentMessageBubbleMine : styles.parentMessageBubbleTeacher,
                  ]}>
                  <Text style={styles.parentMessageSender}>{message.sender_name}</Text>
                  <Text style={styles.parentMessageBody}>{message.body}</Text>
                  <Text style={styles.parentMessageTime}>
                    {new Date(message.created_at).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.parentMessageComposer}>
          <TextInput
            editable={Boolean(activeTeacherId) && !isSending}
            multiline
            onChangeText={onChangeDraft}
            placeholder={
              activeTeacherId
                ? 'Reply to the teacher...'
                : 'A teacher must start the conversation first.'
            }
            placeholderTextColor="#8A94A6"
            style={styles.parentMessageInput}
            value={draft}
          />
          <Pressable
            disabled={!activeTeacherId || draft.trim().length === 0 || isSending}
            onPress={onSend}
            style={[
              styles.parentMessageSendButton,
              (!activeTeacherId || draft.trim().length === 0 || isSending) &&
                styles.parentMessageSendButtonDisabled,
            ]}>
            <Text style={styles.parentMessageSendText}>{isSending ? 'Sending...' : 'Send'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function BottomNavigation({
  activeView,
  isStartingFocusMode,
  onHome,
  onLock,
  onMessages,
  onReports,
}: {
  activeView: DashboardTab;
  isStartingFocusMode: boolean;
  onHome: () => void;
  onLock: () => void;
  onMessages: () => void;
  onReports: () => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <NavItem active={activeView === 'home'} icon={<Home />} label="Home" onPress={onHome} />
      <NavItem active={activeView === 'report'} icon={<BarChart3 />} label="Reports" onPress={onReports} />
      <NavItem icon={<LockKeyhole />} isLoading={isStartingFocusMode} label="Lock" onPress={onLock} />
      <NavItem
        active={activeView === 'messages'}
        icon={<MessageCircle />}
        label="Messages"
        onPress={onMessages}
      />
    </View>
  );
}

function NavItem({
  active,
  icon,
  isLoading,
  label,
  onPress,
}: {
  active?: boolean;
  icon: React.ReactElement<{ color?: string; size?: number; strokeWidth?: number }>;
  isLoading?: boolean;
  label: string;
  onPress?: () => void;
}) {
  const color = active ? '#FF4B10' : '#5B5C61';
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.navItem}>
      <View style={[styles.navIndicator, active && styles.navIndicatorActive]} />
      {isLoading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        React.cloneElement(icon, { color, size: 27, strokeWidth: active ? 3 : 2.6 })
      )}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Parent';
}

function getOverallScore(child: ParentChildSummary) {
  const candidates = [
    hasAssessmentData(child) ? child.assessment_average : 0,
    hasHomeworkData(child) ? child.homework_completion : 0,
    hasMasteryData(child) ? child.mastery_average : 0,
    child.diagnostic.completed ? child.diagnostic.percentage ?? 0 : 0,
  ].filter(value => value > 0);

  if (candidates.length === 0) {
    return 0;
  }
  return Math.round(Math.max(...candidates));
}

function getRemedialItems(child: ParentChildSummary) {
  const focusAreas = child.weekly_report.focusAreas.map(area => {
    const parts = area.split(':');
    return (parts[1] || parts[0]).trim();
  });
  const assignmentAreas = child.recent_assignments
    .filter(assignment => assignment.status !== 'completed')
    .map(assignment => assignment.title.replace(/^Grade\s+\d+\s+/i, '').replace(/\s+Check$/i, '').trim());
  const items = [...focusAreas, ...assignmentAreas].filter(Boolean);
  return uniqueStrings([...items, 'Fractions', 'Respiration', 'Inference']).slice(0, 3);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
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

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

function formatAssignmentDue(assignment: ParentChildAssignment, index: number) {
  if (assignment.dueAt) {
    return index === 0 ? 'Due Monday' : 'Due Tomorrow';
  }
  return index === 0 ? 'Due Monday' : 'Due Tomorrow';
}

const DEFAULT_ASSIGNMENTS: ParentChildAssignment[] = [
  {
    id: 'default-weekend-assignment',
    title: 'Weekend Assignment',
    subject: 'English',
    status: 'pending',
    score: null,
    dueAt: null,
  },
  {
    id: 'default-science-quiz',
    title: 'Science Quiz',
    subject: 'Science',
    status: 'pending',
    score: null,
    dueAt: null,
  },
];

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  phoneShell: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    maxWidth: 430,
    width: '100%',
  },
  scroll: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  content: {
    paddingBottom: 18,
    paddingHorizontal: 17,
  },
  statusChrome: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 32,
    justifyContent: 'space-between',
    paddingHorizontal: 31,
    paddingTop: 7,
  },
  statusTime: {
    color: '#050505',
    fontSize: 15,
    fontWeight: '900',
  },
  statusRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  signalBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    height: 22,
  },
  signalBar: {
    backgroundColor: '#050505',
    borderRadius: 2,
    width: 4,
  },
  signalBarShort: {
    height: 8,
  },
  signalBarMedium: {
    height: 12,
  },
  signalBarTall: {
    height: 16,
  },
  signalBarFull: {
    height: 20,
  },
  battery: {
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 4,
    height: 18,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  batteryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 5 : 16,
  },
  brandWrap: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  brandText: {
    color: '#FF4B10',
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 0,
    marginLeft: 2,
  },
  aiBadge: {
    alignItems: 'center',
    borderColor: '#FF4B10',
    borderRadius: 7,
    borderWidth: 1.3,
    height: 21,
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  aiBadgeText: {
    color: '#FF4B10',
    fontSize: 13,
    fontWeight: '800',
  },
  topActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  bellButton: {
    alignItems: 'center',
    height: 42,
    justifyContent: 'center',
    position: 'relative',
    width: 42,
  },
  notificationDot: {
    backgroundColor: '#FF5A0A',
    borderRadius: 5,
    height: 10,
    position: 'absolute',
    right: 5,
    top: 7,
    width: 10,
  },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 2,
  },
  greeting: {
    color: '#25252B',
    flex: 1,
    fontSize: 17.5,
    fontWeight: '900',
    letterSpacing: 0,
  },
  childSelector: {
    alignItems: 'center',
    backgroundColor: '#FCFCFD',
    borderColor: '#E3E3E8',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    maxWidth: 166,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  childSelectorText: {
    color: '#15151A',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  miniAvatar: {
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 42,
  },
  subtitle: {
    color: '#5C5D63',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  childTabs: {
    gap: 10,
    paddingRight: 8,
    paddingTop: 12,
  },
  childTab: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6EA',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 7,
  },
  childTabActive: {
    backgroundColor: '#FFF5EE',
    borderColor: '#FFC8A6',
  },
  childTabMain: {
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  childTabName: {
    color: '#202126',
    fontSize: 13,
    fontWeight: '900',
  },
  childTabNameActive: {
    color: '#FF4B10',
  },
  childTabMeta: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  childTabMetaActive: {
    color: '#C45820',
  },
  childRemoveButton: {
    alignItems: 'center',
    backgroundColor: '#FFE8E8',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  childRemoveText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '900',
  },
  heroCard: {
    borderColor: '#FF4B10',
    borderRadius: 19,
    borderWidth: 1.4,
    height: 140,
    marginTop: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCopy: {
    paddingLeft: 20,
    paddingTop: 16,
    width: '62%',
    zIndex: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroScoreRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 3,
  },
  heroScore: {
    color: '#FFFFFF',
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 66,
    textShadowColor: 'rgba(0,0,0,0.14)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  heroPercent: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    lineHeight: 44,
    marginLeft: 3,
    marginTop: 7,
  },
  heroStatus: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -3,
  },
  improvementPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 9,
  },
  improvementIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.23)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  improvementArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  improvementText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroStudent: {
    bottom: -4,
    height: 150,
    position: 'absolute',
    right: 5,
    width: 166,
    zIndex: 1,
  },
  quickRail: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E2E5',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
    paddingBottom: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconBox: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    marginBottom: 6,
    width: 58,
  },
  quickLabel: {
    color: '#111116',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 15,
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 6,
  },
  dashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 137,
    overflow: 'hidden',
    paddingBottom: 5,
    paddingHorizontal: 8,
    paddingTop: 6,
    position: 'relative',
    width: '48.8%',
  },
  dashboardCardCompact: {
    minHeight: 122,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    position: 'relative',
    zIndex: 1,
  },
  cardIconBadge: {
    alignItems: 'center',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  cardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 14,
  },
  learningMetric: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
    position: 'relative',
    zIndex: 1,
  },
  metricIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  metricValue: {
    color: '#16161A',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },
  metricLabel: {
    color: '#57585F',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 14,
  },
  progressBarTrack: {
    backgroundColor: '#E9EBEE',
    borderRadius: 999,
    height: 7,
    marginTop: 2,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  progressBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    position: 'relative',
    zIndex: 1,
  },
  goalText: {
    color: '#505158',
    fontSize: 9.5,
    fontWeight: '700',
  },
  remedialRows: {
    gap: 6,
    position: 'relative',
    zIndex: 1,
  },
  remedialRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#F1D5D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 20,
    paddingHorizontal: 6,
  },
  remedialName: {
    color: '#15151A',
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    paddingRight: 5,
  },
  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  priorityHigh: {
    backgroundColor: '#FFE5E4',
  },
  priorityMedium: {
    backgroundColor: '#FFF1DF',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
  },
  priorityHighText: {
    color: '#F11E1E',
  },
  priorityMediumText: {
    color: '#FF650D',
  },
  remedialButton: {
    borderRadius: 9,
    marginTop: 5,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  remedialButtonGradient: {
    alignItems: 'center',
    minHeight: 25,
    justifyContent: 'center',
  },
  remedialButtonText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  assignmentList: {
    gap: 5,
    position: 'relative',
    zIndex: 1,
  },
  assignmentItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#E5D9FF',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 26,
    padding: 4,
  },
  assignmentIconBox: {
    alignItems: 'center',
    backgroundColor: '#F0E8FF',
    borderRadius: 10,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  assignmentTextWrap: {
    flex: 1,
  },
  assignmentTitle: {
    color: '#111116',
    fontSize: 9.5,
    fontWeight: '900',
    lineHeight: 12,
  },
  assignmentDue: {
    color: '#6B6C73',
    fontSize: 8.5,
    fontWeight: '500',
    marginTop: 2,
  },
  assignmentStatusPill: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statusRed: {
    backgroundColor: '#FFEAE9',
  },
  statusBlue: {
    backgroundColor: '#EAF3FF',
  },
  assignmentStatusText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusRedText: {
    color: '#E91D1D',
  },
  statusBlueText: {
    color: '#0C75F2',
  },
  viewAllButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    position: 'relative',
    zIndex: 1,
  },
  viewAllText: {
    color: '#7446DD',
    fontSize: 12,
    fontWeight: '700',
  },
  tipList: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#D7EACF',
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  tipRow: {
    alignItems: 'center',
    borderBottomColor: '#DDEBD8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 20,
    paddingHorizontal: 8,
  },
  tipIcon: {
    width: 25,
  },
  tipText: {
    color: '#17171B',
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
  },
  tipFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 3,
    paddingHorizontal: 5,
    position: 'relative',
    zIndex: 1,
  },
  tipFooterText: {
    color: '#696A72',
    flex: 1,
    fontSize: 8.8,
    fontWeight: '600',
    lineHeight: 11,
  },
  teacherNote: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA7A',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 76,
    overflow: 'hidden',
    padding: 7,
    position: 'relative',
  },
  teacherTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    position: 'relative',
    zIndex: 1,
  },
  teacherIcon: {
    alignItems: 'center',
    backgroundColor: '#FF7A16',
    borderRadius: 14,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  teacherIconText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 21,
  },
  teacherTitle: {
    color: '#FF5A0A',
    fontSize: 14,
    fontWeight: '900',
  },
  teacherFrom: {
    color: '#15151A',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 1,
    position: 'relative',
    zIndex: 1,
  },
  teacherBodyRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 0,
    position: 'relative',
    zIndex: 1,
  },
  teacherBody: {
    color: '#15151A',
    flex: 1,
    fontSize: 10.8,
    fontWeight: '500',
    lineHeight: 13,
  },
  replyButton: {
    alignItems: 'center',
    borderColor: '#FF5A0A',
    borderRadius: 12,
    borderWidth: 1.2,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  replyText: {
    color: '#FF5A0A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  footerCount: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  focusNotice: {
    backgroundColor: '#F1FFF6',
    borderColor: '#A8E4B5',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 9,
    padding: 14,
  },
  focusNoticeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  focusNoticeIcon: {
    alignItems: 'center',
    backgroundColor: '#DFF8E7',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  focusNoticeTitleWrap: {
    flex: 1,
  },
  focusNoticeTitle: {
    color: '#0F8A4B',
    fontSize: 18,
    fontWeight: '900',
  },
  focusNoticeMeta: {
    color: '#0F8A4B',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  focusNoticeText: {
    color: '#164E2C',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 7,
  },
  focusStatusRow: {
    alignItems: 'center',
    backgroundColor: '#DDF8E7',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusStatusText: {
    color: '#0F8A4B',
    fontSize: 12,
    fontWeight: '900',
  },
  focusSetupBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#BFECC8',
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    padding: 12,
  },
  focusSetupTitle: {
    color: '#111116',
    fontSize: 14,
    fontWeight: '900',
  },
  focusSetupText: {
    color: '#53545B',
    fontSize: 13,
    lineHeight: 19,
  },
  settingsButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E6F9EB',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  settingsButtonText: {
    color: '#0F8A4B',
    fontSize: 13,
    fontWeight: '900',
  },
  focusError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#15803D',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 44,
  },
  focusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E2E5',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 17,
    padding: 18,
  },
  emptyTitle: {
    color: '#17171B',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4,
  },
  emptyText: {
    color: '#5C5D63',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#FF4B10',
    borderRadius: 12,
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  methodButton: {
    alignItems: 'center',
    borderColor: '#D7D7DC',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  methodButtonActive: {
    backgroundColor: '#FFF3EC',
    borderColor: '#FF8A4B',
  },
  methodText: {
    color: '#696A72',
    fontSize: 13,
    fontWeight: '900',
  },
  methodTextActive: {
    color: '#FF4B10',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FBFBFC',
    borderColor: '#D9D9DE',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111116',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkButton: {
    alignItems: 'center',
    backgroundColor: '#8BA8FF',
    borderRadius: 14,
    justifyContent: 'center',
    width: 52,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  reportWrap: {
    gap: 10,
    marginTop: 17,
  },
  reportTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportEyebrow: {
    color: '#FF4B10',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  reportTitle: {
    color: '#17171B',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  reportBackButton: {
    alignItems: 'center',
    backgroundColor: '#FFF3EC',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  reportBackText: {
    color: '#FF4B10',
    fontSize: 11,
    fontWeight: '900',
  },
  reportSummary: {
    borderColor: '#FFD7BC',
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  reportSummaryText: {
    color: '#303038',
    fontSize: 14,
    fontWeight: '800',
  },
  reportStatsRow: {
    flexDirection: 'row',
    gap: 9,
  },
  reportStat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6EA',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  reportStatValue: {
    color: '#FF4B10',
    fontSize: 25,
    fontWeight: '900',
  },
  reportStatLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  reportPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6EA',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  reportPanelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  reportPanelTitle: {
    color: '#17171B',
    fontSize: 16,
    fontWeight: '900',
  },
  reportBodyText: {
    color: '#55565D',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  trendChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    height: 136,
    paddingTop: 8,
  },
  trendColumn: {
    alignItems: 'center',
    flex: 1,
  },
  trendBarTrack: {
    backgroundColor: '#FFF0E7',
    borderRadius: 8,
    height: 90,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 25,
  },
  trendBar: {
    borderRadius: 8,
    width: '100%',
  },
  trendValue: {
    color: '#303038',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 4,
  },
  trendLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    marginTop: 2,
  },
  reportListRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9,
    marginTop: 9,
  },
  reportListText: {
    color: '#4B4C53',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  reportDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  reportDotSuccess: {
    backgroundColor: '#1FAA2B',
  },
  reportDotFocus: {
    backgroundColor: '#FF7A16',
  },
  parentMessagesWrap: {
    gap: 14,
  },
  parentMessagePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7EF',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  parentMessageHeader: {
    borderBottomColor: '#EEF2F7',
    borderBottomWidth: 1,
    padding: 16,
  },
  parentMessageTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 22,
  },
  parentMessageMeta: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  parentTeacherTabs: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  parentTeacherChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DCE3EC',
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 36,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  parentTeacherChipActive: {
    backgroundColor: '#FF6B1A',
    borderColor: '#FF6B1A',
  },
  parentTeacherChipText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  parentTeacherChipTextActive: {
    color: '#FFFFFF',
  },
  parentTeacherEmptyChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E7EF',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  parentTeacherEmptyText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '800',
  },
  parentMessageError: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  parentMessageThread: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    gap: 10,
    padding: 14,
  },
  parentMessageEmpty: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E1E7EF',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  parentMessageBubble: {
    borderRadius: 15,
    maxWidth: '88%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  parentMessageBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: '#EAFBF0',
    borderColor: '#BFEBCD',
    borderWidth: 1,
  },
  parentMessageBubbleTeacher: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4EC',
    borderColor: '#FFDCC6',
    borderWidth: 1,
  },
  parentMessageSender: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  parentMessageBody: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  parentMessageTime: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 7,
  },
  parentMessageComposer: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    padding: 14,
  },
  parentMessageInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DCE3EC',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 82,
    paddingHorizontal: 13,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  parentMessageSendButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#138A43',
    borderRadius: 999,
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 42,
    minWidth: 104,
    paddingHorizontal: 18,
  },
  parentMessageSendButtonDisabled: {
    opacity: 0.55,
  },
  parentMessageSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DADCE2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    height: 73,
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
    position: 'relative',
  },
  navIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 4,
    marginBottom: 7,
    width: 58,
  },
  navIndicatorActive: {
    backgroundColor: '#FF4B10',
  },
  navLabel: {
    color: '#5B5C61',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  navLabelActive: {
    color: '#FF4B10',
  },
});
