# Parent Portal Redesign — Implementation Plan (Handoff)

> **Audience:** an engineer/agent picking this up cold.
> **Repo:** `kitabu-ai` — Fastify API (`apps/api`) + Expo/React-Native app (`native-app`).
> **Branch in progress:** `codex/teacher-portal-direction-a` (worktree also has unrelated teacher-portal changes — **do not touch those**).
> **Goal:** Redesign the Parent Portal to match the new mockup (light theme, weekly-goal ring, quick actions, "Today at a glance" range tabs, Recent progress, Teacher note, and a bottom nav of **Home / Learning / Insights / Ask Rafiki**) while **retaining all existing functionality**.

---

## 0. TL;DR of what's left

Backend + native service layer are **already done and on disk** (see §2). Three things remain:

1. **Replace** `native-app/src/screens/ParentDashboardScreen.tsx` with the full component in §3 (Step A).
2. **Wire** one new prop (`onOpenBilling`) in `native-app/src/KitabuApp.tsx` (Step B).
3. **Replace** `native-app/__tests__/ParentDashboardScreen.test.tsx` with §5 (Step C), then run checks (Step D).

Everything needed is inline in this doc. No new API endpoints, no migrations.

---

## 1. Product decisions (locked — do not re-litigate)

These were confirmed with the product owner:

| Question | Decision |
|---|---|
| **"Ask Rafiki" tab** | New **parent AI chat** using the existing `/ai/generate-text` proxy, grounded in the selected child's progress. (Feature id `parent_progress_assistant`.) |
| **"Learning" vs "Insights" tabs** | **Learning** = today's activity + assignments list + six-week activity chart. **Insights** = the weekly report (assessment stats, strengths, focus areas). |
| **"This week / This month / Year so far" tabs** | Computed **client-side** from existing data (weekly report + 6 trend points + lifetime `completed_lessons`). Approximate until more history accrues. **No API change.** |
| **Kept features** | Keep **all**, restyled: child linking, multi-child switching + remove (moved into the header dropdown), Focus Mode notice/setup, Parenting Tips, teacher messaging. Nothing dropped. |

### Design intent (from mockup)
- Light background (`#F6F7F9`), white cards, orange accent `#F97316`.
- Header: round child avatar + "Good evening" + **"{Child}'s Parent ⌄"** (tap opens child manager) + bell with dot.
- **"This Week"** hero card: peach background, headline + subline on the left, **circular progress ring** ("82% / Weekly Goal") on the right.
- **Quick actions** row of 4: Pay fees/subscription, View report, Message teacher, Lock phone.
- **"Today at a glance"** with segmented tabs (This week / This month / Year so far) → 3 stat cards: Active learning (min), Topics learned, Assignments due.
- **"Recent progress"** two cards: Strengths (green badges) / Needs focus (orange "Work on this").
- **Teacher note** card with avatar + Reply button.
- Bottom nav: **Home / Learning / Insights / Ask Rafiki**.

---

## 2. Work ALREADY COMPLETED (verify, do not redo)

All four edits below are confirmed present on disk. If a merge wiped them, re-apply.

### 2a. `apps/api/src/aiFeatures.ts`
- Added `'parent_progress_assistant'` to the `AiFeatureId` union (after `parent_weekly_report_generation`).
- Added helper `parentProgressContextLines(context)` (right before `jsonOnlyInstruction()`), which formats: childName, grade, overallScore, activeDays, lessonsCompleted, assignmentsCompleted, assessmentAverage, weeklyExamScore, pendingAssignments, strengths, focusAreas.
- Added the feature definition (before `teacher_class_remediation_generation`):
  ```ts
  parent_progress_assistant: {
    featureId: 'parent_progress_assistant',
    promptVersion: '2026-07-06.parent-assistant.v1',
    modelProfile: 'instant_tutor',
    cachePolicy: 'disabled',
    responseKind: 'text',
    schemaVersion: 'chat-text.v1',
    description: "Conversational Rafiki assistant that helps parents understand and support their child's learning.",
    buildSystemInstruction: context => `You are Rafiki, Kitabu's warm and practical assistant for parents. ... (grounded in parentProgressContextLines(context))`
  },
  ```

### 2b. `apps/api/src/server.ts`
- In `canBypassAiSubscription(user, feature)`, after the operational-features check, added:
  ```ts
  // Parents do not hold their own subscriptions (children do), so the parent
  // progress assistant is gated by role plus the per-user AI rate limit instead.
  return feature === 'parent_progress_assistant' && hasAnyRole(user, ['parent']);
  ```
  (Rationale: parents aren't subscription holders; without this the proxy returns 402 for them. Still rate-limited per-user via the existing `aiGenerationRateLimit`.)

### 2c. `apps/api/src/aiFeatures.test.ts`
- Added `'parent_progress_assistant'` to `REQUIRED_FEATURE_IDS` and to `NO_RESPONSE_CACHE_FEATURE_IDS` (cachePolicy is `disabled`, so it must be in the no-cache list, **not** the deterministic list).

### 2d. `native-app/src/services/aiService.ts`
- Exported `interface ParentAssistantContext` and `async function askParentAssistant(prompt, history, context?)` (placed right before `generateRemedialAnalysisText`). It calls the internal `generateText({ feature: 'parent_progress_assistant', timeoutMs: CHAT_AI_TIMEOUT_MS, ... })`, runs `cleanTutorResponse`, and returns friendly fallbacks on abort/error — same pattern as `askHomeworkHelper`.

**Integration contract the screen relies on:**
```ts
export interface ParentAssistantContext {
  childName: string;
  grade: string;
  overallScore?: number;
  activeDays?: number;
  lessonsCompleted?: number;
  assignmentsCompleted?: number;
  assessmentAverage?: number;
  weeklyExamScore?: number | null;
  pendingAssignments?: string[];
  strengths?: string[];
  focusAreas?: string[];
}
export function askParentAssistant(
  prompt: string,
  history?: ChatMessage[],
  context?: ParentAssistantContext,
): Promise<string>;
```

### Data types the screen consumes (already exist in `native-app/src/types/app.ts`)
- `ParentChildSummary`: `id, name, email, grade, school, relationship, assessment_average, homework_completion, completed_lessons, total_lessons, mastery_average, due_reviews, last_active, diagnostic{completed,percentage,completedAt}, recent_assignments[], weekly_trends[], weekly_report{generatedAt,activeDays,lessonsCompleted,assignmentsCompleted,assessmentAverage,weeklyExamScore,strengths[],focusAreas[]}`.
- `ParentChildAssignment`: `id, title, subject, status:'pending'|'completed', score:number|null, dueAt:string|null`.
- `ChatMessage`: `{ role:'user'|'model', text:string, attachment? }`.
- `TeacherParentMessage` (from `services/teacherService`): has `id, teacher_user_id, parent_user_id, sender_user_id, sender_name, body, created_at`.
- Services: `getParentTeacherMessages(): Promise<TeacherParentMessage[]>`, `sendParentTeacherMessage({teacherUserId, body})` from `services/parentService`.

---

## 3. Step A — Replace `native-app/src/screens/ParentDashboardScreen.tsx`

**Action:** Read the existing file (required by the editor), then overwrite it **entirely** with the code below.

Key behavior notes (why the code is shaped this way):
- **Props:** identical to the current screen **plus one new optional prop** `onOpenBilling?: () => void`. Everything else keeps the same names so `KitabuApp` wiring barely changes.
- **Teacher messages load on mount** (when `children.length > 0`) so the Home "Teacher note" card can show the latest real note. (Previously they loaded only when opening the Messages tab.) This means **tests must mock `parentService`.**
- **Child switching/removal** moved into a header dropdown (`ChildManagerPanel`) — tap the "{Child}'s Parent ⌄" identity to toggle it. Remove uses the same two-tap confirm (`Remove` → `Confirm`) and calls `onUnlinkChild`.
- **Range tabs** (`week`/`month`/`year`) computed via `getGlanceStats` — no API dependency.
- **Ask Rafiki** posts through `askParentAssistant` with `buildRafikiContext(child)`; shows seeded greeting + tappable suggestion chips; disables input while thinking.
- **Focus Mode / linking / empty / loading / error** states preserved with the exact same copy strings the app already ships (so behavior + any downstream expectations hold).

```tsx
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
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileBarChart,
  Home,
  HelpCircle,
  Lightbulb,
  Link2,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  MessageSquareText,
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
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { ChatMessage, ParentChildAssignment, ParentChildSummary } from '../types/app';
import { askParentAssistant, ParentAssistantContext } from '../services/aiService';
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
  onOpenBilling?: () => void;
  onRefresh: () => void;
  onSignOut: () => void;
}

type DashboardTab = 'home' | 'learning' | 'insights' | 'rafiki';
type DashboardView = DashboardTab | 'messages';
type GlanceRange = 'week' | 'month' | 'year';

const ACCENT = '#F97316';
const INK = '#111827';
const MUTED = '#6B7280';

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
  onOpenBilling,
  onRefresh,
  onSignOut,
}: ParentDashboardScreenProps) {
  const [activeView, setActiveView] = useState<DashboardView>('home');
  const [glanceRange, setGlanceRange] = useState<GlanceRange>('week');
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
            isLoading={isLoading}
            isMenuOpen={isChildMenuOpen}
            parentFirstName={parentFirstName}
            onRefresh={onRefresh}
            onSignOut={onSignOut}
            onToggleMenu={() => {
              setIsChildMenuOpen(open => !open);
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
              onSignOut={onSignOut}
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
            <>
              <ThisWeekCard child={selectedChild} score={score} />

              <SectionTitle title="Quick actions" />
              <QuickActionsCard
                isStartingFocusMode={isStartingFocusMode}
                onLockPhone={onStartFocusMode}
                onMessages={() => setActiveView('messages')}
                onPayFees={onOpenBilling}
                onViewReport={() => setActiveView('insights')}
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

              <View style={styles.glanceHeaderRow}>
                <SectionTitle title="Today at a glance" />
                <GlanceRangeTabs range={glanceRange} onChange={setGlanceRange} />
              </View>
              <GlanceCards child={selectedChild} range={glanceRange} />

              <View style={styles.progressHeaderRow}>
                <SectionTitle title="Recent progress" />
                <Pressable onPress={() => setActiveView('insights')} style={styles.viewAllLink}>
                  <Text style={styles.viewAllLinkText}>View all</Text>
                </Pressable>
              </View>
              <RecentProgress child={selectedChild} />

              <ParentingTipsCard />

              <TeacherNoteCard
                note={latestTeacherNote}
                onReply={() => setActiveView('messages')}
              />

              <Text style={styles.footerCount}>{childCountLabel}</Text>
            </>
          )}
        </ScrollView>

        <BottomNavigation activeView={activeView} onSelect={switchTab} />
      </View>
    </View>
  );
}

function DashboardHeader({
  childName,
  isLoading,
  isMenuOpen,
  parentFirstName,
  onRefresh,
  onSignOut,
  onToggleMenu,
}: {
  childName: string | null;
  isLoading: boolean;
  isMenuOpen: boolean;
  parentFirstName: string;
  onRefresh: () => void;
  onSignOut: () => void;
  onToggleMenu: () => void;
}) {
  const title = childName ? `${getFirstName(childName)}'s Parent` : parentFirstName;
  return (
    <View style={styles.headerRow}>
      <Pressable
        accessibilityLabel="Manage children"
        onPress={onToggleMenu}
        style={styles.headerIdentity}>
        <ChildAvatar size={52} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerGreeting}>{getTimeGreeting()}</Text>
          <View style={styles.headerTitleRow}>
            <Text numberOfLines={1} style={styles.headerTitle}>
              {title}
            </Text>
            <ChevronDown
              color={INK}
              size={20}
              strokeWidth={2.6}
              style={isMenuOpen ? styles.chevronFlipped : undefined}
            />
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Refresh dashboard"
        onLongPress={onSignOut}
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
  onSignOut,
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
  onSignOut: () => void;
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

      <Pressable onPress={onSignOut} style={styles.signOutRow}>
        <LogOut color="#DC2626" size={17} strokeWidth={2.4} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function ThisWeekCard({ child, score }: { child: ParentChildSummary; score: number }) {
  const firstName = getFirstName(child.name);
  const headline =
    score >= 70
      ? `${firstName} is on track`
      : score > 0
        ? `${firstName} needs a boost`
        : `${firstName} is getting started`;
  const subline =
    score >= 70
      ? 'Keep it up! Consistency leads to excellence.'
      : score > 0
        ? 'Small daily practice makes a big difference.'
        : `Progress appears here as ${firstName} learns.`;

  return (
    <View style={styles.heroCard}>
      <View style={styles.heroCopy}>
        <Text style={styles.heroEyebrow}>This Week</Text>
        <Text style={styles.heroTitle}>{headline}</Text>
        <Text style={styles.heroSubtitle}>{subline}</Text>
      </View>
      <WeeklyGoalRing score={score} />
    </View>
  );
}

function WeeklyGoalRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - progress / 100);

  return (
    <View style={styles.ringWrap}>
      <Svg height={118} viewBox="0 0 118 118" width={118}>
        <Circle cx="59" cy="59" fill="none" r={radius} stroke="#F5E3D3" strokeWidth="9" />
        <Circle
          cx="59"
          cy="59"
          fill="none"
          r={radius}
          rotation={-90}
          origin="59, 59"
          stroke={ACCENT}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="9"
        />
        <Path
          d="M97 13l2.2 6.2 6.2 2.2-6.2 2.2-2.2 6.2-2.2-6.2-6.2-2.2 6.2-2.2 2.2-6.2z"
          fill="#FBBF24"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.ringScore}>{score}%</Text>
        <Text style={styles.ringLabel}>Weekly Goal</Text>
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
}: {
  isStartingFocusMode: boolean;
  onLockPhone: () => void;
  onMessages: () => void;
  onPayFees?: () => void;
  onViewReport: () => void;
}) {
  return (
    <View style={styles.quickCard}>
      <QuickAction
        icon={<WalletCards color={ACCENT} size={26} strokeWidth={2.3} />}
        iconBackground="#FFEDD5"
        label={'Pay fees /\nsubscription'}
        onPress={onPayFees}
      />
      <QuickAction
        icon={<FileBarChart color="#16A34A" size={26} strokeWidth={2.3} />}
        iconBackground="#DCFCE7"
        label={'View\nreport'}
        onPress={onViewReport}
      />
      <QuickAction
        icon={<MessageSquareText color="#7C3AED" size={26} strokeWidth={2.3} />}
        iconBackground="#EDE9FE"
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
  return (
    <View style={styles.glanceRow}>
      <GlanceCard
        icon={<BookOpen color="#2563EB" size={22} strokeWidth={2.3} />}
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
        icon={<CheckCircle2 color="#7C3AED" size={22} strokeWidth={2.3} />}
        iconBackground="#EDE9FE"
        label="Assignments due"
        value={String(stats.due)}
      />
    </View>
  );
}

function GlanceCard({
  icon,
  iconBackground,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBackground: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.glanceCard}>
      <View style={[styles.glanceIconBox, { backgroundColor: iconBackground }]}>{icon}</View>
      <Text style={styles.glanceValue}>{value}</Text>
      <Text style={styles.glanceLabel}>{label}</Text>
    </View>
  );
}

function RecentProgress({ child }: { child: ParentChildSummary }) {
  const strengths = getStrengthRows(child);
  const focus = getFocusTopics(child);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <Text style={[styles.progressCardTitle, { color: '#16A34A' }]}>Strengths</Text>
          <View style={[styles.progressCardIcon, { backgroundColor: '#DCFCE7' }]}>
            <Trophy color="#16A34A" size={17} strokeWidth={2.4} />
          </View>
        </View>
        {strengths.length === 0 ? (
          <Text style={styles.progressEmptyText}>Strengths appear as learning data grows.</Text>
        ) : (
          strengths.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.progressItemRow}>
              <Text numberOfLines={1} style={styles.progressItemName}>
                {item}
              </Text>
              <View style={[styles.progressBadge, styles.progressBadgeGreen]}>
                <Text style={styles.progressBadgeGreenText}>{index === 0 ? 'Excellent' : 'Good'}</Text>
              </View>
            </View>
          ))
        )}
      </View>
      <View style={styles.progressCard}>
        <View style={styles.progressCardHeader}>
          <Text style={[styles.progressCardTitle, { color: '#EA580C' }]}>Needs focus</Text>
          <View style={[styles.progressCardIcon, { backgroundColor: '#FFEDD5' }]}>
            <Target color="#EA580C" size={17} strokeWidth={2.4} />
          </View>
        </View>
        {focus.length === 0 ? (
          <Text style={styles.progressEmptyText}>No urgent focus areas this week.</Text>
        ) : (
          focus.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.progressItemRow}>
              <Text numberOfLines={1} style={styles.progressItemName}>
                {item}
              </Text>
              <View style={[styles.progressBadge, styles.progressBadgeOrange]}>
                <Text style={styles.progressBadgeOrangeText}>Work on this</Text>
              </View>
            </View>
          ))
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
          <Text style={styles.teacherNoteFrom}>
            {note ? `From ${note.sender_name}` : 'From your teachers'}
          </Text>
          <Text numberOfLines={3} style={styles.teacherNoteText}>
            {note ? note.body : 'Notes from teachers appear here once they reach out.'}
          </Text>
        </View>
        <Pressable onPress={onReply} style={styles.replyButton}>
          <Text style={styles.replyText}>Reply</Text>
        </Pressable>
      </View>
    </>
  );
}

function TeacherAvatar() {
  return (
    <View style={styles.teacherAvatar}>
      <Svg height={40} viewBox="0 0 64 64" width={40}>
        <Circle cx="32" cy="28" r="15" fill="#7A4127" />
        <Path d="M15 30c0-14 8-21 17-21s17 7 17 21c-3-9-8-13-17-13s-14 4-17 13z" fill="#1B0E0B" />
        <Circle cx="27" cy="29" r="1.7" fill="#111111" />
        <Circle cx="37" cy="29" r="1.7" fill="#111111" />
        <Path d="M28 35c2.5 2.4 5.5 2.4 8 0" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2" />
        <Path d="M16 64c2-12 8-18 16-18s14 6 16 18H16z" fill="#134E4A" />
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
          icon={<CheckCircle2 color="#7C3AED" size={22} strokeWidth={2.3} />}
          iconBackground="#EDE9FE"
          label="Assignments due"
          value={String(stats.due)}
        />
      </View>

      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <ClipboardList color="#7C3AED" size={19} strokeWidth={2.4} />
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
        <ClipboardList color="#7C3AED" size={18} strokeWidth={2.4} />
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
                <Text style={styles.messageTime}>
                  {new Date(message.created_at).toLocaleString()}
                </Text>
              </View>
            );
          })
        )}
      </View>

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

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#F6F7F9', flex: 1 },
  phoneShell: { backgroundColor: '#F6F7F9', flex: 1, maxWidth: 430, width: '100%' },
  scroll: { flex: 1 },
  content: {
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'web' ? 18 : 26,
  },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12 },
  headerTextWrap: { flexShrink: 1 },
  headerGreeting: { color: MUTED, fontSize: 14.5, fontWeight: '500' },
  headerTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  headerTitle: { color: INK, flexShrink: 1, fontSize: 21, fontWeight: '800' },
  chevronFlipped: { transform: [{ rotate: '180deg' }] },
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
  signOutRow: {
    alignItems: 'center',
    borderTopColor: '#F0F1F4',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
  },
  signOutText: { color: '#DC2626', fontSize: 13.5, fontWeight: '800' },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: '800', marginBottom: 10, marginTop: 20 },
  heroCard: {
    backgroundColor: '#FDEEE2',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    padding: 20,
  },
  heroCopy: { flex: 1, justifyContent: 'center', paddingRight: 8 },
  heroEyebrow: { color: ACCENT, fontSize: 14, fontWeight: '800' },
  heroTitle: { color: INK, fontSize: 22, fontWeight: '900', marginTop: 6 },
  heroSubtitle: { color: '#8A8E98', fontSize: 14.5, fontWeight: '500', lineHeight: 21, marginTop: 8 },
  ringWrap: { alignItems: 'center', height: 118, justifyContent: 'center', width: 118 },
  ringCenter: { alignItems: 'center', position: 'absolute' },
  ringScore: { color: ACCENT, fontSize: 24, fontWeight: '900' },
  ringLabel: { color: '#8A8E98', fontSize: 11.5, fontWeight: '600' },
  quickCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  quickAction: { alignItems: 'center', flex: 1, gap: 8 },
  quickIconBox: {
    alignItems: 'center',
    borderRadius: 14,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  quickLabel: { color: '#3F4249', fontSize: 12, fontWeight: '600', lineHeight: 16, textAlign: 'center' },
  glanceHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  rangeTabs: {
    backgroundColor: '#EEEFF3',
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 18,
    padding: 3,
  },
  rangeTab: { borderRadius: 15, paddingHorizontal: 11, paddingVertical: 6 },
  rangeTabActive: { backgroundColor: '#FFFFFF' },
  rangeTabText: { color: MUTED, fontSize: 12, fontWeight: '600' },
  rangeTabTextActive: { color: ACCENT, fontWeight: '800' },
  glanceRow: { flexDirection: 'row', gap: 10 },
  glanceCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 13,
  },
  glanceIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    marginBottom: 12,
    width: 42,
  },
  glanceValue: { color: INK, fontSize: 19, fontWeight: '900' },
  glanceLabel: { color: MUTED, fontSize: 12, fontWeight: '600', marginTop: 3 },
  progressHeaderRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  viewAllLink: { marginBottom: 10, marginTop: 20 },
  viewAllLinkText: { color: '#2563EB', fontSize: 13.5, fontWeight: '700' },
  progressRow: { flexDirection: 'row', gap: 10 },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  progressCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressCardTitle: { fontSize: 14.5, fontWeight: '800' },
  progressCardIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  progressItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  progressItemName: { color: '#26282E', flexShrink: 1, fontSize: 13.5, fontWeight: '600', marginRight: 6 },
  progressBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  progressBadgeGreen: { backgroundColor: '#DCFCE7' },
  progressBadgeGreenText: { color: '#15803D', fontSize: 10.5, fontWeight: '800' },
  progressBadgeOrange: { backgroundColor: '#FFEDD5' },
  progressBadgeOrangeText: { color: '#C2410C', fontSize: 10.5, fontWeight: '800' },
  progressEmptyText: { color: MUTED, fontSize: 12.5, fontWeight: '500', lineHeight: 18, marginTop: 4 },
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
    borderColor: '#EEEFF2',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  teacherAvatar: {
    alignItems: 'center',
    backgroundColor: '#E7F5F1',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
  },
  teacherNoteBody: { flex: 1 },
  teacherNoteFrom: { color: INK, fontSize: 13.5, fontWeight: '800' },
  teacherNoteText: { color: MUTED, fontSize: 12.5, fontWeight: '500', lineHeight: 18, marginTop: 3 },
  replyButton: {
    borderColor: ACCENT,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  replyText: { color: ACCENT, fontSize: 13, fontWeight: '800' },
  footerCount: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginTop: 18, textAlign: 'center' },
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
    backgroundColor: '#EDE9FE',
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
  messageTime: { color: '#9CA3AF', fontSize: 10.5, fontWeight: '600', marginTop: 6 },
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
```

### Notes / gotchas for Step A
- `react-native-svg` `Circle` supports `rotation` + `origin` props (v15 in this repo) — the ring's progress arc relies on them. If they misbehave on web, the ring still renders (base track + score text); it's cosmetic only.
- All lucide icon names used (`Lightbulb`, `MessageCircleMore`, `Trophy`, `LogOut`, `Send`, `Sparkles`, `WalletCards`, `FileBarChart`, `MessageSquareText`, `UserRound`, etc.) were verified to exist in `lucide-react-native@0.577`.
- The `useEffect(..., [children.length > 0])` deliberately re-runs only when the "has children" boolean flips; the eslint-disable is required for `react-hooks/exhaustive-deps` (lint runs with `--max-warnings=0`).

---

## 4. Step B — Wire `onOpenBilling` in `native-app/src/KitabuApp.tsx`

The `parent_dashboard` case (around **line 835–862**) renders `<ParentDashboardScreen … />`. **Read that region first**, then add exactly one prop alongside the other handlers (e.g., right after `onOpenFocusModeSettings={actions.openFocusModeSettings}`):

```tsx
          onOpenBilling={() => actions.openBannerAction('manage_subscription')}
```

Why: `actions.openBannerAction('manage_subscription')` → `openSubscriptionCheckout({ kind: 'manage_subscription', snapshot })`, which opens the existing M-Pesa `SubscriptionCheckoutModal`. This is the correct target for the "Pay fees / subscription" quick action. `openBannerAction` is already exposed in the hook's returned `actions` (confirmed). **Do not** modify any other case or the teacher-portal files.

> If `actions.openBannerAction` is somehow unavailable, fall back to `onOpenBilling={() => actions.openSubscriptionCheckout({ kind: 'manage_subscription', snapshot: actions.getRouteSnapshot?.() })}` — but the `openBannerAction` route is preferred and already handles the snapshot internally.

---

## 5. Step C — Replace `native-app/__tests__/ParentDashboardScreen.test.tsx`

The redesign changes labels/layout and now calls services on mount, so the old assertions break. Replace the whole test file with this. It keeps behavioral coverage (linking, focus mode, child remove, insights, lock action) and adds coverage for the new range tabs + Rafiki tab + pay-fees callback.

**Critical:** the new screen imports `parentService` and `aiService` and calls `getParentTeacherMessages()` on mount — both must be mocked or tests will hit the network / throw.

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../src/services/parentService', () => ({
  getParentTeacherMessages: jest.fn().mockResolvedValue([]),
  sendParentTeacherMessage: jest.fn().mockResolvedValue({ messageId: 'm1' }),
}));
jest.mock('../src/services/aiService', () => ({
  askParentAssistant: jest.fn().mockResolvedValue('Here is how Amina is doing.'),
}));

import { ParentDashboardScreen } from '../src/screens/ParentDashboardScreen';
import { ParentChildSummary } from '../src/types/app';
import { getParentTeacherMessages, sendParentTeacherMessage } from '../src/services/parentService';
import { askParentAssistant } from '../src/services/aiService';

const children: ParentChildSummary[] = [
  {
    id: 'child-1',
    name: 'Amina',
    email: 'amina@example.com',
    grade: 'Grade 7',
    school: 'Kitabu School',
    relationship: 'guardian',
    assessment_average: 80,
    homework_completion: 75,
    completed_lessons: 6,
    total_lessons: 10,
    mastery_average: 70,
    due_reviews: 2,
    last_active: 'Today',
    diagnostic: { completed: true, percentage: 82, completedAt: null },
    recent_assignments: [
      {
        id: 'assignment-1',
        title: 'Fractions practice',
        subject: 'Mathematics',
        status: 'completed',
        score: 80,
        dueAt: null,
      },
      {
        id: 'assignment-2',
        title: 'Reading log',
        subject: 'English',
        status: 'pending',
        score: null,
        dueAt: null,
      },
    ],
    weekly_trends: [
      { weekStart: '2026-05-11', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
      { weekStart: '2026-05-18', lessonsCompleted: 1, assignmentsCompleted: 1, assessmentAverage: 80, weeklyExamScore: 75 },
    ],
    weekly_report: {
      generatedAt: '2026-06-18T00:00:00.000Z',
      activeDays: 3,
      lessonsCompleted: 2,
      assignmentsCompleted: 1,
      assessmentAverage: 80,
      weeklyExamScore: 75,
      strengths: ['English: Grammar'],
      focusAreas: ['Mathematics: Fractions'],
    },
  },
  {
    id: 'child-2',
    name: 'Baraka',
    email: 'baraka@example.com',
    grade: 'Grade 5',
    school: 'Kitabu School',
    relationship: 'guardian',
    assessment_average: 0,
    homework_completion: 0,
    completed_lessons: 0,
    total_lessons: 0,
    mastery_average: 0,
    due_reviews: 0,
    last_active: 'No activity yet',
    diagnostic: { completed: false, percentage: null, completedAt: null },
    recent_assignments: [],
    weekly_trends: [
      { weekStart: '2026-05-11', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
      { weekStart: '2026-05-18', lessonsCompleted: 0, assignmentsCompleted: 0, assessmentAverage: 0, weeklyExamScore: null },
    ],
    weekly_report: {
      generatedAt: '2026-06-18T00:00:00.000Z',
      activeDays: 0,
      lessonsCompleted: 0,
      assignmentsCompleted: 0,
      assessmentAverage: 0,
      weeklyExamScore: null,
      strengths: [],
      focusAreas: [],
    },
  },
];

const defaultProps = {
  children,
  selectedChildId: 'child-1',
  parentName: 'Grace Wanjiku',
  linkIdentifier: '',
  linkMethod: 'email' as const,
  isLoading: false,
  isLinking: false,
  error: null,
  focusModeActive: false,
  focusModeSetupRequired: false,
  focusModeError: null,
  focusModeSecondsRemaining: 7200,
  dailyLimitSeconds: 7200,
  isStartingFocusMode: false,
  onSelectChild: jest.fn(),
  onLinkIdentifierChange: jest.fn(),
  onLinkMethodChange: jest.fn(),
  onLinkChild: jest.fn(),
  onUnlinkChild: jest.fn(),
  onStartFocusMode: jest.fn(),
  onOpenFocusModeSettings: jest.fn(),
  onOpenBilling: jest.fn(),
  onRefresh: jest.fn(),
  onSignOut: jest.fn(),
};

function renderParentDashboard(
  props: Partial<React.ComponentProps<typeof ParentDashboardScreen>> = {},
) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ParentDashboardScreen {...defaultProps} {...props} />);
  });
  return renderer!.root;
}

function textContent(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => textContent(node.props.children) === text).length > 0;
}

function pressableWithText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll(node => node.props.onPress && hasText(node, text))[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  (getParentTeacherMessages as jest.Mock).mockResolvedValue([]);
  (sendParentTeacherMessage as jest.Mock).mockResolvedValue({ messageId: 'm1' });
  (askParentAssistant as jest.Mock).mockResolvedValue('Here is how Amina is doing.');
});

test('renders home overview with weekly goal and glance stats', () => {
  const root = renderParentDashboard();

  // Header identity + hero
  expect(hasText(root, "Amina's Parent")).toBe(true);
  expect(hasText(root, 'Amina is on track')).toBe(true);
  expect(hasText(root, '82%')).toBe(true);
  // Glance + progress + footer
  expect(root.findAllByProps({ children: 'Active learning' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: 'Topics learned' }).length).toBeGreaterThan(0);
  expect(root.findAllByProps({ children: '2 linked children' }).length).toBeGreaterThan(0);
});

test('switches the "Today at a glance" range tabs', () => {
  const root = renderParentDashboard();
  const monthTab = pressableWithText(root, 'This month');
  ReactTestRenderer.act(() => monthTab.props.onPress());
  const yearTab = pressableWithText(root, 'Year so far');
  ReactTestRenderer.act(() => yearTab.props.onPress());
  // Year-so-far tops out at lifetime completed_lessons (6) → 126 min estimate.
  expect(hasText(root, '126 min')).toBe(true);
});

test('opens the child manager and removes a child with confirmation', () => {
  const onSelectChild = jest.fn();
  const onUnlinkChild = jest.fn();
  const root = renderParentDashboard({ onSelectChild, onUnlinkChild });

  // Child rows live inside the header dropdown; open it first.
  const identity = root.findAll(node => node.props.accessibilityLabel === 'Manage children')[0];
  ReactTestRenderer.act(() => identity.props.onPress());

  const barakaRow = pressableWithText(root, 'Baraka');
  ReactTestRenderer.act(() => barakaRow.props.onPress());
  expect(onSelectChild).toHaveBeenCalledWith('child-2');

  // Reopen and remove child-1 (still selected) with two-tap confirm.
  ReactTestRenderer.act(() => identity.props.onPress());
  const removeButton = pressableWithText(root, 'Remove');
  ReactTestRenderer.act(() => removeButton.props.onPress());
  const confirmButton = pressableWithText(root, 'Confirm');
  ReactTestRenderer.act(() => confirmButton.props.onPress());
  expect(onUnlinkChild).toHaveBeenCalledWith('child-1');
});

test('starts Focus Mode and shows App Pinning setup when required', () => {
  const onStartFocusMode = jest.fn();
  const onOpenFocusModeSettings = jest.fn();
  const root = renderParentDashboard({
    focusModeSetupRequired: true,
    focusModeError: 'Turn on App Pinning to keep KITABU on screen.',
    onStartFocusMode,
    onOpenFocusModeSettings,
  });

  expect(
    root.findAllByProps({
      children: 'Focus Mode keeps KITABU on screen while your child learns.',
    }).length,
  ).toBeGreaterThan(0);
  expect(
    root.findAllByProps({ children: 'KITABU does not create a separate PIN.' }).length,
  ).toBeGreaterThan(0);

  const startButton = pressableWithText(root, 'Start Focus Mode');
  ReactTestRenderer.act(() => startButton.props.onPress());
  expect(onStartFocusMode).toHaveBeenCalledTimes(1);

  const settingsButton = pressableWithText(root, 'Open Settings');
  ReactTestRenderer.act(() => settingsButton.props.onPress());
  expect(onOpenFocusModeSettings).toHaveBeenCalledTimes(1);
});

test('lock phone quick action starts Focus Mode', () => {
  const onStartFocusMode = jest.fn();
  const root = renderParentDashboard({ onStartFocusMode });
  // Quick-action label is two lines: "Lock\nphone".
  const lockButton = pressableWithText(root, 'Lock\nphone');
  ReactTestRenderer.act(() => lockButton.props.onPress());
  expect(onStartFocusMode).toHaveBeenCalledTimes(1);
});

test('pay fees quick action opens billing', () => {
  const onOpenBilling = jest.fn();
  const root = renderParentDashboard({ onOpenBilling });
  const payButton = pressableWithText(root, 'Pay fees /\nsubscription');
  ReactTestRenderer.act(() => payButton.props.onPress());
  expect(onOpenBilling).toHaveBeenCalledTimes(1);
});

test('insights tab shows the weekly report', () => {
  const root = renderParentDashboard();
  const insightsTab = pressableWithText(root, 'Insights');
  ReactTestRenderer.act(() => insightsTab.props.onPress());
  expect(hasText(root, 'This week for Amina')).toBe(true);
  expect(root.findAllByProps({ children: 'English: Grammar' }).length).toBeGreaterThan(0);
});

test('learning tab shows activity and assignments', () => {
  const root = renderParentDashboard();
  const learningTab = pressableWithText(root, 'Learning');
  ReactTestRenderer.act(() => learningTab.props.onPress());
  expect(hasText(root, 'Learning activity')).toBe(true);
  expect(root.findAllByProps({ children: 'Fractions practice' }).length).toBeGreaterThan(0);
});

test('ask rafiki sends a message through the assistant', async () => {
  const root = renderParentDashboard();
  const rafikiTab = pressableWithText(root, 'Ask Rafiki');
  ReactTestRenderer.act(() => rafikiTab.props.onPress());

  // Tap a seeded suggestion chip.
  const suggestion = pressableWithText(root, 'How is Amina doing this week?');
  await ReactTestRenderer.act(async () => {
    suggestion.props.onPress();
  });
  expect(askParentAssistant).toHaveBeenCalledTimes(1);
  expect(hasText(root, 'Here is how Amina is doing.')).toBe(true);
});

test('renders loading, empty, and error states', () => {
  const loading = renderParentDashboard({ children: [], selectedChildId: null, isLoading: true });
  expect(loading.findAllByProps({ children: 'Loading children' }).length).toBeGreaterThan(0);

  const empty = renderParentDashboard({ children: [], selectedChildId: null });
  expect(empty.findAllByProps({ children: 'No children linked yet' }).length).toBeGreaterThan(0);

  const error = renderParentDashboard({
    children: [],
    selectedChildId: null,
    error: 'Unable to load parent dashboard',
  });
  expect(error.findAllByProps({ children: 'Dashboard unavailable' }).length).toBeGreaterThan(0);
  expect(error.findAllByProps({ children: 'Unable to load parent dashboard' }).length).toBeGreaterThan(0);
});

test('submits email linking from the empty state', () => {
  const onLinkChild = jest.fn();
  const onLinkIdentifierChange = jest.fn();
  const root = renderParentDashboard({
    children: [],
    selectedChildId: null,
    linkIdentifier: 'student@example.com',
    onLinkChild,
    onLinkIdentifierChange,
  });

  ReactTestRenderer.act(() => {
    root.findByProps({ placeholder: 'Student email' }).props.onChangeText('child@example.com');
  });
  expect(onLinkIdentifierChange).toHaveBeenCalledWith('child@example.com');

  const linkButton = root.findAll(node => node.props.onPress === onLinkChild)[0];
  ReactTestRenderer.act(() => linkButton.props.onPress());
  expect(onLinkChild).toHaveBeenCalledTimes(1);
});
```

**Verify these expectations against the code before trusting them:**
- Year-so-far minutes = `estimateMinutes(max(completed_lessons=6, trendTopics=1)) = 6*21 = 126`. ✔
- `'Lock\nphone'` and `'Pay fees /\nsubscription'` are exact `Text` children (the literal newline is part of the string). ✔
- Suggestion chip text `How is Amina doing this week?` matches the template `How is ${childFirstName} doing this week?`. ✔
- The Rafiki test is `async` and awaits an `act` because `askParentAssistant` is a resolved promise whose `.then` updates state.

---

## 6. Step D — Build, checks, and preview verification

Run from repo root (`C:\Users\NDIZIFLIX\Desktop\APPS\KITABU\kitabu-ai`), PowerShell:

```powershell
# API: type-check, build, unit tests (includes aiFeatures.test.ts)
npm run check
npm run build
npm run test:api

# Native: type-check, lint (zero warnings), Jest
npm run typecheck:native
npm run lint:native
npm run test:native
```

All must pass. `npm run test:api` exercises `aiFeatures.test.ts`, which now requires `parent_progress_assistant` to be a registered, no-cache feature (already wired in §2).

### Preview (web) verification
A dev server harness exists. If not already running:
- Frontend: Expo web on **:8081** (`npm --prefix native-app run web`).
- API: Fastify on **:4000** — **must** be started with the preview CORS origin, because local `.env` sets `KITABU_NODE_ENV=production` which otherwise blocks `localhost:8081`:
  ```powershell
  $env:KITABU_WEB_APP_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"; npm run dev:api
  ```
  (dotenv won't override an already-set shell var; this only widens the CORS allowlist, no other prod behavior changes.)

Then, as a **parent** account: verify Home (hero ring, quick actions, glance tabs, recent progress, teacher note), Learning (assignments + 6-week chart), Insights (weekly report), Ask Rafiki (send a question → grounded reply), Message teacher (quick action + Reply), Lock phone (Focus Mode), and the header dropdown (switch/add/remove child, sign out).

---

## 7. Acceptance criteria

- [ ] Home matches the mockup: greeting + "{Child}'s Parent ⌄", "This Week" hero with % ring, 4 quick actions, "Today at a glance" with 3 range tabs, "Recent progress" (Strengths / Needs focus), Teacher note with Reply.
- [ ] Bottom nav = Home / Learning / Insights / Ask Rafiki; each renders its view; Messages routes back under Home.
- [ ] Ask Rafiki produces grounded, parent-facing answers (feature `parent_progress_assistant`, no 402 for parents).
- [ ] Pay fees / subscription opens the existing M-Pesa checkout modal.
- [ ] All retained functionality works: link child, switch/remove child (header dropdown), Focus Mode notice/setup/start, teacher messaging, weekly report, six-week chart, sign out (bell long-press **and** dropdown).
- [ ] `npm run check`, `build`, `test:api`, `typecheck:native`, `lint:native` (0 warnings), `test:native` all green.

---

## 8. Guardrails (from `CLAUDE.md` / `AGENTS.md`)

- Keep AI calls behind `native-app/.../aiService.ts` → `/ai/generate-text` (done; no direct model calls in the screen).
- Validate API inputs with Zod (unchanged; the generate-text schema already validates `feature`).
- No hardcoded secrets. No new DB tables/migrations (this feature needs none).
- **Leave the unrelated dirty worktree changes untouched** — this branch also has teacher-portal edits in `KitabuApp.tsx`, `TeacherPortalScreen.tsx`, `TeacherStudentsSection.tsx`, `__tests__/TeacherPortalScreen.test.tsx`. Only add the single `onOpenBilling` line in the `parent_dashboard` case of `KitabuApp.tsx`.
- Run API build + native tests/lint before declaring done.

---

## 9. File-change inventory

| File | Status | Change |
|---|---|---|
| `apps/api/src/aiFeatures.ts` | ✅ done | `parent_progress_assistant` feature id + `parentProgressContextLines` + definition |
| `apps/api/src/server.ts` | ✅ done | parents bypass subscription for `parent_progress_assistant` |
| `apps/api/src/aiFeatures.test.ts` | ✅ done | feature id added to REQUIRED + NO_RESPONSE_CACHE lists |
| `native-app/src/services/aiService.ts` | ✅ done | `ParentAssistantContext` + `askParentAssistant()` |
| `native-app/src/screens/ParentDashboardScreen.tsx` | ⬜ Step A | full rewrite (§3) |
| `native-app/src/KitabuApp.tsx` | ⬜ Step B | add `onOpenBilling` prop to `parent_dashboard` case only |
| `native-app/__tests__/ParentDashboardScreen.test.tsx` | ⬜ Step C | full replacement (§5) |
