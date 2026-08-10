import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileBarChart,
  Flag,
  Home,
  HelpCircle,
  Lightbulb,
  Link2,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  MessageSquareText,
  Pencil,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  WalletCards,
} from 'lucide-react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { ReportAiContentSheet } from '../components/ReportAiContentSheet';
import { ChatMessage, OnboardingMascotKey, ParentChildAssignment, ParentChildSummary } from '../types/app';
import { askParentAssistant, ParentAssistantContext } from '../services/aiService';
import {
  getParentTeacherMessages,
  sendParentTeacherMessage,
} from '../services/parentService';
import { reportTeacherParentMessage, TeacherParentMessage } from '../services/teacherService';

interface ParentDashboardScreenProps {
  children: ParentChildSummary[];
  selectedChildId: string | null;
  parentName?: string;
  parentEmail?: string | null;
  parentPhone?: string | null;
  parentRole?: string | null;
  mascotKey: OnboardingMascotKey;
  linkIdentifier: string;
  linkMethod: 'email' | 'phone';
  isLoading: boolean;
  isLinking: boolean;
  error: string | null;
  focusModeActive: boolean;
  focusModeSetupRequired: boolean;
  focusModeSetupCompleted: boolean;
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
  onOpenBilling?: () => void;
  externalPaymentsEnabled?: boolean;
  onSaveParentProfile?: (updates: { name: string; email: string; phone: string }) => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

type DashboardTab = 'home' | 'learning' | 'insights' | 'rafiki';
type DashboardView = DashboardTab | 'messages';
type GlanceRange = 'week' | 'month' | 'year';
type GlanceComparisonTone = 'positive' | 'negative' | 'neutral';

const ACCENT = '#F97316';
const INK = '#111827';
const MUTED = '#6B7280';
const MASCOT_ART: Record<OnboardingMascotKey, ReturnType<typeof require>> = {
  elephant: require('../assets/mascot/ndovu-elephant.png'),
  lion: require('../assets/mascot/simba-lion.png'),
  rabbit: require('../assets/mascot/sungura-rabbit.png'),
  panda: require('../assets/mascot/panda.png'),
};

export function ParentDashboardScreen({
  children,
  selectedChildId,
  parentName,
  parentEmail,
  parentPhone,
  parentRole,
  mascotKey,
  linkIdentifier,
  linkMethod,
  isLoading,
  isLinking,
  error,
  focusModeActive,
  focusModeSetupRequired,
  focusModeSetupCompleted,
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
  onOpenBilling,
  externalPaymentsEnabled = true,
  onSaveParentProfile,
  onRefresh,
  onSignOut,
}: ParentDashboardScreenProps) {
  const [activeView, setActiveView] = useState<DashboardView>('home');
  const [glanceRange, setGlanceRange] = useState<GlanceRange>('week');
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [teacherMessages, setTeacherMessages] = useState<TeacherParentMessage[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [rafikiMessages, setRafikiMessages] = useState<ChatMessage[]>([]);
  const [rafikiDraft, setRafikiDraft] = useState('');
  const [isRafikiThinking, setIsRafikiThinking] = useState(false);

  const selectedChild = useMemo(
    () => children.find(child => child.id === selectedChildId) ?? children[0] ?? null,
    [children, selectedChildId],
  );
  const childCountLabel =
    children.length === 1 ? '1 linked child' : `${children.length} linked children`;
  const childFirstName = getFirstName(selectedChild?.name || 'your child');
  const parentDisplayName = parentName?.trim() || 'Parent';
  const parentFirstName = getFirstName(parentDisplayName);
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
  const latestTeacherNote = useMemo(() => {
    const fromTeachers = teacherMessages.filter(
      message => message.sender_user_id !== message.parent_user_id,
    );
    return fromTeachers.reduce<TeacherParentMessage | null>((latest, message) => {
      if (!latest || new Date(message.created_at) > new Date(latest.created_at)) {
        return message;
      }
      return latest;
    }, null);
  }, [teacherMessages]);

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
    if (children.length > 0) {
      loadParentMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children.length > 0]);

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

  async function sendRafikiMessage(text?: string) {
    const body = (text ?? rafikiDraft).trim();
    if (!body || isRafikiThinking || !selectedChild) {
      return;
    }
    const history = rafikiMessages;
    setRafikiMessages([...history, { role: 'user', text: body }]);
    setRafikiDraft('');
    setIsRafikiThinking(true);
    const reply = await askParentAssistant(body, history, buildRafikiContext(selectedChild));
    setRafikiMessages(previous => [...previous, { role: 'model', text: reply }]);
    setIsRafikiThinking(false);
  }

  function switchTab(tab: DashboardTab) {
    setActiveView(tab);
    setIsAccountOpen(false);
    setIsChildMenuOpen(false);
    setConfirmRemoveId(null);
  }

  const showEmptyStates = children.length === 0;

  return (
    <View style={styles.screen}>
      <View style={styles.phoneShell}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}>
          <DashboardHeader
            childName={selectedChild?.name ?? null}
            childrenCount={children.length}
            isLoading={isLoading}
            isChildMenuOpen={isChildMenuOpen}
            parentFirstName={parentFirstName}
            onRefresh={onRefresh}
            onToggleAccount={() => {
              setIsAccountOpen(open => !open);
              setIsChildMenuOpen(false);
              setConfirmRemoveId(null);
            }}
            onToggleChildMenu={() => {
              setIsChildMenuOpen(open => !open);
              setIsAccountOpen(false);
              setConfirmRemoveId(null);
            }}
          />

          {isChildMenuOpen ? (
            <ChildManagerPanel
              childrenList={children}
              confirmRemoveId={confirmRemoveId}
              error={error}
              isLinking={isLinking}
              linkIdentifier={linkIdentifier}
              linkMethod={linkMethod}
              selectedChildId={selectedChild?.id ?? null}
              onConfirmRemove={setConfirmRemoveId}
              onLinkChild={onLinkChild}
              onLinkIdentifierChange={onLinkIdentifierChange}
              onLinkMethodChange={onLinkMethodChange}
              onSelectChild={childId => {
                onSelectChild(childId);
                setIsChildMenuOpen(false);
                setConfirmRemoveId(null);
              }}
              onUnlinkChild={onUnlinkChild}
            />
          ) : null}

          {isLoading && showEmptyStates ? (
            <EmptyState
              title="Loading children"
              body="Fetching the latest learning statistics."
              isLoading
            />
          ) : error && showEmptyStates ? (
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
          ) : activeView === 'learning' ? (
            <LearningView child={selectedChild} />
          ) : activeView === 'insights' ? (
            <InsightsView child={selectedChild} />
          ) : activeView === 'rafiki' ? (
            <RafikiView
              childFirstName={childFirstName}
              draft={rafikiDraft}
              focusArea={getFocusTopics(selectedChild)[0] ?? null}
              isThinking={isRafikiThinking}
              messages={rafikiMessages}
              parentFirstName={parentFirstName}
              onChangeDraft={setRafikiDraft}
              onSend={sendRafikiMessage}
            />
          ) : (
            <View style={styles.homeContent}>
              <View>
                <ThisWeekCard child={selectedChild} mascotKey={mascotKey} score={score} />

                <QuickActionsCard
                  isStartingFocusMode={isStartingFocusMode}
                  onLockPhone={onStartFocusMode}
                  onMessages={() => setActiveView('messages')}
                  onPayFees={externalPaymentsEnabled ? onOpenBilling : undefined}
                  onViewReport={() => setActiveView('insights')}
                  showPaymentAction={externalPaymentsEnabled}
                />

                {focusModeActive || focusModeSetupRequired || focusModeError ? (
                  <FocusModeNotice
                    active={focusModeActive}
                    setupRequired={focusModeSetupRequired}
                    setupCompleted={focusModeSetupCompleted}
                    error={focusModeError}
                    secondsRemaining={focusModeSecondsRemaining}
                    limitSeconds={dailyLimitSeconds}
                    isStarting={isStartingFocusMode}
                    onStart={onStartFocusMode}
                    onOpenSettings={onOpenFocusModeSettings}
                  />
                ) : null}
              </View>

              <View style={styles.homeSection}>
                <View style={styles.glanceHeaderRow}>
                  <SectionTitle title="Today at a glance" />
                  <GlanceRangeTabs range={glanceRange} onChange={setGlanceRange} />
                </View>
                <GlanceCards child={selectedChild} range={glanceRange} />
              </View>

              <View style={styles.homeSection}>
                <View style={styles.progressHeaderRow}>
                  <SectionTitle title="Recent progress" />
                  <Pressable onPress={() => setActiveView('insights')} style={styles.viewAllLink}>
                    <Text style={styles.viewAllLinkText}>View all</Text>
                  </Pressable>
                </View>
                <RecentProgress child={selectedChild} />
              </View>

              <View style={styles.homeFooter}>
                <TeacherNoteCard
                  note={latestTeacherNote}
                  onReply={() => setActiveView('messages')}
                />

                <Text style={styles.footerCount}>{childCountLabel}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {isAccountOpen ? (
          <View pointerEvents="box-none" style={styles.accountOverlayLayer}>
            <Pressable
              accessibilityLabel="Dismiss parent account profile"
              onPress={() => setIsAccountOpen(false)}
              style={styles.accountOverlayDismiss}
            />
            <View style={styles.accountOverlayCardWrap}>
              <ParentAccountPanel
                childrenCount={children.length}
                parentEmail={parentEmail}
                parentName={parentDisplayName}
                parentPhone={parentPhone}
                parentRole={parentRole}
                onClose={() => setIsAccountOpen(false)}
                onSaveProfile={onSaveParentProfile}
                onSignOut={onSignOut}
              />
            </View>
          </View>
        ) : null}

        <BottomNavigation activeView={activeView} onSelect={switchTab} />
      </View>
    </View>
  );
}

function DashboardHeader({
  childName,
  childrenCount,
  isLoading,
  isChildMenuOpen,
  parentFirstName,
  onRefresh,
  onToggleAccount,
  onToggleChildMenu,
}: {
  childName: string | null;
  childrenCount: number;
  isLoading: boolean;
  isChildMenuOpen: boolean;
  parentFirstName: string;
  onRefresh: () => void;
  onToggleAccount: () => void;
  onToggleChildMenu: () => void;
}) {
  const childLabel = childName ?? (childrenCount > 0 ? 'Select child' : 'Add child');
  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityLabel="Open parent account profile"
        onPress={onToggleAccount}
        style={styles.accountAvatarButton}>
        <ParentAvatar name={parentFirstName} size={44} />
      </Pressable>

      <Pressable
        accessibilityLabel="Switch child"
        onPress={onToggleChildMenu}
        style={styles.headerChildIdentity}>
          <View style={styles.headerTextWrap}>
            <Text numberOfLines={1} style={styles.headerGreeting}>
              {getTimeGreeting()}, {parentFirstName}
            </Text>
            <View style={styles.headerTitleRow}>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {childLabel}
              </Text>
              <ChevronDown
                color={INK}
                size={18}
                strokeWidth={2.6}
                style={isChildMenuOpen ? styles.chevronFlipped : undefined}
              />
            </View>
          </View>
      </Pressable>

      <Pressable
        accessibilityLabel="Refresh dashboard"
        onPress={onRefresh}
        style={styles.bellButton}>
        {isLoading ? (
          <ActivityIndicator color={ACCENT} size="small" />
        ) : (
          <>
            <Bell color={INK} size={26} strokeWidth={2.2} />
            <View style={styles.notificationDot} />
          </>
        )}
      </Pressable>
    </View>
  );
}

function ParentAvatar({ name, size }: { name: string; size: number }) {
  const initials = getInitials(name);
  return (
    <View style={[styles.parentAvatar, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={styles.parentAvatarText}>{initials}</Text>
    </View>
  );
}

function ChildAvatar({ size }: { size: number }) {
  return (
    <View style={[styles.childAvatar, { borderRadius: size / 2, height: size, width: size }]}>
      <Svg height={size - 8} viewBox="0 0 64 64" width={size - 8}>
        <Circle cx="32" cy="30" r="17" fill="#8A4B2D" />
        <Circle cx="21" cy="20" r="8" fill="#241410" />
        <Circle cx="31" cy="14" r="9" fill="#241410" />
        <Circle cx="41" cy="17" r="8" fill="#241410" />
        <Circle cx="46" cy="26" r="7" fill="#241410" />
        <Ellipse cx="32" cy="33" rx="14" ry="16" fill="#A3653D" />
        <Circle cx="27" cy="32" r="1.8" fill="#111111" />
        <Circle cx="38" cy="32" r="1.8" fill="#111111" />
        <Path d="M28 40c3 3 8 3 11 0" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.2" />
        <Path d="M17 64c2-12 8-18 15-18s13 6 15 18H17z" fill="#F97316" />
      </Svg>
    </View>
  );
}

function ParentAccountPanel({
  childrenCount,
  parentEmail,
  parentName,
  parentPhone,
  parentRole,
  onClose,
  onSaveProfile,
  onSignOut,
}: {
  childrenCount: number;
  parentEmail?: string | null;
  parentName: string;
  parentPhone?: string | null;
  parentRole?: string | null;
  onClose: () => void;
  onSaveProfile?: (updates: { name: string; email: string; phone: string }) => void;
  onSignOut: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(parentName);
  const [draftEmail, setDraftEmail] = useState(parentEmail?.trim() || '');
  const [draftPhone, setDraftPhone] = useState(parentPhone?.trim() || '');
  const roleLabel = formatAccountRole(parentRole);
  const childCountLabel = childrenCount === 1 ? '1 linked child' : `${childrenCount} linked children`;

  useEffect(() => {
    if (!isEditing) {
      setDraftName(parentName);
      setDraftEmail(parentEmail?.trim() || '');
      setDraftPhone(parentPhone?.trim() || '');
    }
  }, [isEditing, parentEmail, parentName, parentPhone]);

  function cancelEdit() {
    setDraftName(parentName);
    setDraftEmail(parentEmail?.trim() || '');
    setDraftPhone(parentPhone?.trim() || '');
    setIsEditing(false);
  }

  function saveEdit() {
    const nextName = draftName.trim() || parentName;
    onSaveProfile?.({
      name: nextName,
      email: draftEmail.trim(),
      phone: draftPhone.trim(),
    });
    setIsEditing(false);
  }

  return (
    <View style={styles.accountPanel}>
      <View style={styles.accountPanelHeader}>
        <Pressable
          accessibilityLabel="Close parent account profile"
          onPress={onClose}
          style={styles.accountPanelAvatarButton}>
          <ParentAvatar name={parentName} size={48} />
        </Pressable>
        <View style={styles.accountPanelHeaderText}>
          <Text numberOfLines={1} style={styles.accountPanelName}>
            {parentName}
          </Text>
          <Text style={styles.accountPanelRole}>{roleLabel}</Text>
        </View>
        <Pressable
          accessibilityLabel="Edit parent profile"
          onPress={() => setIsEditing(true)}
          style={[styles.accountEditButton, isEditing && styles.accountEditButtonActive]}>
          <Pencil color={isEditing ? ACCENT : MUTED} size={16} strokeWidth={2.4} />
        </Pressable>
      </View>

      {isEditing ? (
        <View style={styles.accountEditFields}>
          <AccountEditField label="Name" value={draftName} onChangeText={setDraftName} />
          <AccountEditField
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            value={draftEmail}
            onChangeText={setDraftEmail}
          />
          <AccountEditField
            keyboardType="phone-pad"
            label="Phone"
            value={draftPhone}
            onChangeText={setDraftPhone}
          />
          <View style={styles.accountEditActions}>
            <Pressable onPress={cancelEdit} style={styles.accountEditSecondary}>
              <Text style={styles.accountEditSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!draftName.trim()}
              onPress={saveEdit}
              style={[styles.accountEditPrimary, !draftName.trim() && styles.accountEditPrimaryDisabled]}>
              <Text style={styles.accountEditPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.accountDetailGrid}>
          <AccountDetail label="Email" value={parentEmail?.trim() || 'Not added'} />
          <AccountDetail label="Phone" value={parentPhone?.trim() || 'Not added'} />
          <AccountDetail label="Account type" value={roleLabel} />
          <AccountDetail label="Children" value={childCountLabel} />
        </View>
      )}

      <Pressable onPress={onSignOut} style={styles.accountSignOutButton}>
        <LogOut color="#DC2626" size={17} strokeWidth={2.4} />
        <Text style={styles.accountSignOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function AccountEditField({
  autoCapitalize = 'words',
  keyboardType = 'default',
  label,
  value,
  onChangeText,
}: {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.accountEditField}>
      <Text style={styles.accountEditLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor="#9CA3AF"
        style={styles.accountEditInput}
        value={value}
      />
    </View>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.accountDetailRow}>
      <Text style={styles.accountDetailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.accountDetailValue}>
        {value}
      </Text>
    </View>
  );
}

function ChildManagerPanel({
  childrenList,
  confirmRemoveId,
  error,
  isLinking,
  linkIdentifier,
  linkMethod,
  selectedChildId,
  onConfirmRemove,
  onLinkChild,
  onLinkIdentifierChange,
  onLinkMethodChange,
  onSelectChild,
  onUnlinkChild,
}: {
  childrenList: ParentChildSummary[];
  confirmRemoveId: string | null;
  error: string | null;
  isLinking: boolean;
  linkIdentifier: string;
  linkMethod: 'email' | 'phone';
  selectedChildId: string | null;
  onConfirmRemove: (childId: string | null) => void;
  onLinkChild: () => void;
  onLinkIdentifierChange: (value: string) => void;
  onLinkMethodChange: (method: 'email' | 'phone') => void;
  onSelectChild: (childId: string) => void;
  onUnlinkChild: (childId: string) => void;
}) {
  return (
    <View style={styles.childManager}>
      {childrenList.map(child => {
        const active = child.id === selectedChildId;
        const pendingRemoval = confirmRemoveId === child.id;
        return (
          <View key={child.id} style={[styles.childManagerRow, active && styles.childManagerRowActive]}>
            <Pressable onPress={() => onSelectChild(child.id)} style={styles.childManagerMain}>
              <ChildAvatar size={38} />
              <View style={styles.childManagerTextWrap}>
                <Text numberOfLines={1} style={[styles.childManagerName, active && styles.childManagerNameActive]}>
                  {child.name}
                </Text>
                <Text style={styles.childManagerMeta}>{child.grade}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() =>
                pendingRemoval ? onUnlinkChild(child.id) : onConfirmRemove(child.id)
              }
              style={styles.childRemoveButton}>
              <Trash2 color="#DC2626" size={14} strokeWidth={2.4} />
              <Text style={styles.childRemoveText}>{pendingRemoval ? 'Confirm' : 'Remove'}</Text>
            </Pressable>
          </View>
        );
      })}

      <Text style={styles.childManagerLabel}>Add another child</Text>
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

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ThisWeekCard({
  child,
  mascotKey,
  score,
}: {
  child: ParentChildSummary;
  mascotKey: OnboardingMascotKey;
  score: number;
}) {
  const firstName = getFirstName(child.name);
  const headline =
    score >= 80
      ? `${firstName} is thriving`
      : score >= 70
        ? `${firstName} is on track`
      : score > 0
        ? `${firstName} needs a boost`
        : `${firstName} is getting started`;
  const subline =
    score >= 80
      ? 'Strong average across tests and learning performance.'
      : score >= 70
        ? 'Steady performance across recent learning checks.'
      : score > 0
        ? 'Use this snapshot to spot where support is needed.'
        : `Progress appears here as ${firstName} learns.`;

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroEyebrow}>Average Performance</Text>
        <Text style={styles.heroTitle}>{headline}</Text>
        <Text style={styles.heroSubtitle}>{subline}</Text>
      </View>
      <PerformanceRing mascotKey={mascotKey} score={score} />
    </View>
  );
}

function PerformanceRing({
  mascotKey,
  score,
}: {
  mascotKey: OnboardingMascotKey;
  score: number;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - progress / 100);
  const ringColor = getPerformanceColor(score);

  return (
    <View style={styles.ringWrap}>
      <Svg height={90} viewBox="0 0 90 90" width={90}>
        <Circle cx="45" cy="45" fill="none" r={radius} stroke="#F5E3D3" strokeWidth="8" />
        <G transform="rotate(-90 45 45)">
          <Circle
            cx="45"
            cy="45"
            fill="none"
            r={radius}
            stroke={ringColor}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            strokeWidth="8"
          />
        </G>
      </Svg>
      <View style={styles.performanceMascotWrap}>
        <Image
          accessibilityLabel="Selected mascot reacting to performance"
          resizeMode="contain"
          source={MASCOT_ART[mascotKey]}
          style={styles.performanceMascot}
        />
      </View>
      <View style={styles.ringCenter}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.68}
          numberOfLines={1}
          style={[styles.ringScore, { color: ringColor }]}>
          {score}%
        </Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.62} numberOfLines={2} style={styles.ringLabel}>
          Average Performance
        </Text>
      </View>
    </View>
  );
}

function QuickActionsCard({
  isStartingFocusMode,
  onLockPhone,
  onMessages,
  onPayFees,
  onViewReport,
  showPaymentAction,
}: {
  isStartingFocusMode: boolean;
  onLockPhone: () => void;
  onMessages: () => void;
  onPayFees?: () => void;
  onViewReport: () => void;
  showPaymentAction: boolean;
}) {
  return (
    <View style={styles.quickCard}>
      {showPaymentAction ? (
        <QuickAction
          icon={<WalletCards color={ACCENT} size={26} strokeWidth={2.3} />}
          iconBackground="#FFEDD5"
          label={'Pay\nsubscription'}
          onPress={onPayFees}
        />
      ) : null}
      <QuickAction
        icon={<FileBarChart color="#16A34A" size={26} strokeWidth={2.3} />}
        iconBackground="#DCFCE7"
        label={'View\nreport'}
        onPress={onViewReport}
      />
      <QuickAction
        icon={<MessageSquareText color="#15803D" size={26} strokeWidth={2.3} />}
        iconBackground="#DCFCE7"
        label={'Message\nteacher'}
        onPress={onMessages}
      />
      <QuickAction
        icon={<LockKeyhole color="#2563EB" size={26} strokeWidth={2.3} />}
        iconBackground="#DBEAFE"
        isLoading={isStartingFocusMode}
        label={'Lock\nphone'}
        onPress={onLockPhone}
      />
    </View>
  );
}

function QuickAction({
  icon,
  iconBackground,
  isLoading,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  isLoading?: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.quickAction}>
      <View style={[styles.quickIconBox, { backgroundColor: iconBackground }]}>
        {isLoading ? <ActivityIndicator color={ACCENT} /> : icon}
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function GlanceRangeTabs({
  range,
  onChange,
}: {
  range: GlanceRange;
  onChange: (range: GlanceRange) => void;
}) {
  const options: Array<{ key: GlanceRange; label: string }> = [
    { key: 'week', label: 'This week' },
    { key: 'month', label: 'This month' },
    { key: 'year', label: 'Year so far' },
  ];
  return (
    <View style={styles.rangeTabs}>
      {options.map(option => {
        const active = option.key === range;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.rangeTab, active && styles.rangeTabActive]}>
            <Text style={[styles.rangeTabText, active && styles.rangeTabTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function GlanceCards({ child, range }: { child: ParentChildSummary; range: GlanceRange }) {
  const stats = getGlanceStats(child, range);
  const comparisons = getGlanceComparisons(child, range);
  return (
    <View style={styles.glanceRow}>
      <GlanceCard
        comparison={comparisons.minutes}
        label="Active learning"
        value={`${stats.minutes} min`}
      />
      <GlanceCard
        comparison={comparisons.topics}
        label="Topics learned"
        value={String(stats.topics)}
      />
      <GlanceCard
        comparison={comparisons.assignments}
        label="Assignments due"
        value={String(stats.due)}
      />
    </View>
  );
}

function GlanceCard({
  comparison,
  icon,
  iconBackground,
  label,
  value,
}: {
  comparison?: { text: string; tone: GlanceComparisonTone };
  icon?: React.ReactNode;
  iconBackground?: string;
  label: string;
  value: string;
}) {
  const textOnly = !icon;
  return (
    <View style={[styles.glanceCard, textOnly && styles.glanceCardTextOnly]}>
      {icon ? (
        <View style={[styles.glanceIconBox, { backgroundColor: iconBackground }]}>{icon}</View>
      ) : null}
      <Text style={[styles.glanceValue, textOnly && styles.glanceValueTextOnly]}>{value}</Text>
      <Text style={[styles.glanceLabel, textOnly && styles.glanceLabelTextOnly]}>{label}</Text>
      {comparison ? (
        <Text
          numberOfLines={1}
          style={[
            styles.glanceComparison,
            comparison.tone === 'positive' && styles.glanceComparisonPositive,
            comparison.tone === 'negative' && styles.glanceComparisonNegative,
          ]}>
          {comparison.text}
        </Text>
      ) : null}
    </View>
  );
}

function RecentProgress({ child }: { child: ParentChildSummary }) {
  const strengths = getStrengthRows(child).map((label, index) => ({
    label,
    status: getStrengthStatus(child, index),
  }));
  const focus = getFocusTopics(child);

  return (
    <View style={styles.progressRow}>
      <View style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <Text style={[styles.progressCardTitle, styles.progressCardTitleSuccess]}>Strengths</Text>
          <View style={[styles.progressCardIcon, styles.progressCardIconSuccess]}>
            <Trophy color="#16A34A" size={17} strokeWidth={2.4} />
          </View>
        </View>
        {strengths.length > 0 ? (
          strengths.map(item => (
            <View key={item.label} style={styles.progressItemRow}>
              <Text numberOfLines={1} style={styles.progressItemName}>
                {item.label}
              </Text>
              <View style={[styles.progressBadge, styles.progressBadgeGreen]}>
                <Text numberOfLines={1} style={styles.progressBadgeGreenText}>
                  {item.status}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.progressEmptyText}>Strengths will appear as learning data grows.</Text>
        )}
      </View>
      <View style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <Text style={[styles.progressCardTitle, styles.progressCardTitleFocus]}>Needs focus</Text>
          <View style={[styles.progressCardIcon, styles.progressCardIconFocus]}>
            <Target color="#EA580C" size={17} strokeWidth={2.4} />
          </View>
        </View>
        {focus.length > 0 ? (
          focus.map(item => (
            <View key={item} style={styles.progressItemRow}>
              <Text numberOfLines={1} style={styles.progressItemName}>
                {item}
              </Text>
              <View style={[styles.progressBadge, styles.progressBadgeOrange]}>
                <Text numberOfLines={1} style={styles.progressBadgeOrangeText}>
                  Work on this
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.progressEmptyText}>No focus areas yet.</Text>
        )}
      </View>
    </View>
  );
}

function ParentingTipsCard() {
  const tips = [
    { icon: <Target color="#16A34A" size={17} strokeWidth={2.4} />, label: 'Praise effort, not just marks' },
    { icon: <HelpCircle color="#16A34A" size={17} strokeWidth={2.4} />, label: 'Ask what felt hard today' },
    { icon: <BookOpen color="#16A34A" size={17} strokeWidth={2.4} />, label: 'Read together for 10 min' },
  ];
  return (
    <View style={styles.tipsCard}>
      <Text style={styles.tipsTitle}>Parenting tips</Text>
      {tips.map(tip => (
        <View key={tip.label} style={styles.tipRow}>
          <View style={styles.tipIcon}>{tip.icon}</View>
          <Text numberOfLines={1} style={styles.tipText}>
            {tip.label}
          </Text>
        </View>
      ))}
      <View style={styles.tipFooter}>
        <Shield color={MUTED} size={15} strokeWidth={2.2} />
        <Text style={styles.tipFooterText}>Small daily support builds confidence.</Text>
      </View>
    </View>
  );
}

function TeacherNoteCard({
  note,
  onReply,
}: {
  note: TeacherParentMessage | null;
  onReply: () => void;
}) {
  return (
    <>
      <SectionTitle title="Teacher note" />
      <View style={styles.teacherNoteCard}>
        <TeacherAvatar />
        <View style={styles.teacherNoteBody}>
          <Text style={styles.teacherNoteFrom}>{note ? `From ${note.sender_name}` : 'No teacher note yet'}</Text>
          <Text numberOfLines={2} style={styles.teacherNoteText}>
            {note ? note.body : 'Teacher messages will appear here once they reach out.'}
          </Text>
        </View>
        <Pressable onPress={onReply} style={styles.replyButton}>
          <Text style={styles.replyText}>{note ? 'Reply' : 'Open'}</Text>
        </Pressable>
      </View>
    </>
  );
}

function TeacherAvatar() {
  return (
    <View style={styles.teacherAvatar}>
      <Svg height={52} viewBox="0 0 52 52" width={52}>
        <Circle cx="26" cy="26" r="26" fill="#E8EBEF" />
        <Path d="M9 52c3.2-11 9.3-16.5 17-16.5S39.8 41 43 52H9z" fill="#262B38" />
        <Circle cx="26" cy="24" r="11.2" fill="#9A5A43" />
        <Path
          d="M13.8 25.5c0-11 5.4-18 12.3-18s12.4 7 12.4 18c-2.2-7-6-10.2-12.4-10.2S16 18.5 13.8 25.5z"
          fill="#1D1110"
        />
        <Path d="M16.3 20.8c3-7.8 15.5-10 21 0-6-2.5-14.1-2.5-21 0z" fill="#251311" />
        <Circle cx="22.2" cy="24.3" r="1.2" fill="#121212" />
        <Circle cx="29.8" cy="24.3" r="1.2" fill="#121212" />
        <Path d="M23.1 29.7c1.8 1.7 4.1 1.7 5.9 0" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="1.6" />
        <Path d="M20 38.5h12l-6 5.8-6-5.8z" fill="#FFFFFF" opacity="0.9" />
      </Svg>
    </View>
  );
}

function LearningView({ child }: { child: ParentChildSummary }) {
  const stats = getGlanceStats(child, 'week');
  const assignments = child.recent_assignments;
  const hasTrendActivity = child.weekly_trends.some(
    item => item.lessonsCompleted > 0 || item.assignmentsCompleted > 0 || item.assessmentAverage > 0,
  );
  const maxActivity = Math.max(
    1,
    ...child.weekly_trends.map(item => item.lessonsCompleted + item.assignmentsCompleted),
  );

  return (
    <View style={styles.subViewWrap}>
      <Text style={styles.subViewTitle}>Learning activity</Text>
      <Text style={styles.subViewSubtitle}>
        What {getFirstName(child.name)} has been working on.
      </Text>

      <View style={styles.glanceRow}>
        <GlanceCard
          icon={<Clock3 color="#2563EB" size={22} strokeWidth={2.3} />}
          iconBackground="#DBEAFE"
          label="Active learning"
          value={`${stats.minutes} min`}
        />
        <GlanceCard
          icon={<Target color="#16A34A" size={22} strokeWidth={2.3} />}
          iconBackground="#DCFCE7"
          label="Topics learned"
          value={String(stats.topics)}
        />
        <GlanceCard
          icon={<CheckCircle2 color="#15803D" size={22} strokeWidth={2.3} />}
          iconBackground="#DCFCE7"
          label="Assignments due"
          value={String(stats.due)}
        />
      </View>

      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <ClipboardList color="#15803D" size={19} strokeWidth={2.4} />
          <Text style={styles.panelTitle}>Assignments</Text>
        </View>
        {assignments.length === 0 ? (
          <Text style={styles.panelBodyText}>No assignments yet.</Text>
        ) : (
          assignments.map(assignment => (
            <AssignmentRow key={assignment.id} assignment={assignment} />
          ))
        )}
      </View>

      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <BarChart3 color={ACCENT} size={19} strokeWidth={2.4} />
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
          <Text style={styles.panelBodyText}>
            Weekly activity appears after lessons, assignments, or exams are completed.
          </Text>
        )}
      </View>
    </View>
  );
}

function AssignmentRow({ assignment }: { assignment: ParentChildAssignment }) {
  const isCompleted = assignment.status === 'completed';
  return (
    <View style={styles.assignmentRow}>
      <View style={styles.assignmentIconBox}>
        <ClipboardList color="#15803D" size={18} strokeWidth={2.4} />
      </View>
      <View style={styles.assignmentTextWrap}>
        <Text numberOfLines={1} style={styles.assignmentTitle}>
          {assignment.title}
        </Text>
        <Text style={styles.assignmentMeta}>
          {assignment.subject}
          {assignment.score !== null ? ` - ${assignment.score}%` : ''}
        </Text>
      </View>
      <View
        style={[
          styles.assignmentStatusPill,
          isCompleted ? styles.statusPillDone : styles.statusPillDue,
        ]}>
        <Text
          style={[
            styles.assignmentStatusText,
            isCompleted ? styles.statusPillDoneText : styles.statusPillDueText,
          ]}>
          {isCompleted ? 'Done' : 'Due'}
        </Text>
      </View>
    </View>
  );
}

function InsightsView({ child }: { child: ParentChildSummary }) {
  const report = child.weekly_report;
  const hasTrendActivity = child.weekly_trends.some(
    item => item.lessonsCompleted > 0 || item.assignmentsCompleted > 0 || item.assessmentAverage > 0,
  );

  return (
    <View style={styles.subViewWrap}>
      <Text style={styles.subViewTitle}>Insights</Text>
      <Text style={styles.subViewSubtitle}>This week for {getFirstName(child.name)}</Text>

      <View style={styles.summaryStrip}>
        <Text style={styles.summaryStripText}>
          {report.activeDays} active days - {report.lessonsCompleted} lessons - {report.assignmentsCompleted} assignments
        </Text>
      </View>

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

      <ReportList
        title="Strengths"
        items={report.strengths}
        empty="Strengths will appear as learning data grows."
        tone="success"
      />
      <ReportList
        title="Focus next"
        items={report.focusAreas}
        empty="No urgent focus areas this week."
        tone="focus"
      />

      <ParentingTipsCard />
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
    <View style={styles.panelCard}>
      <View style={styles.panelHeader}>
        {tone === 'success' ? (
          <CheckCircle2 color="#16A34A" size={19} strokeWidth={2.4} />
        ) : (
          <Target color={ACCENT} size={19} strokeWidth={2.4} />
        )}
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      {renderedItems.map(item => (
        <View key={item} style={styles.reportListRow}>
          <View
            style={[styles.reportDot, tone === 'success' ? styles.reportDotSuccess : styles.reportDotFocus]}
          />
          <Text style={styles.reportListText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function RafikiView({
  childFirstName,
  draft,
  focusArea,
  isThinking,
  messages,
  parentFirstName,
  onChangeDraft,
  onSend,
}: {
  childFirstName: string;
  draft: string;
  focusArea: string | null;
  isThinking: boolean;
  messages: ChatMessage[];
  parentFirstName: string;
  onChangeDraft: (value: string) => void;
  onSend: (text?: string) => void;
}) {
  const suggestions = [
    `How is ${childFirstName} doing this week?`,
    'What should we practice at home?',
    ...(focusArea ? [`How can I help with ${focusArea}?`] : []),
  ];

  return (
    <View style={styles.subViewWrap}>
      <View style={styles.rafikiHeaderRow}>
        <View style={styles.rafikiBadge}>
          <Sparkles color={ACCENT} size={20} strokeWidth={2.3} />
        </View>
        <View>
          <Text style={styles.subViewTitle}>Ask Rafiki</Text>
          <Text style={styles.subViewSubtitle}>
            Questions about {childFirstName}'s learning, answered.
          </Text>
        </View>
      </View>

      <View style={styles.rafikiThread}>
        <View style={[styles.rafikiBubble, styles.rafikiBubbleModel]}>
          <Text style={styles.rafikiBubbleText}>
            Hi {parentFirstName}! I'm Rafiki. Ask me anything about {childFirstName}'s learning
            and how to help at home.
          </Text>
        </View>
        {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={[
                styles.rafikiBubble,
                message.role === 'user' ? styles.rafikiBubbleUser : styles.rafikiBubbleModel,
              ]}>
              <Text
                style={[
                  styles.rafikiBubbleText,
                  message.role === 'user' && styles.rafikiBubbleTextUser,
                ]}>
                {message.text}
              </Text>
              {message.role === 'model' ? (
                <ReportAiContentSheet
                  accessibilityLabel="Report Rafiki response"
                  contentText={message.text}
                  context={{
                    childFirstName,
                    focusArea,
                    messageIndex: index,
                  }}
                  source="parent_progress_assistant"
                />
              ) : null}
            </View>
        ))}
        {isThinking ? (
          <View style={[styles.rafikiBubble, styles.rafikiBubbleModel, styles.rafikiThinkingRow]}>
            <ActivityIndicator color={ACCENT} size="small" />
            <Text style={styles.rafikiThinkingText}>Rafiki is thinking...</Text>
          </View>
        ) : null}
      </View>

      {messages.length === 0 ? (
        <View style={styles.rafikiSuggestions}>
          {suggestions.map(suggestion => (
            <Pressable
              key={suggestion}
              disabled={isThinking}
              onPress={() => onSend(suggestion)}
              style={styles.rafikiSuggestionChip}>
              <Text style={styles.rafikiSuggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.rafikiComposer}>
        <TextInput
          editable={!isThinking}
          multiline
          onChangeText={onChangeDraft}
          placeholder={`Ask about ${childFirstName}'s learning...`}
          placeholderTextColor="#9CA3AF"
          style={styles.rafikiInput}
          value={draft}
        />
        <Pressable
          disabled={draft.trim().length === 0 || isThinking}
          onPress={() => onSend()}
          style={[
            styles.rafikiSendButton,
            (draft.trim().length === 0 || isThinking) && styles.disabledButton,
          ]}>
          <Send color="#FFFFFF" size={19} strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
}

function FocusModeNotice({
  active,
  setupRequired,
  setupCompleted,
  error,
  secondsRemaining,
  limitSeconds,
  isStarting,
  onStart,
  onOpenSettings,
}: {
  active: boolean;
  setupRequired: boolean;
  setupCompleted: boolean;
  error: string | null;
  secondsRemaining: number;
  limitSeconds: number;
  isStarting: boolean;
  onStart: () => void;
  onOpenSettings: () => void;
}) {
  const showFirstTimeInstructions = !setupCompleted;
  const startButtonLabel = setupCompleted && !setupRequired ? 'Enter PIN' : 'Start Focus Mode';
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
      {showFirstTimeInstructions ? (
        <>
          <Text style={styles.focusNoticeText}>Focus Mode keeps KITABU on screen while your child learns.</Text>
          <Text style={styles.focusNoticeText}>To leave Focus Mode, Android will ask for your phone PIN.</Text>
          <Text style={styles.focusNoticeText}>KITABU does not create a separate PIN.</Text>
        </>
      ) : (
        <Text style={styles.focusNoticeText}>
          Enter your parent PIN to start Focus Mode for this student.
        </Text>
      )}

      {active ? (
        <View style={styles.focusStatusRow}>
          <Clock3 color="#0F8A4B" size={16} strokeWidth={2.4} />
          <Text style={styles.focusStatusText}>Active - {formatDuration(secondsRemaining)} remaining</Text>
        </View>
      ) : null}

      {setupRequired ? (
        <View style={styles.focusSetupBox}>
          <Text style={styles.focusSetupTitle}>
            {showFirstTimeInstructions
              ? 'Turn on App Pinning to keep KITABU on screen.'
              : 'Focus Mode setup needs attention.'}
          </Text>
          {showFirstTimeInstructions ? (
            <>
              <Text style={styles.focusSetupText}>
                After turning it on, Android will ask for your phone PIN when someone tries to leave KITABU.
              </Text>
              <Text style={styles.focusSetupText}>
                If the phone does not have a PIN, set one in Android security settings first.
              </Text>
            </>
          ) : (
            <Text style={styles.focusSetupText}>
              Check Android security settings, then enter your parent PIN again.
            </Text>
          )}
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
        {isStarting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.focusButtonText}>{startButtonLabel}</Text>}
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
      {isLoading ? <ActivityIndicator color={ACCENT} /> : null}
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
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportedMessageIds, setReportedMessageIds] = useState<Record<string, boolean>>({});
  const [reportError, setReportError] = useState<string | null>(null);

  async function reportMessage(message: TeacherParentMessage) {
    if (reportingMessageId || reportedMessageIds[message.id]) {
      return;
    }

    setReportError(null);
    setReportingMessageId(message.id);
    try {
      await reportTeacherParentMessage(message.id);
      setReportedMessageIds(current => ({ ...current, [message.id]: true }));
    } catch (reportFailure) {
      setReportError(reportFailure instanceof Error ? reportFailure.message : 'Could not report this message.');
    } finally {
      setReportingMessageId(null);
    }
  }

  return (
    <View style={styles.subViewWrap}>
      <View style={styles.messagesTopRow}>
        <View>
          <Text style={styles.subViewTitle}>Messages</Text>
          <Text style={styles.subViewSubtitle}>
            {selectedTeacher ? selectedTeacher.sender_name : 'Teacher chat'}
            {isLoading ? ' - Loading...' : ''}
          </Text>
        </View>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teacherTabs}>
        {teachers.length === 0 ? (
          <View style={styles.teacherEmptyChip}>
            <Text style={styles.teacherEmptyText}>No active teacher chats</Text>
          </View>
        ) : (
          teachers.map(thread => {
            const active = thread.teacher_user_id === activeTeacherId;
            return (
              <Pressable
                key={thread.teacher_user_id}
                onPress={() => onSelectTeacher(thread.teacher_user_id)}
                style={[styles.teacherChip, active && styles.teacherChipActive]}>
                <Text style={[styles.teacherChipText, active && styles.teacherChipTextActive]}>
                  {thread.sender_name}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {error ? <Text style={styles.messageError}>{error}</Text> : null}

      <View style={styles.messageThread}>
        {messages.length === 0 ? (
          <View style={styles.messageEmpty}>
            <Text style={styles.messageEmptyTitle}>No messages yet</Text>
            <Text style={styles.messageEmptyText}>
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
                  styles.messageBubble,
                  fromParent ? styles.messageBubbleMine : styles.messageBubbleTeacher,
                ]}>
                <Text style={styles.messageSender}>{message.sender_name}</Text>
                <Text style={styles.messageBody}>{message.body}</Text>
                <View style={styles.messageMetaRow}>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleString()}
                  </Text>
                  <Pressable
                    accessibilityLabel={reportedMessageIds[message.id] ? 'Message reported' : 'Report message'}
                    disabled={reportingMessageId === message.id || reportedMessageIds[message.id]}
                    onPress={() => reportMessage(message)}
                    style={[
                      styles.messageReportButton,
                      reportedMessageIds[message.id] && styles.messageReportButtonSubmitted,
                    ]}>
                    <Flag
                      color={reportedMessageIds[message.id] ? '#16A34A' : '#64748B'}
                      size={12}
                      strokeWidth={2.4}
                    />
                    <Text
                      style={[
                        styles.messageReportText,
                        reportedMessageIds[message.id] && styles.messageReportTextSubmitted,
                      ]}>
                      {reportedMessageIds[message.id]
                        ? 'Reported'
                        : reportingMessageId === message.id
                          ? 'Reporting...'
                          : 'Report'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
      {reportError ? <Text style={styles.messageReportError}>{reportError}</Text> : null}

      <View style={styles.messageComposer}>
        <TextInput
          editable={Boolean(activeTeacherId) && !isSending}
          multiline
          onChangeText={onChangeDraft}
          placeholder={
            activeTeacherId
              ? 'Reply to the teacher...'
              : 'A teacher must start the conversation first.'
          }
          placeholderTextColor="#9CA3AF"
          style={styles.messageInput}
          value={draft}
        />
        <Pressable
          disabled={!activeTeacherId || draft.trim().length === 0 || isSending}
          onPress={onSend}
          style={[
            styles.messageSendButton,
            (!activeTeacherId || draft.trim().length === 0 || isSending) && styles.disabledButton,
          ]}>
          <Text style={styles.messageSendText}>{isSending ? 'Sending...' : 'Send'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BottomNavigation({
  activeView,
  onSelect,
}: {
  activeView: DashboardView;
  onSelect: (tab: DashboardTab) => void;
}) {
  return (
    <View style={styles.bottomNav}>
      <NavItem
        active={activeView === 'home' || activeView === 'messages'}
        icon={<Home />}
        label="Home"
        onPress={() => onSelect('home')}
      />
      <NavItem
        active={activeView === 'learning'}
        icon={<BookOpen />}
        label="Learning"
        onPress={() => onSelect('learning')}
      />
      <NavItem
        active={activeView === 'insights'}
        icon={<Lightbulb />}
        label="Insights"
        onPress={() => onSelect('insights')}
      />
      <NavItem
        active={activeView === 'rafiki'}
        icon={<MessageCircleMore />}
        label="Ask Rafiki"
        onPress={() => onSelect('rafiki')}
      />
    </View>
  );
}

function NavItem({
  active,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: React.ReactElement<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress: () => void;
}) {
  const color = active ? ACCENT : '#5B5C61';
  return (
    <Pressable onPress={onPress} style={styles.navItem}>
      <View style={[styles.navIndicator, active && styles.navIndicatorActive]} />
      {React.cloneElement(icon, { color, size: 25, strokeWidth: active ? 2.7 : 2.3 })}
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function getTimeGreeting(date = new Date()) {
  const hours = date.getHours();
  if (hours < 12) {
    return 'Good morning';
  }
  if (hours < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'Parent';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'P';
  }
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
}

function formatAccountRole(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) {
    return 'Parent';
  }
  return normalized
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getOverallScore(child: ParentChildSummary) {
  const assignmentScores = child.recent_assignments
    .map(assignment => assignment.score)
    .filter((score): score is number => score !== null && score > 0);
  const trendScores = child.weekly_trends.flatMap(item => [
    item.assessmentAverage,
    item.weeklyExamScore ?? 0,
  ]);
  const candidates = [
    hasAssessmentData(child) ? child.assessment_average : 0,
    hasMasteryData(child) ? child.mastery_average : 0,
    child.diagnostic.completed ? child.diagnostic.percentage ?? 0 : 0,
    ...assignmentScores,
    ...trendScores,
  ].filter(value => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) {
    return 0;
  }
  const total = candidates.reduce((sum, value) => sum + value, 0);
  return Math.round(total / candidates.length);
}

function getPerformanceColor(score: number) {
  if (score >= 80) {
    return '#16A34A';
  }
  if (score >= 65) {
    return '#2563EB';
  }
  return ACCENT;
}

function getGlanceStats(child: ParentChildSummary, range: GlanceRange) {
  const due = child.recent_assignments.filter(assignment => assignment.status !== 'completed').length;

  if (range === 'week') {
    const topics = child.weekly_report.lessonsCompleted;
    return { minutes: estimateMinutes(topics), topics, due };
  }

  if (range === 'month') {
    const recentWeeks = child.weekly_trends.slice(-4);
    const topics = recentWeeks.reduce((total, item) => total + item.lessonsCompleted, 0);
    return { minutes: estimateMinutes(topics), topics, due };
  }

  const trendTopics = child.weekly_trends.reduce((total, item) => total + item.lessonsCompleted, 0);
  const topics = Math.max(child.completed_lessons, trendTopics);
  return { minutes: estimateMinutes(topics), topics, due };
}

function getGlanceComparisons(child: ParentChildSummary, range: GlanceRange) {
  const activity = getPeriodActivity(child, range);
  return {
    minutes: buildGlanceComparison(
      estimateMinutes(activity.current.lessons),
      estimateMinutes(activity.previous.lessons),
    ),
    topics: buildGlanceComparison(activity.current.lessons, activity.previous.lessons),
    assignments: buildGlanceComparison(
      activity.current.assignments,
      activity.previous.assignments,
    ),
  };
}

function getPeriodActivity(child: ParentChildSummary, range: GlanceRange) {
  if (range === 'week') {
    const previousWeek = child.weekly_trends[child.weekly_trends.length - 1];
    return {
      current: {
        assignments: child.weekly_report.assignmentsCompleted,
        lessons: child.weekly_report.lessonsCompleted,
      },
      previous: {
        assignments: previousWeek?.assignmentsCompleted ?? 0,
        lessons: previousWeek?.lessonsCompleted ?? 0,
      },
    };
  }

  const weeksToCompare = range === 'month' ? 4 : 13;
  const recentWeeks = child.weekly_trends.slice(-weeksToCompare);
  const previousWeeks = child.weekly_trends.slice(-weeksToCompare * 2, -weeksToCompare);

  return {
    current: summarizeActivity(recentWeeks),
    previous: summarizeActivity(previousWeeks),
  };
}

function summarizeActivity(
  weeks: ParentChildSummary['weekly_trends'],
): { assignments: number; lessons: number } {
  return weeks.reduce(
    (total, item) => ({
      assignments: total.assignments + item.assignmentsCompleted,
      lessons: total.lessons + item.lessonsCompleted,
    }),
    { assignments: 0, lessons: 0 },
  );
}

function buildGlanceComparison(current: number, previous: number) {
  if (previous === 0 && current === 0) {
    return { text: '0% vs last', tone: 'neutral' as const };
  }

  if (previous === 0) {
    return { text: '+100% vs last', tone: 'positive' as const };
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  const sign = percent > 0 ? '+' : '';
  const tone: GlanceComparisonTone =
    percent > 0 ? 'positive' : percent < 0 ? 'negative' : 'neutral';
  return { text: `${sign}${percent}% vs last`, tone };
}

function estimateMinutes(lessons: number) {
  return lessons > 0 ? lessons * 21 : 0;
}

function splitReportArea(area: string) {
  const parts = area.split(':');
  return {
    subject: parts[0].trim(),
    topic: (parts[1] || parts[0]).trim(),
  };
}

function getStrengthRows(child: ParentChildSummary) {
  return uniqueStrings(
    child.weekly_report.strengths.map(area => splitReportArea(area).subject).filter(Boolean),
  ).slice(0, 3);
}

function getStrengthStatus(child: ParentChildSummary, index: number) {
  const score = child.mastery_average || child.weekly_report.assessmentAverage || child.assessment_average;
  if (score >= 80 && index === 0) {
    return 'Excellent';
  }
  if (score >= 70) {
    return 'Good';
  }
  return 'Improving';
}

function getFocusTopics(child: ParentChildSummary) {
  return uniqueStrings(
    child.weekly_report.focusAreas.map(area => splitReportArea(area).topic).filter(Boolean),
  ).slice(0, 3);
}

function buildRafikiContext(child: ParentChildSummary): ParentAssistantContext {
  return {
    childName: getFirstName(child.name),
    grade: child.grade,
    overallScore: getOverallScore(child),
    activeDays: child.weekly_report.activeDays,
    lessonsCompleted: child.weekly_report.lessonsCompleted,
    assignmentsCompleted: child.weekly_report.assignmentsCompleted,
    assessmentAverage: child.weekly_report.assessmentAverage,
    weeklyExamScore: child.weekly_report.weeklyExamScore,
    pendingAssignments: child.recent_assignments
      .filter(assignment => assignment.status !== 'completed')
      .map(assignment => assignment.title)
      .slice(0, 6),
    strengths: child.weekly_report.strengths.slice(0, 6),
    focusAreas: child.weekly_report.focusAreas.slice(0, 6),
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function hasAssessmentData(child: ParentChildSummary) {
  return child.recent_assignments.some(assignment => assignment.score !== null);
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

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#F6F7F9', flex: 1 },
  phoneShell: { backgroundColor: '#F6F7F9', flex: 1, maxWidth: 430, width: '100%' },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 10,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'web' ? 10 : 14,
  },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: 9, justifyContent: 'space-between' },
  accountAvatarButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerChildIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  headerTextWrap: { flexShrink: 1 },
  headerGreeting: { color: MUTED, fontSize: 12.5, fontWeight: '500' },
  headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  headerTitle: { color: INK, flexShrink: 1, fontSize: 17, fontWeight: '800' },
  chevronFlipped: { transform: [{ rotate: '180deg' }] },
  parentAvatar: {
    alignItems: 'center',
    backgroundColor: '#111827',
    justifyContent: 'center',
  },
  parentAvatarText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  childAvatar: {
    alignItems: 'center',
    backgroundColor: '#FFE8D8',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bellButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'relative',
    width: 44,
  },
  notificationDot: {
    backgroundColor: ACCENT,
    borderColor: '#F6F7F9',
    borderRadius: 5,
    borderWidth: 1.5,
    height: 10,
    position: 'absolute',
    right: 9,
    top: 8,
    width: 10,
  },
  childManager: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E9ED',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  childManagerRow: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  childManagerRowActive: { backgroundColor: '#FFF4EC' },
  childManagerMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
  childManagerTextWrap: { flexShrink: 1 },
  childManagerName: { color: INK, fontSize: 14.5, fontWeight: '800' },
  childManagerNameActive: { color: '#C2410C' },
  childManagerMeta: { color: MUTED, fontSize: 12, fontWeight: '600' },
  childRemoveButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  childRemoveText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  childManagerLabel: { color: INK, fontSize: 13.5, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  accountOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  accountOverlayDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  accountOverlayCardWrap: {
    left: 12,
    position: 'absolute',
    right: 12,
    top: Platform.OS === 'web' ? 10 : 14,
    zIndex: 1,
  },
  accountPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E9ED',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
  },
  accountPanelHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  accountPanelAvatarButton: { borderRadius: 24 },
  accountPanelHeaderText: { flex: 1, minWidth: 0 },
  accountPanelName: { color: INK, fontSize: 16, fontWeight: '900' },
  accountPanelRole: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 1 },
  accountEditButton: {
    alignItems: 'center',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  accountEditButtonActive: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  accountDetailGrid: { gap: 8, marginTop: 12 },
  accountDetailRow: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  accountDetailLabel: { color: MUTED, fontSize: 11.5, fontWeight: '700' },
  accountDetailValue: { color: INK, flexShrink: 1, fontSize: 12.5, fontWeight: '800', marginLeft: 12, textAlign: 'right' },
  accountEditFields: { gap: 8, marginTop: 12 },
  accountEditField: { gap: 4 },
  accountEditLabel: { color: MUTED, fontSize: 11, fontWeight: '800' },
  accountEditInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    color: INK,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  accountEditActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  accountEditSecondary: {
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  accountEditSecondaryText: { color: MUTED, fontSize: 12.5, fontWeight: '800' },
  accountEditPrimary: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accountEditPrimaryDisabled: { opacity: 0.45 },
  accountEditPrimaryText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '900' },
  accountSignOutButton: {
    alignItems: 'center',
    borderTopColor: '#F0F1F4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
  },
  accountSignOutText: { color: '#DC2626', fontSize: 13.5, fontWeight: '800' },
  homeContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 0,
  },
  homeSection: {
    marginTop: 0,
  },
  homeFooter: {
    marginTop: 0,
  },
  sectionTitle: { color: INK, fontSize: 14.5, fontWeight: '800', marginBottom: 5, marginTop: 8 },
  heroCard: {
    backgroundColor: '#FDEEE2',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    padding: 12,
  },
  heroCopy: { flex: 1, justifyContent: 'center', minWidth: 0, paddingRight: 10 },
  heroEyebrow: { color: ACCENT, fontSize: 12, fontWeight: '800' },
  heroTitle: { color: INK, fontSize: 18, fontWeight: '900', marginTop: 3 },
  heroSubtitle: { color: '#8A8E98', fontSize: 12.5, fontWeight: '500', lineHeight: 17, marginTop: 4 },
  ringWrap: {
    alignItems: 'center',
    height: 96,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
    width: 102,
  },
  ringCenter: { alignItems: 'center', maxWidth: 58, position: 'absolute' },
  ringScore: { color: ACCENT, fontSize: 21, fontWeight: '900', lineHeight: 24, textAlign: 'center', width: 58 },
  ringLabel: {
    color: '#7B808A',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 9.5,
    marginTop: 1,
    textAlign: 'center',
    width: 58,
  },
  performanceMascotWrap: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: -5,
    top: -5,
    width: 44,
  },
  performanceMascot: { height: 39, width: 39 },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  quickAction: { alignItems: 'center', flex: 1, gap: 4 },
  quickIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  quickLabel: { color: '#3F4249', fontSize: 11, fontWeight: '600', lineHeight: 13, textAlign: 'center' },
  glanceHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  rangeTabs: {
    backgroundColor: '#EEEFF3',
    borderRadius: 15,
    flexDirection: 'row',
    marginTop: 8,
    padding: 2,
  },
  rangeTab: { borderRadius: 13, paddingHorizontal: 8, paddingVertical: 4 },
  rangeTabActive: { backgroundColor: '#FFFFFF' },
  rangeTabText: { color: MUTED, fontSize: 10.5, fontWeight: '600' },
  rangeTabTextActive: { color: ACCENT, fontWeight: '800' },
  glanceRow: { flexDirection: 'row', gap: 7 },
  glanceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    padding: 8,
  },
  glanceCardTextOnly: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  glanceIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginBottom: 5,
    width: 30,
  },
  glanceValue: { color: INK, fontSize: 16, fontWeight: '900' },
  glanceLabel: { color: MUTED, fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  glanceValueTextOnly: { fontSize: 22, lineHeight: 26, textAlign: 'center' },
  glanceLabelTextOnly: { fontSize: 11.5, lineHeight: 14, marginTop: 2, textAlign: 'center' },
  glanceComparison: {
    color: '#9CA3AF',
    fontSize: 9.5,
    fontWeight: '800',
    lineHeight: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  glanceComparisonPositive: { color: '#16A34A' },
  glanceComparisonNegative: { color: '#DC2626' },
  progressHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  viewAllLink: { marginBottom: 5, marginTop: 8 },
  viewAllLinkText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  progressRow: { flexDirection: 'row', gap: 12 },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F2F5',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 106,
    paddingBottom: 12,
    paddingHorizontal: 14,
    paddingTop: 13,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  progressCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressCardTitle: { fontSize: 13.5, fontWeight: '900' },
  progressCardTitleSuccess: { color: '#16A34A' },
  progressCardTitleFocus: { color: '#EA580C' },
  progressCardIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  progressCardIconSuccess: { backgroundColor: '#EAFBF0' },
  progressCardIconFocus: { backgroundColor: '#FFF1E8' },
  progressItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 27,
  },
  progressItemName: { color: INK, flexShrink: 1, fontSize: 12.8, fontWeight: '700', marginRight: 6 },
  progressBadge: {
    alignItems: 'center',
    borderRadius: 7,
    minWidth: 67,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  progressBadgeGreen: { backgroundColor: '#EAFBF0' },
  progressBadgeGreenText: { color: '#16A34A', fontSize: 10, fontWeight: '900' },
  progressBadgeOrange: { backgroundColor: '#FFF1E8' },
  progressBadgeOrangeText: { color: '#EA580C', fontSize: 9.6, fontWeight: '900' },
  progressEmptyText: { color: MUTED, fontSize: 12, fontWeight: '500', lineHeight: 17, marginTop: 2 },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  tipsTitle: { color: '#16A34A', fontSize: 14.5, fontWeight: '800', marginBottom: 4 },
  tipRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 10 },
  tipIcon: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  tipText: { color: '#26282E', flex: 1, fontSize: 13.5, fontWeight: '600' },
  tipFooter: {
    alignItems: 'center',
    borderTopColor: '#F0F1F4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
    paddingTop: 11,
  },
  tipFooterText: { color: MUTED, fontSize: 12, fontWeight: '500' },
  teacherNoteCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#F1F2F5',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 12,
    minHeight: 82,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  teacherAvatar: {
    alignItems: 'center',
    backgroundColor: '#E8EBEF',
    borderRadius: 26,
    borderColor: '#FFFFFF',
    borderWidth: 2,
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 52,
  },
  teacherNoteBody: { flex: 1, minWidth: 0 },
  teacherNoteFrom: { color: INK, fontSize: 13, fontWeight: '900' },
  teacherNoteText: { color: MUTED, fontSize: 10.9, fontWeight: '500', lineHeight: 15.5, marginTop: 2 },
  replyButton: {
    alignItems: 'center',
    borderColor: ACCENT,
    borderRadius: 22,
    borderWidth: 1.6,
    minWidth: 74,
    paddingHorizontal: 17,
    paddingVertical: 8,
  },
  replyText: { color: ACCENT, fontSize: 13, fontWeight: '900' },
  footerCount: { color: '#9CA3AF', fontSize: 10.5, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  subViewWrap: { marginTop: 16 },
  subViewTitle: { color: INK, fontSize: 20, fontWeight: '900' },
  subViewSubtitle: { color: MUTED, fontSize: 13.5, fontWeight: '500', marginBottom: 14, marginTop: 2 },
  panelCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  panelHeader: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8 },
  panelTitle: { color: INK, fontSize: 14.5, fontWeight: '800' },
  panelBodyText: { color: MUTED, fontSize: 13, fontWeight: '500', lineHeight: 19 },
  assignmentRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 10 },
  assignmentIconBox: {
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 11,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  assignmentTextWrap: { flex: 1 },
  assignmentTitle: { color: '#26282E', fontSize: 13.5, fontWeight: '700' },
  assignmentMeta: { color: MUTED, fontSize: 12, fontWeight: '500', marginTop: 1 },
  assignmentStatusPill: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  statusPillDone: { backgroundColor: '#DCFCE7' },
  statusPillDoneText: { color: '#15803D' },
  statusPillDue: { backgroundColor: '#FEE2E2' },
  statusPillDueText: { color: '#DC2626' },
  assignmentStatusText: { fontSize: 11, fontWeight: '800' },
  trendChart: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 132, marginTop: 6 },
  trendColumn: { alignItems: 'center', flex: 1 },
  trendBarTrack: {
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    height: 88,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 14,
  },
  trendBar: { backgroundColor: ACCENT, borderRadius: 7, width: '100%' },
  trendValue: { color: INK, fontSize: 11.5, fontWeight: '800', marginTop: 5 },
  trendLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', marginTop: 1 },
  summaryStrip: { backgroundColor: '#FDEEE2', borderRadius: 14, padding: 14 },
  summaryStripText: { color: '#7C2D12', fontSize: 13, fontWeight: '700' },
  reportStatsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reportStat: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  reportStatValue: { color: INK, fontSize: 19, fontWeight: '900' },
  reportStatLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 3 },
  reportListRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 8 },
  reportDot: { borderRadius: 4, height: 8, width: 8 },
  reportDotSuccess: { backgroundColor: '#16A34A' },
  reportDotFocus: { backgroundColor: ACCENT },
  reportListText: { color: '#26282E', flex: 1, fontSize: 13.5, fontWeight: '600' },
  rafikiHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  rafikiBadge: {
    alignItems: 'center',
    backgroundColor: '#FFEDD5',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  rafikiThread: { marginTop: 4 },
  rafikiBubble: {
    borderRadius: 16,
    marginTop: 10,
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rafikiBubbleModel: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderWidth: 1,
  },
  rafikiBubbleUser: { alignSelf: 'flex-end', backgroundColor: ACCENT },
  rafikiBubbleText: { color: '#26282E', fontSize: 13.5, fontWeight: '500', lineHeight: 20 },
  rafikiBubbleTextUser: { color: '#FFFFFF' },
  rafikiReportButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  rafikiReportButtonSubmitted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  rafikiReportText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
  },
  rafikiReportTextSubmitted: {
    color: '#16A34A',
  },
  rafikiReportError: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  rafikiThinkingRow: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  rafikiThinkingText: { color: MUTED, fontSize: 12.5, fontWeight: '600' },
  rafikiSuggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  rafikiSuggestionChip: {
    backgroundColor: '#FFF4EC',
    borderColor: '#FED7AA',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rafikiSuggestionText: { color: '#C2410C', fontSize: 12.5, fontWeight: '700' },
  rafikiComposer: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 14 },
  rafikiInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    color: INK,
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rafikiSendButton: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  focusNotice: {
    backgroundColor: '#F1FBF5',
    borderColor: '#BBE7CD',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    padding: 15,
  },
  focusNoticeHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 8 },
  focusNoticeIcon: {
    alignItems: 'center',
    backgroundColor: '#D8F3E3',
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  focusNoticeTitleWrap: { flex: 1 },
  focusNoticeTitle: { color: '#14532D', fontSize: 15, fontWeight: '800' },
  focusNoticeMeta: { color: '#4D7C63', fontSize: 12, fontWeight: '600' },
  focusNoticeText: { color: '#31543F', fontSize: 12.5, fontWeight: '500', lineHeight: 19 },
  focusStatusRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 9 },
  focusStatusText: { color: '#0F8A4B', fontSize: 13, fontWeight: '800' },
  focusSetupBox: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBEBD8',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  focusSetupTitle: { color: '#14532D', fontSize: 13, fontWeight: '800' },
  focusSetupText: { color: '#4D7C63', fontSize: 12, fontWeight: '500', lineHeight: 18, marginTop: 6 },
  settingsButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#0F8A4B',
    borderRadius: 15,
    borderWidth: 1.4,
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  settingsButtonText: { color: '#0F8A4B', fontSize: 12.5, fontWeight: '800' },
  focusError: { color: '#B91C1C', fontSize: 12.5, fontWeight: '600', marginTop: 9 },
  focusButton: {
    alignItems: 'center',
    backgroundColor: '#0F8A4B',
    borderRadius: 14,
    marginTop: 12,
    paddingVertical: 12,
  },
  focusButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  emptyPanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 22,
  },
  emptyTitle: { color: INK, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 13.5, fontWeight: '500', lineHeight: 20, textAlign: 'center' },
  retryButton: { backgroundColor: ACCENT, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  retryButtonText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodButton: { backgroundColor: '#F1F2F5', borderRadius: 13, paddingHorizontal: 16, paddingVertical: 8 },
  methodButtonActive: { backgroundColor: '#FFEDD5' },
  methodText: { color: MUTED, fontSize: 13, fontWeight: '700' },
  methodTextActive: { color: '#C2410C' },
  linkRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 10, width: '100%' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 13,
    borderWidth: 1,
    color: INK,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  linkButton: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  errorText: { color: '#B91C1C', fontSize: 12.5, fontWeight: '600', marginTop: 8 },
  disabledButton: { opacity: 0.45 },
  messagesTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: { color: ACCENT, fontSize: 13, fontWeight: '800' },
  teacherTabs: { flexGrow: 0, marginTop: 4 },
  teacherEmptyChip: { backgroundColor: '#F1F2F5', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  teacherEmptyText: { color: MUTED, fontSize: 12.5, fontWeight: '600' },
  teacherChip: {
    backgroundColor: '#F1F2F5',
    borderRadius: 14,
    marginRight: 8,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  teacherChipActive: { backgroundColor: '#FFEDD5' },
  teacherChipText: { color: MUTED, fontSize: 12.5, fontWeight: '700' },
  teacherChipTextActive: { color: '#C2410C' },
  messageError: { color: '#B91C1C', fontSize: 12.5, fontWeight: '600', marginTop: 8 },
  messageThread: { marginTop: 8 },
  messageEmpty: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    padding: 16,
  },
  messageEmptyTitle: { color: INK, fontSize: 14.5, fontWeight: '800' },
  messageEmptyText: { color: MUTED, fontSize: 12.5, fontWeight: '500', lineHeight: 18, marginTop: 4 },
  messageBubble: {
    borderRadius: 16,
    marginTop: 10,
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  messageBubbleMine: { alignSelf: 'flex-end', backgroundColor: '#FFEDD5' },
  messageBubbleTeacher: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderWidth: 1,
  },
  messageSender: { color: '#9A3412', fontSize: 11.5, fontWeight: '800' },
  messageBody: { color: '#26282E', fontSize: 13.5, fontWeight: '500', lineHeight: 20, marginTop: 3 },
  messageTime: { color: '#9CA3AF', fontSize: 10.5, fontWeight: '600' },
  messageMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 6,
  },
  messageReportButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderColor: 'rgba(148,163,184,0.34)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  messageReportButtonSubmitted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  messageReportText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
  },
  messageReportTextSubmitted: { color: '#15803D' },
  messageReportError: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  messageComposer: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 14 },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    color: INK,
    flex: 1,
    fontSize: 14,
    maxHeight: 110,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  messageSendButton: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  messageSendText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  bottomNav: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#ECEDF0',
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: 430,
    paddingBottom: Platform.OS === 'web' ? 10 : 20,
    paddingTop: 4,
    width: '100%',
  },
  navItem: { alignItems: 'center', flex: 1, gap: 3, paddingVertical: 6 },
  navIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 2,
    height: 3,
    marginBottom: 3,
    width: 34,
  },
  navIndicatorActive: { backgroundColor: ACCENT },
  navLabel: { color: '#5B5C61', fontSize: 11, fontWeight: '600' },
  navLabelActive: { color: ACCENT, fontWeight: '800' },
});
