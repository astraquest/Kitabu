import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  CalendarCheck2,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flag,
  GraduationCap,
  Home,
  ImageIcon,
  Inbox,
  Info,
  Link2,
  MessageSquareText,
  MessageCircle,
  Paperclip,
  Pencil,
  Send,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';

import { TeacherAssignmentDetailSection } from '../components/teacher/TeacherAssignmentDetailSection';
import { TeacherAssignmentsSection } from '../components/teacher/TeacherAssignmentsSection';
import { TeacherAssignmentWizardSection } from '../components/teacher/TeacherAssignmentWizardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherSubmissionReviewSection } from '../components/teacher/TeacherSubmissionReviewSection';
import { ReportAiContentSheet } from '../components/ReportAiContentSheet';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { studentPerformanceToModalUser } from '../components/studentDetailsAdapters';
import { RemedialAssignmentPayload } from '../components/studentRemedialLogic';
import { SUPPORTED_GRADES, TEACHER_ALL_GRADES_FILTER } from '../constants/grades';
import {
  COUNTRY_OPTIONS,
  CountryOption,
  REGIONS_BY_COUNTRY,
  countryCodeForName,
  countryNameForCode,
} from '../constants/locations';
import { generateAssignmentJson, generateLessonPlanIdeas } from '../services/aiService';
import { getCurriculumForGrade } from '../services/curriculumService';
import {
  getTeacherParentMessages,
  getTeacherParents,
  reportTeacherParentMessage,
  saveTeacherLessonPlan,
  sendTeacherParentMessage,
  TeacherParentContact,
  TeacherParentMessage,
} from '../services/teacherService';
import {
  Assignment,
  CurriculumSubjectBundle,
  Question,
  SchoolData,
  StudentPerformance,
  StudentSubmission,
  SubmittedAssignment,
  UserProfile,
} from '../types/app';
import {
  locationsMatch,
  prioritizeLocationsBySchoolCount,
  prioritizeSchoolsByEnrollment,
} from '../utils/locationOptionPriority';

interface TeacherPortalScreenProps {
  teacherName?: string;
  teacherEmail?: string;
  students: StudentPerformance[];
  assignments: SubmittedAssignment[];
  submissionsByAssignment: Record<string, StudentSubmission[]>;
  schoolsList?: SchoolData[];
  userProfile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => void;
  onSignOut?: () => void | Promise<void>;
  onPublishAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
}

type Tab = 'students' | 'assignments';
type PortalView = 'students' | 'assignments' | 'lessonPlan' | 'messages' | 'profile';
type WizardStep = 1 | 2;
type SlideDirection = 'right' | 'bottom';
type TeacherBottomNavItem = 'home' | 'students' | 'insights' | 'messages' | 'lessonPlan' | null;
type MessageAudienceMode = 'grade' | 'parent';
type MessageDropdownOption = { value: string; label: string; meta?: string };

const SCREEN = Dimensions.get('window');
const TEACHER_TOP_INSET = Platform.OS === 'web' ? 10 : 22;
const logoAsset = require('../assets/logo.png');
const TEACHER_DEFAULT_GRADE = 'Grade 10';
type TeacherCountryCode = CountryOption['code'];

function SlideOverlay({
  visible,
  direction,
  onRequestClose,
  children,
}: {
  visible: boolean;
  direction: SlideDirection;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  const start = direction === 'right' ? SCREEN.width : SCREEN.height;
  const translate = useRef(new Animated.Value(start)).current;

  useEffect(() => {
    if (!visible) {
      translate.stopAnimation();
      return undefined;
    }

    translate.setValue(start);
    const animation = Animated.timing(translate, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [direction, start, translate, visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onRequestClose}>
      <Animated.View
        style={[
          s.overlayFill,
          direction === 'right'
            ? { transform: [{ translateX: translate }] }
            : { transform: [{ translateY: translate }] },
        ]}>
        {children}
      </Animated.View>
    </Modal>
  );
}

function FloatingAssignmentModal({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onRequestClose}>
      <View style={s.floatingModalOverlay}>
        <Pressable style={s.floatingModalBackdrop} onPress={onRequestClose} />
        <View style={s.assignmentModalCard}>{children}</View>
      </View>
    </Modal>
  );
}

function buildAnswerKey(question?: Question) {
  if (!question?.correctAnswer) {
    return 'Answer key unavailable';
  }

  const answer =
    typeof question.correctAnswer === 'boolean'
      ? question.correctAnswer
        ? 'True'
        : 'False'
      : question.correctAnswer;

  return question.explanation
    ? `${answer}. ${question.explanation}`
    : answer;
}

export function TeacherPortalScreen({
  teacherName,
  teacherEmail,
  students,
  assignments,
  submissionsByAssignment,
  schoolsList = [],
  userProfile,
  onSaveProfile,
  onSignOut,
  onPublishAssignment,
}: TeacherPortalScreenProps) {
  const [tab, setTab] = useState<Tab>('students');
  const [portalView, setPortalView] = useState<PortalView>('students');
  const [selectedGrade, setSelectedGrade] = useState(TEACHER_DEFAULT_GRADE);
  const [gradeFilter, setGradeFilter] = useState(TEACHER_DEFAULT_GRADE);
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'score'>('name');
  const [showRemedial, setShowRemedial] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [assignmentSortBy, setAssignmentSortBy] = useState<'date' | 'subject'>('date');
  const [student, setStudent] = useState<StudentPerformance | null>(null);
  const [assignment, setAssignment] = useState<SubmittedAssignment | null>(null);
  const [submission, setSubmission] = useState<StudentSubmission | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [step, setStep] = useState<WizardStep>(1);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState(TEACHER_DEFAULT_GRADE);
  const [dueInDays, setDueInDays] = useState(7);
  const [strand, setStrand] = useState('');
  const [subStrand, setSubStrand] = useState('');
  const [wizardGradeOpen, setWizardGradeOpen] = useState(false);
  const [wizardSubjectOpen, setWizardSubjectOpen] = useState(false);
  const [wizardStrandOpen, setWizardStrandOpen] = useState(false);
  const [wizardSubStrandOpen, setWizardSubStrandOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const teacherProfile: UserProfile = userProfile ?? {
    name: getTeacherDisplayName(teacherName),
    email: teacherEmail || '',
    gender: 'Not Specified',
    role: 'Teacher Account',
  };
  const storedCountryCode = COUNTRY_OPTIONS.some(option => option.code === teacherProfile.countryCode)
    ? (teacherProfile.countryCode as TeacherCountryCode)
    : undefined;
  const initialCountryCode = storedCountryCode || countryCodeForName(teacherProfile.country);
  const initialRegionMeta = REGIONS_BY_COUNTRY[initialCountryCode] ?? REGIONS_BY_COUNTRY.KE;
  const [profileName, setProfileName] = useState(
    teacherProfile.name || getTeacherDisplayName(teacherName),
  );
  const [profileEmail, setProfileEmail] = useState(
    teacherProfile.email || teacherEmail || 'demoaccount@kitabu.ai',
  );
  const [profilePhone, setProfilePhone] = useState(teacherProfile.phone || '');
  const [profileSchool, setProfileSchool] = useState(teacherProfile.school || '');
  const [profileCountryCode, setProfileCountryCode] = useState<TeacherCountryCode>(
    initialCountryCode,
  );
  const [profileRegion, setProfileRegion] = useState(
    teacherProfile.region || teacherProfile.county || initialRegionMeta.options[0] || '',
  );
  const [taughtGrades, setTaughtGrades] = useState<string[]>(
    teacherProfile.taughtGrades?.length
      ? teacherProfile.taughtGrades
      : [TEACHER_DEFAULT_GRADE, 'Grade 9'],
  );
  const [taughtSubjects, setTaughtSubjects] = useState<string[]>(
    teacherProfile.taughtSubjects?.length
      ? teacherProfile.taughtSubjects
      : [],
  );
  const [curriculumByGrade, setCurriculumByGrade] = useState<
    Record<string, CurriculumSubjectBundle[]>
  >({});
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumLoadError, setCurriculumLoadError] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    questions: Assignment['questions'];
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredStudents = useMemo(
    () =>
      [...students]
        .filter(item => gradeFilter === 'All' || item.grade === gradeFilter)
        .filter(item => !showRemedial || item.assessmentScore < 70)
        .sort((a, b) =>
          sortBy === 'name'
            ? a.name.localeCompare(b.name)
            : b.assessmentScore - a.assessmentScore,
        ),
    [students, gradeFilter, showRemedial, sortBy],
  );

  const scopedStudents = useMemo(
    () =>
      gradeFilter === TEACHER_ALL_GRADES_FILTER
        ? students
        : students.filter(item => item.grade === gradeFilter),
    [gradeFilter, students],
  );

  const homeNeedHelp = useMemo(
    () =>
      [...scopedStudents]
        .sort((a, b) => a.assessmentScore - b.assessmentScore)
        .slice(0, 5),
    [scopedStudents],
  );

  const homeImproved = useMemo(
    () =>
      [...scopedStudents]
        .filter(item => item.trend === 'Improving' || item.trend === 'Excellent')
        .sort((a, b) => b.assessmentScore - a.assessmentScore)
        .slice(0, 3),
    [scopedStudents],
  );

  const teacherGradeOptions = useMemo(() => {
    const selectedOptions = SUPPORTED_GRADES.filter(option => taughtGrades.includes(option));
    return selectedOptions.length > 0 ? selectedOptions : [TEACHER_DEFAULT_GRADE];
  }, [taughtGrades]);

  const countryConfig =
    COUNTRY_OPTIONS.find(option => option.code === profileCountryCode) ?? COUNTRY_OPTIONS[0];
  const curriculumSubjectsByGrade = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(curriculumByGrade).map(([gradeLevel, bundles]) => [
          gradeLevel,
          bundles.map(bundle => bundle.subjectName),
        ]),
      ),
    [curriculumByGrade],
  );
  const profileSubjectOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...Object.values(curriculumSubjectsByGrade).flat(),
          ...taughtSubjects,
        ]),
      ).sort((left, right) => left.localeCompare(right)),
    [curriculumSubjectsByGrade, taughtSubjects],
  );
  const hasPublishedCurriculumSubjects = Object.values(curriculumSubjectsByGrade).some(
    subjects => subjects.length > 0,
  );
  const assignmentCurriculum = useMemo(
    () => curriculumByGrade[grade] ?? [],
    [curriculumByGrade, grade],
  );
  const subjectStrands = useMemo(
    () =>
      Object.fromEntries(
        assignmentCurriculum.map(bundle => [
          bundle.subjectName,
          bundle.strands.map(curriculumStrand => curriculumStrand.title),
        ]),
      ),
    [assignmentCurriculum],
  );
  const strandSubStrands = useMemo(
    () =>
      Object.fromEntries(
        assignmentCurriculum.map(bundle => [
          bundle.subjectName,
          Object.fromEntries(
            bundle.strands.map(curriculumStrand => [
              curriculumStrand.title,
              curriculumStrand.subStrands.map(item => item.title),
            ]),
          ),
        ]),
      ),
    [assignmentCurriculum],
  );

  useEffect(() => {
    let active = true;
    setCurriculumLoading(true);
    setCurriculumLoadError(false);
    setCurriculumByGrade({});

    Promise.all(
      teacherGradeOptions.map(async gradeLevel => {
        const result = await getCurriculumForGrade(gradeLevel, undefined, {
          countryCode: profileCountryCode,
          curriculumCode: countryConfig.curriculumCode,
        });
        return [gradeLevel, result.subjects] as const;
      }),
    )
      .then(entries => {
        if (active) {
          setCurriculumByGrade(Object.fromEntries(entries));
        }
      })
      .catch(() => {
        if (active) {
          setCurriculumLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setCurriculumLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [countryConfig.curriculumCode, profileCountryCode, teacherGradeOptions]);

  useEffect(() => {
    const nextSubjects = curriculumSubjectsByGrade[grade] ?? [];
    if (!nextSubjects.includes(subject)) {
      setSubject(nextSubjects[0] ?? '');
      setStrand('');
      setSubStrand('');
    }
  }, [curriculumSubjectsByGrade, grade, subject]);

  const filteredAssignments = useMemo(
    () =>
      [...assignments]
        .filter(item => subjectFilter === 'All' || item.subject === subjectFilter)
        .sort((a, b) =>
          assignmentSortBy === 'subject'
            ? a.subject.localeCompare(b.subject)
            : new Date(b.dateSent).getTime() - new Date(a.dateSent).getTime(),
        ),
    [assignments, assignmentSortBy, subjectFilter],
  );

  const scopedAverageScore = Math.round(
    scopedStudents.reduce((total, current) => total + current.assessmentScore, 0) /
      Math.max(1, scopedStudents.length),
  );
  const scopedRemedialCount = scopedStudents.filter(item => item.assessmentScore < 70).length;
  const openAssignmentCount = assignments.filter(item => item.submittedCount < item.totalStudents).length;
  const totalExpectedSubmissions = assignments.reduce(
    (total, current) => total + current.totalStudents,
    0,
  );
  const totalSubmitted = assignments.reduce((total, current) => total + current.submittedCount, 0);
  const submissionRate = Math.round(
    (totalSubmitted / Math.max(1, totalExpectedSubmissions)) * 100,
  );
  const activeSubmissionList = assignment
    ? submissionsByAssignment[assignment.id] || []
    : [];

  const questionLookup = useMemo(
    () =>
      new Map((assignment?.questions || []).map(question => [question.id, question])),
    [assignment],
  );
  const portalStyles = useMemo(() => createTeacherPortalStyles(), []);
  const saveTeacherProfile = (patch: Partial<UserProfile>) => {
    onSaveProfile?.({
      ...teacherProfile,
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      school: profileSchool,
      country: countryNameForCode(profileCountryCode),
      countryCode: profileCountryCode,
      curriculumCode: countryConfig.curriculumCode,
      region: profileRegion,
      county: profileRegion,
      regionLabel: (REGIONS_BY_COUNTRY[profileCountryCode] ?? REGIONS_BY_COUNTRY.KE).label,
      taughtGrades,
      taughtSubjects,
      ...patch,
    });
  };
  const saveTeacherPersonalDetails = (details: {
    email: string;
    name: string;
    phone: string;
    region: string;
    school: string;
  }) => {
    setProfileName(details.name);
    setProfileEmail(details.email);
    setProfilePhone(details.phone);
    setProfileRegion(details.region);
    setProfileSchool(details.school);
    onSaveProfile?.({
      ...teacherProfile,
      name: details.name,
      email: details.email,
      phone: details.phone,
      school: details.school,
      country: countryNameForCode(profileCountryCode),
      countryCode: profileCountryCode,
      curriculumCode: countryConfig.curriculumCode,
      region: details.region,
      county: details.region,
      regionLabel: (REGIONS_BY_COUNTRY[profileCountryCode] ?? REGIONS_BY_COUNTRY.KE).label,
      taughtGrades,
      taughtSubjects,
    });
  };

  useEffect(() => {
    if (teacherGradeOptions.includes(selectedGrade)) {
      return;
    }

    const nextGrade = teacherGradeOptions[0] || TEACHER_DEFAULT_GRADE;
    setSelectedGrade(nextGrade);
    setGradeFilter(nextGrade);
    setGrade(nextGrade);
  }, [teacherGradeOptions, selectedGrade]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function handleGenerateAssignment() {
    setIsGenerating(true);
    const result = await generateAssignmentJson(grade, subject, strand, subStrand, topic);

    if (result && result.questions) {
      setDraft({
        title: result.title,
        description: result.description,
        questions: result.questions,
      });
      setStep(2);
    } else {
      Alert.alert('Generation Failed', 'Could not generate assignment. Please try again.');
    }

    setIsGenerating(false);
  }

  function updateDraftQuestion(index: number, updater: (question: Question) => Question) {
    setDraft(current =>
      current
        ? {
            ...current,
            questions: current.questions.map((question, questionIndex) =>
              questionIndex === index ? updater(question) : question,
            ),
          }
        : current,
    );
  }

  async function handlePublish() {
    if (!draft) {
      return;
    }

    setIsSending(true);
    const dueDate = new Date(Date.now() + dueInDays * 24 * 60 * 60 * 1000).toISOString();

    try {
      await onPublishAssignment({
        title: draft.title,
        description: draft.description,
        subject,
        gradeLevel: grade,
        dueDate,
        questions: draft.questions,
      });

      setIsSending(false);
      setWizardOpen(false);
      setStep(1);
      setDraft(null);
      setTopic('');
      setStrand('');
      setSubStrand('');
      setDueInDays(7);
      setTab('assignments');
      setToast(true);
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => setToast(false), 3000);
    } catch (error) {
      setIsSending(false);
      Alert.alert(
        'Assignment Failed',
        error instanceof Error ? error.message : 'Could not publish assignment.',
      );
    }
  }

  function closeWizard() {
    if (isGenerating || isSending) {
      return;
    }
    setWizardOpen(false);
  }

  function openRemedialAssignment(payload: RemedialAssignmentPayload) {
    setGrade(payload.grade);
    setSubject(payload.subject);
    setStrand('');
    setSubStrand('');
    setTopic(payload.topic);
    setDraft(payload.draft);
    setStep(2);
    setStudent(null);
    setWizardOpen(true);
  }

  function openPortalSection(section: Tab) {
    setTab(section);
    setPortalView(section);
  }

  function openTeacherHome() {
    setTab('students');
    setPortalView('students');
    setGradeFilter(selectedGrade);
    setShowRemedial(false);
    setSortBy('name');
  }

  function openTeacherStudents() {
    setTab('students');
    setPortalView('students');
    setGradeFilter(TEACHER_ALL_GRADES_FILTER);
    setShowRemedial(false);
    setSortBy('name');
  }

  function openTeacherInsights() {
    setTab('students');
    setPortalView('students');
    setShowRemedial(true);
    setSortBy('score');
  }

  const isHomeState =
    tab === 'students' &&
    portalView === 'students' &&
    !showRemedial &&
    gradeFilter === selectedGrade;
  const overdueAssignmentCount = assignments.filter(item => {
    if (!item.dueDate) {
      return false;
    }
    const due = new Date(item.dueDate).getTime();
    return Number.isFinite(due) && due < Date.now() && item.submittedCount < item.totalStudents;
  }).length;
  const attentionItems = [
    totalSubmitted > 0
      ? {
          key: 'review',
          count: totalSubmitted,
          tone: 'ink' as const,
          text: `submission${totalSubmitted === 1 ? '' : 's'} in — tap to review learner work`,
          onPress: () => openPortalSection('assignments'),
        }
      : null,
    scopedRemedialCount > 0
      ? {
          key: 'support',
          count: scopedRemedialCount,
          tone: 'ink' as const,
          text: `learner${scopedRemedialCount === 1 ? '' : 's'} need support — below 70% in ${selectedGrade}`,
          onPress: openTeacherInsights,
        }
      : null,
    overdueAssignmentCount > 0
      ? {
          key: 'overdue',
          count: overdueAssignmentCount,
          tone: 'red' as const,
          text: `past due — some learners haven't submitted`,
          onPress: () => openPortalSection('assignments'),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    count: number;
    tone: 'ink' | 'red';
    text: string;
    onPress: () => void;
  }>;

  function renderHomeCockpit() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const todayLabel = new Date().toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const firstName = (profileName || 'Teacher').trim().split(/\s+/)[0];
    const pulsePhrase =
      scopedAverageScore >= 80
        ? 'Cruising above target'
        : scopedAverageScore >= 60
          ? 'Holding steady'
          : 'Needs a push';
    const RING_RADIUS = 30;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    const ringOffset =
      RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, scopedAverageScore)) / 100);

    return (
      <View style={portalStyles.cockpit}>
        <LinearGradient
          colors={['#FF8A3D', '#FF5710']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={portalStyles.homeHero}>
          <View pointerEvents="none" style={portalStyles.homeHeroBubbleLarge} />
          <View pointerEvents="none" style={portalStyles.homeHeroBubbleSmall} />
          <Text style={portalStyles.homeHeroDate}>{todayLabel}</Text>
          <Text style={portalStyles.homeHeroTitle}>
            {greeting}, {firstName} 👋
          </Text>
          <Text style={portalStyles.homeHeroSubline}>
            {selectedGrade} · {scopedStudents.length} student{scopedStudents.length === 1 ? '' : 's'}
          </Text>
        </LinearGradient>

        <View style={portalStyles.pulseCard}>
          <View style={portalStyles.pulseRing}>
            <Svg width={64} height={64} viewBox="0 0 74 74">
              <Circle cx={37} cy={37} r={RING_RADIUS} stroke="#F1E6DE" strokeWidth={7} fill="none" />
              <Circle
                cx={37}
                cy={37}
                r={RING_RADIUS}
                stroke="#FF5710"
                strokeWidth={7}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={ringOffset}
                rotation={-90}
                origin="37, 37"
              />
            </Svg>
            <View style={portalStyles.pulseRingCenter}>
              <Text style={portalStyles.pulseRingValue}>{scopedAverageScore}%</Text>
            </View>
          </View>
          <View style={portalStyles.pulseMain}>
            <Text style={portalStyles.pulseLabel}>Class Average</Text>
            <Text style={portalStyles.pulsePhrase}>{pulsePhrase}</Text>
          </View>
          <View style={portalStyles.pulseSide}>
            <Text style={portalStyles.pulseSideValue}>{scopedStudents.length}</Text>
            <Text style={portalStyles.pulseSideLabel}>Active</Text>
          </View>
        </View>

        <View style={portalStyles.attentionStrip}>
          {attentionItems.length > 0 ? (
            attentionItems.map((item, index) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={[portalStyles.glassRow, index > 0 && portalStyles.glassRowDivider]}>
                <Text
                  style={[
                    portalStyles.glassNum,
                    item.tone === 'red' && portalStyles.glassNumRed,
                  ]}>
                  {item.count}
                </Text>
                <Text numberOfLines={2} style={portalStyles.glassText}>
                  {item.text}
                </Text>
                <ChevronRight size={16} color="#C5BEB8" />
              </Pressable>
            ))
          ) : (
            <View style={portalStyles.glassRow}>
              <CheckCircle2 size={22} color="#16A34A" />
              <Text style={portalStyles.glassText}>
                All caught up! Nothing needs your attention right now.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  function renderTopNav() {
    return (
      <View style={portalStyles.listPortalHeader}>
        <View accessibilityLabel="Kitabu AI logo" style={portalStyles.headerLogoBadge}>
          <Image source={logoAsset} style={portalStyles.headerLogoImage} resizeMode="contain" />
        </View>
        <View style={portalStyles.titleBlock}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            numberOfLines={1}
            style={portalStyles.headerTitle}>
            Teacher's Portal
          </Text>
        </View>
        <View style={portalStyles.portalActionGroup}>
          <Pressable
            accessibilityLabel="Open teacher profile"
            onPress={() => setPortalView('profile')}
            style={portalStyles.portalProfileButton}>
            <Text style={portalStyles.portalProfileInitials}>
              {getInitials(profileName || 'Teacher')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderBottomNav(activeItem: TeacherBottomNavItem) {
    return (
      <View style={portalStyles.bottomNav}>
        <Pressable
          accessibilityLabel="Open teacher home"
          onPress={openTeacherHome}
          style={portalStyles.bottomNavItem}>
          <Home
            color={
              activeItem === 'home'
                ? portalStyles.bottomNavActiveColor
                : portalStyles.bottomNavIconColor
            }
            size={24}
            strokeWidth={2.5}
          />
          <Text
            style={[
              portalStyles.bottomNavLabel,
              activeItem === 'home' && portalStyles.bottomNavLabelActive,
            ]}>
            Home
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Open students"
          onPress={openTeacherStudents}
          style={portalStyles.bottomNavItem}>
          <Users
            color={
              activeItem === 'students'
                ? portalStyles.bottomNavActiveColor
                : portalStyles.bottomNavIconColor
            }
            size={24}
            strokeWidth={2.5}
          />
          <Text
            style={[
              portalStyles.bottomNavLabel,
              activeItem === 'students' && portalStyles.bottomNavLabelActive,
            ]}>
            Students
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Open insights"
          onPress={openTeacherInsights}
          style={portalStyles.bottomNavItem}>
          <BarChart3
            color={
              activeItem === 'insights'
                ? portalStyles.bottomNavActiveColor
                : portalStyles.bottomNavIconColor
            }
            size={24}
            strokeWidth={2.5}
          />
          <Text
            style={[
              portalStyles.bottomNavLabel,
              activeItem === 'insights' && portalStyles.bottomNavLabelActive,
            ]}>
            Insights
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Open parent messages"
          onPress={() => setPortalView('messages')}
          style={portalStyles.bottomNavItem}>
          <MessageSquareText
            color={
              activeItem === 'messages'
                ? portalStyles.bottomNavActiveColor
                : portalStyles.bottomNavIconColor
            }
            size={24}
            strokeWidth={2.5}
          />
          <Text
            style={[
              portalStyles.bottomNavLabel,
              activeItem === 'messages' && portalStyles.bottomNavLabelActive,
            ]}>
            Messages
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Open lesson planner"
          onPress={() => setPortalView('lessonPlan')}
          style={portalStyles.bottomNavItem}>
          <CalendarCheck2
            color={
              activeItem === 'lessonPlan'
                ? portalStyles.bottomNavActiveColor
                : portalStyles.bottomNavIconColor
            }
            size={24}
            strokeWidth={2.5}
          />
          <Text
            style={[
              portalStyles.bottomNavLabel,
              activeItem === 'lessonPlan' && portalStyles.bottomNavLabelActive,
            ]}>
            Lesson Plan
          </Text>
        </Pressable>
      </View>
    );
  }

  function toggleTaughtGrade(value: string) {
    setTaughtGrades(current =>
      current.includes(value)
        ? current.length > 1
          ? current.filter(item => item !== value)
          : current
        : [...current, value],
    );
  }

  function toggleTaughtSubject(value: string) {
    setTaughtSubjects(current =>
      current.includes(value) ? current.filter(item => item !== value) : [...current, value],
    );
  }

  return (
    <View style={s.root}>
      <View style={s.teacherPhoneShell}>
        {portalView === 'profile' ? (
          <TeacherProfileView
            countryCode={profileCountryCode}
            email={profileEmail}
            name={profileName}
            phone={profilePhone}
            region={profileRegion}
            school={profileSchool}
            schools={schoolsList}
            taughtGrades={taughtGrades}
            taughtSubjects={taughtSubjects}
            subjectOptions={profileSubjectOptions}
            curriculumStatus={
              curriculumLoading
                ? `Loading ${countryConfig.curriculumCode} curriculum...`
                : curriculumLoadError
                  ? 'Curriculum could not be loaded. Try again when the connection is stable.'
                  : !hasPublishedCurriculumSubjects
                    ? `${countryConfig.curriculumCode} curriculum has not been published for the selected grades.`
                    : `${countryConfig.curriculumCode} subjects are loaded from the published curriculum.`
            }
            onBack={() => setPortalView(tab)}
            onSignOut={onSignOut}
            onChangeCountry={value => {
              const nextRegionMeta = REGIONS_BY_COUNTRY[value] ?? REGIONS_BY_COUNTRY.KE;
              const nextRegion = nextRegionMeta.options[0] || '';
              setProfileCountryCode(value);
              setProfileRegion(nextRegion);
              saveTeacherProfile({
                country: countryNameForCode(value),
                countryCode: value,
                curriculumCode:
                  COUNTRY_OPTIONS.find(option => option.code === value)?.curriculumCode ?? 'CBC',
                region: nextRegion,
                county: nextRegion,
                regionLabel: nextRegionMeta.label,
              });
            }}
            onSavePersonalDetails={saveTeacherPersonalDetails}
            onToggleGrade={value => {
              toggleTaughtGrade(value);
              const nextGrades = taughtGrades.includes(value)
                ? taughtGrades.filter(item => item !== value)
                : [...taughtGrades, value];
              saveTeacherProfile({ taughtGrades: nextGrades });
            }}
            onToggleSubject={value => {
              toggleTaughtSubject(value);
              const nextSubjects = taughtSubjects.includes(value)
                ? taughtSubjects.filter(item => item !== value)
                : [...taughtSubjects, value];
              saveTeacherProfile({ taughtSubjects: nextSubjects });
            }}
          />
        ) : portalView === 'lessonPlan' ? (
          <TeacherLessonPlanView
            grade={selectedGrade}
            grades={teacherGradeOptions}
            subjectsByGrade={curriculumSubjectsByGrade}
            curriculumLabel={countryConfig.curriculumCode}
            bottomNav={renderBottomNav('lessonPlan')}
            topNav={renderTopNav()}
          />
        ) : portalView === 'messages' ? (
          <TeacherMessagesView
            grade={selectedGrade}
            grades={teacherGradeOptions}
            bottomNav={renderBottomNav('messages')}
            topNav={renderTopNav()}
          />
        ) : (
          <View style={portalStyles.teacherListPortal}>
            {renderTopNav()}

            <View style={portalStyles.segmented}>
              {(['students', 'assignments'] as const).map(value => (
                <Pressable
                  key={value}
                  onPress={() => openPortalSection(value)}
                  style={[portalStyles.seg, tab === value && portalStyles.segActive]}>
                  <Text style={[portalStyles.segText, tab === value && portalStyles.segTextActive]}>
                    {value === 'students' ? 'Students' : 'Assignments'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView contentContainerStyle={portalStyles.content}>
              {isHomeState ? renderHomeCockpit() : null}
              {tab === 'students' && showRemedial ? (
                <View style={portalStyles.insightsHeader}>
                  <View style={portalStyles.insightsIconBadge}>
                    <BarChart3 size={20} color="#B45309" strokeWidth={2.4} />
                  </View>
                  <View style={portalStyles.insightsHeaderMain}>
                    <Text style={portalStyles.insightsTitle}>Class Insights</Text>
                    <Text style={portalStyles.insightsSubline}>
                      Learners scoring below 70% — tap one to see the root cause and set a remedial
                      task.
                    </Text>
                  </View>
                </View>
              ) : null}
              {tab === 'students' ? (
                <TeacherStudentsSection
                  styles={portalStyles}
                  gradeFilter={gradeFilter}
                  gradeMenuOpen={gradeMenuOpen}
                  subjectFilter={subjectFilter}
                  subjectMenuOpen={subjectMenuOpen}
                  sortBy={sortBy}
                  showRemedial={showRemedial}
                  showMetrics={!isHomeState}
                  homeMode={isHomeState}
                  needHelpStudents={homeNeedHelp}
                  improvedStudents={homeImproved}
                  averageScore={scopedAverageScore}
                  remedialCount={scopedRemedialCount}
                  classSize={scopedStudents.length}
                  filteredStudents={filteredStudents}
                  onToggleGradeMenu={() => setGradeMenuOpen(open => !open)}
                  onSelectGrade={value => {
                    setGradeFilter(value);
                    if (value !== 'All') {
                      setSelectedGrade(value);
                    }
                    setGradeMenuOpen(false);
                  }}
                  onToggleSubjectMenu={() => setSubjectMenuOpen(open => !open)}
                  onSelectSubject={value => {
                    setSubjectFilter(value);
                    setSubjectMenuOpen(false);
                  }}
                  onToggleSort={() => setSortBy(sortBy === 'name' ? 'score' : 'name')}
                  onToggleSupportFilter={() => setShowRemedial(current => !current)}
                  onSelectStudent={setStudent}
                />
              ) : (
                <TeacherAssignmentsSection
                  styles={portalStyles}
                  subjectFilter={subjectFilter}
                  subjectMenuOpen={subjectMenuOpen}
                  assignmentSortBy={assignmentSortBy}
                  submissionRate={submissionRate}
                  openAssignmentCount={openAssignmentCount}
                  filteredAssignments={filteredAssignments}
                  onToggleSubjectMenu={() => setSubjectMenuOpen(open => !open)}
                  onSelectSubject={value => {
                    setSubjectFilter(value);
                    setSubjectMenuOpen(false);
                  }}
                  onToggleSort={() =>
                    setAssignmentSortBy(assignmentSortBy === 'date' ? 'subject' : 'date')
                  }
                  onCreateAssignment={() => setWizardOpen(true)}
                  onSelectAssignment={setAssignment}
                />
              )}
            </ScrollView>

            {renderBottomNav(
              showRemedial
                ? 'insights'
                : tab === 'students' && gradeFilter === TEACHER_ALL_GRADES_FILTER
                  ? 'students'
                  : tab === 'students' && gradeFilter === selectedGrade
                    ? 'home'
                    : null,
            )}
          </View>
        )}
      </View>

      {student ? (
        <StudentDetailsModal
          user={studentPerformanceToModalUser(student)}
          assessmentScore={student.assessmentScore}
          onCreateRemedialAssignment={openRemedialAssignment}
          onClose={() => setStudent(null)}
        />
      ) : null}

      <SlideOverlay
        visible={assignment !== null}
        direction="right"
        onRequestClose={() => {
          setAssignment(null);
          setSubmission(null);
        }}>
        {assignment ? (
          <TeacherAssignmentDetailSection
            styles={s}
            assignment={assignment}
            activeSubmissionList={activeSubmissionList}
            onBack={() => setAssignment(null)}
            onSelectSubmission={setSubmission}
          />
        ) : null}
      </SlideOverlay>

      <SlideOverlay
        visible={submission !== null}
        direction="right"
        onRequestClose={() => setSubmission(null)}>
        {submission ? (
          <TeacherSubmissionReviewSection
            styles={s}
            submission={submission}
            getAnswerKey={questionId => buildAnswerKey(questionLookup.get(questionId))}
            onBack={() => setSubmission(null)}
          />
        ) : null}
      </SlideOverlay>

      <FloatingAssignmentModal visible={wizardOpen} onRequestClose={closeWizard}>
        <TeacherAssignmentWizardSection
          styles={s}
          step={step}
          closeWizard={closeWizard}
          isGenerating={isGenerating}
          isSending={isSending}
          gradeOptions={teacherGradeOptions}
          grade={grade}
          subject={subject}
          strand={strand}
          subStrand={subStrand}
          topic={topic}
          wizardGradeOpen={wizardGradeOpen}
          wizardSubjectOpen={wizardSubjectOpen}
          wizardStrandOpen={wizardStrandOpen}
          wizardSubStrandOpen={wizardSubStrandOpen}
          draft={draft}
          dueInDays={dueInDays}
          subjectStrands={subjectStrands}
          strandSubStrands={strandSubStrands}
          onSetDueInDays={setDueInDays}
          onSetStep={setStep}
          onSetGrade={value => {
            setGrade(value);
            const nextSubject = curriculumSubjectsByGrade[value]?.[0] ?? '';
            setSubject(nextSubject);
            setStrand('');
            setSubStrand('');
            setWizardGradeOpen(false);
          }}
          onSetSubject={value => {
            setSubject(value);
            setStrand('');
            setSubStrand('');
            setWizardSubjectOpen(false);
          }}
          onSetStrand={value => {
            setStrand(value === 'All Strands' ? '' : value);
            setSubStrand('');
            setWizardStrandOpen(false);
          }}
          onSetSubStrand={value => {
            setSubStrand(value === 'All Sub-strands' ? '' : value);
            setWizardSubStrandOpen(false);
          }}
          onSetTopic={setTopic}
          onToggleGradeOpen={() => {
            setWizardGradeOpen(open => !open);
            setWizardSubjectOpen(false);
            setWizardStrandOpen(false);
            setWizardSubStrandOpen(false);
          }}
          onToggleSubjectOpen={() => {
            setWizardSubjectOpen(open => !open);
            setWizardGradeOpen(false);
            setWizardStrandOpen(false);
            setWizardSubStrandOpen(false);
          }}
          onToggleStrandOpen={() => {
            setWizardStrandOpen(open => !open);
            setWizardGradeOpen(false);
            setWizardSubjectOpen(false);
            setWizardSubStrandOpen(false);
          }}
          onToggleSubStrandOpen={() => {
            setWizardSubStrandOpen(open => !open);
            setWizardGradeOpen(false);
            setWizardSubjectOpen(false);
            setWizardStrandOpen(false);
          }}
          onGenerate={handleGenerateAssignment}
          onUpdateDraftTitle={value =>
            setDraft(current => (current ? { ...current, title: value } : current))
          }
          onUpdateDraftDescription={value =>
            setDraft(current => (current ? { ...current, description: value } : current))
          }
          onUpdateQuestionText={(index, value) =>
            updateDraftQuestion(index, current => ({ ...current, text: value }))
          }
          onUpdateOption={(questionIndex, optionIndex, value) =>
            updateDraftQuestion(questionIndex, current => ({
              ...current,
              options: (current.options || []).map((item, itemIndex) =>
                itemIndex === optionIndex ? value : item,
              ),
            }))
          }
          onAddOption={questionIndex =>
            updateDraftQuestion(questionIndex, current => ({
              ...current,
              options: [
                ...(current.options || []),
                `Option ${(current.options || []).length + 1}`,
              ],
            }))
          }
          onUpdateCorrectAnswer={(questionIndex, value) =>
            updateDraftQuestion(questionIndex, current => ({
              ...current,
              correctAnswer: value,
            }))
          }
          onPublish={handlePublish}
        />
      </FloatingAssignmentModal>

      {toast ? (
        <View style={s.toast}>
          <CheckCircle2 size={18} color="#4ADE80" />
          <Text style={s.toastText}>Assignment Published</Text>
        </View>
      ) : null}
    </View>
  );
}

function TeacherProfileView({
  countryCode,
  email,
  name,
  phone,
  region,
  school,
  schools,
  taughtGrades,
  taughtSubjects,
  subjectOptions,
  curriculumStatus,
  onBack,
  onSignOut,
  onChangeCountry,
  onSavePersonalDetails,
  onToggleGrade,
  onToggleSubject,
}: {
  countryCode: TeacherCountryCode;
  email: string;
  name: string;
  phone: string;
  region: string;
  school: string;
  schools: SchoolData[];
  taughtGrades: string[];
  taughtSubjects: string[];
  subjectOptions: string[];
  curriculumStatus: string;
  onBack: () => void;
  onSignOut?: () => void | Promise<void>;
  onChangeCountry: (value: TeacherCountryCode) => void;
  onSavePersonalDetails: (details: {
    email: string;
    name: string;
    phone: string;
    region: string;
    school: string;
  }) => void;
  onToggleGrade: (value: string) => void;
  onToggleSubject: (value: string) => void;
}) {
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const {
    anchor: countryMenuAnchor,
    anchorRef: countryMenuAnchorRef,
    toggle: toggleCountryMenu,
  } = useFloatingDropdownAnchor(countryMenuOpen, () => setCountryMenuOpen(open => !open));
  const countryConfig = COUNTRY_OPTIONS.find(option => option.code === countryCode) ?? COUNTRY_OPTIONS[0];
  const regionMeta = REGIONS_BY_COUNTRY[countryConfig.code] ?? REGIONS_BY_COUNTRY.KE;
  const prioritizedRegions = useMemo(
    () => prioritizeLocationsBySchoolCount([...regionMeta.options], schools),
    [regionMeta.options, schools],
  );
  return (
    <View style={s.teacherListPortal}>
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Teacher Profile</Text>
        <View style={s.profileCountryWrap}>
          <Pressable
            accessibilityLabel="Select country"
            onPress={toggleCountryMenu}
            ref={countryMenuAnchorRef}
            style={s.profileCountryButton}>
            <Text style={s.profileCountryFlag}>{countryConfig.flag}</Text>
            <ChevronDown size={13} color="#6B7280" />
          </Pressable>
          <FloatingDropdownModal
            anchor={countryMenuAnchor}
            label="Country"
            onClose={toggleCountryMenu}
            visible={countryMenuOpen}>
            <View>
              {COUNTRY_OPTIONS.map(option => (
                <Pressable
                  key={option.code}
                  onPress={() => {
                    onChangeCountry(option.code);
                    setCountryMenuOpen(false);
                  }}
                  style={[
                    s.profileCountryItem,
                    countryCode === option.code && s.profileCountryItemActive,
                  ]}>
                  <Text style={s.profileCountryItemFlag}>{option.flag}</Text>
                  <Text
                    style={[
                      s.profileCountryItemText,
                      countryCode === option.code && s.profileCountryItemTextActive,
                    ]}>
                    {option.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </FloatingDropdownModal>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.profileHero}>
          <Pressable
            accessibilityLabel="Edit teacher profile"
            onPress={() => setEditOpen(true)}
            style={s.profileEditButton}>
            <Pencil color="#FF4B10" size={18} strokeWidth={2.6} />
          </Pressable>
          <View style={s.profileHeroTop}>
            <LinearGradient colors={['#FF4B10', '#FF7A16']} style={s.profileAvatar}>
              <UserRound color="#FFFFFF" size={30} strokeWidth={2.7} />
            </LinearGradient>
            <View style={s.rowMain}>
              <Text style={s.profileName}>{name || 'Teacher'}</Text>
              <Text style={s.profileMeta}>{region ? `${region} · ${countryConfig.name}` : countryConfig.name}</Text>
            </View>
          </View>

          <View style={s.profileSummaryGrid}>
            <ProfileSummaryItem label="Email" value={email || 'Not added'} />
            <ProfileSummaryItem label="Phone" value={phone || 'Not added'} />
            <ProfileSummaryItem label={regionMeta.label} value={region || 'Not selected'} />
            <ProfileSummaryItem label="School" value={school || 'Not selected'} />
          </View>
          <TeacherProfileEditModal
            email={email}
            name={name}
            phone={phone}
            region={region}
            regionLabel={regionMeta.label}
            regions={prioritizedRegions}
            school={school}
            schools={schools}
            visible={editOpen}
            onClose={() => setEditOpen(false)}
            onSave={details => {
              onSavePersonalDetails(details);
              setEditOpen(false);
            }}
          />
        </View>

        <ProfileToggleGroup
          options={[...SUPPORTED_GRADES]}
          selected={taughtGrades}
          title="Grades taught"
          onToggle={onToggleGrade}
        />
        <ProfileToggleGroup
          options={subjectOptions}
          selected={taughtSubjects}
          title="Subjects taught"
          onToggle={onToggleSubject}
        />
        <Text style={s.profileMeta}>{curriculumStatus}</Text>
        {onSignOut ? (
          <Pressable
            accessibilityLabel="Sign out of teacher account"
            onPress={() => {
              onSignOut();
            }}
            style={s.profileSignOutButton}>
            <Text style={s.profileSignOutText}>Sign Out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ProfileSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.profileSummaryItem}>
      <Text style={s.profileLabel}>{label}</Text>
      <Text style={s.profileSummaryValue}>{value}</Text>
    </View>
  );
}

function TeacherProfileEditModal({
  email,
  name,
  phone,
  region,
  regionLabel,
  regions,
  school,
  schools,
  visible,
  onClose,
  onSave,
}: {
  email: string;
  name: string;
  phone: string;
  region: string;
  regionLabel: string;
  regions: string[];
  school: string;
  schools: SchoolData[];
  visible: boolean;
  onClose: () => void;
  onSave: (details: {
    email: string;
    name: string;
    phone: string;
    region: string;
    school: string;
  }) => void;
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [draftRegion, setDraftRegion] = useState(region);
  const [draftSchool, setDraftSchool] = useState(school);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [schoolMenuOpen, setSchoolMenuOpen] = useState(false);
  const prioritizedSchools = useMemo(
    () =>
      prioritizeSchoolsByEnrollment(
        schools.filter(item => !draftRegion || locationsMatch(draftRegion, item.location)),
      ),
    [draftRegion, schools],
  );

  useEffect(() => {
    if (!visible) return;
    setDraftName(name);
    setDraftEmail(email);
    setDraftPhone(phone);
    setDraftRegion(region);
    setDraftSchool(school);
    setRegionMenuOpen(false);
    setSchoolMenuOpen(false);
  }, [email, name, phone, region, school, visible]);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={s.profileEditOverlay}>
        <Pressable accessibilityLabel="Close edit profile" onPress={onClose} style={s.profileEditBackdrop} />
        <View style={s.profileEditCard}>
          <View style={s.profileEditHeader}>
            <View>
              <Text style={s.profileEditTitle}>Edit profile</Text>
              <Text style={s.profileEditSubtitle}>Personal details</Text>
            </View>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={s.profileEditClose}>
              <X color="#6B7280" size={18} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={s.profileEditContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            <View style={s.profileField}>
              <Text style={s.profileLabel}>Full name</Text>
              <TextInput
                onChangeText={setDraftName}
                placeholder="Teacher name"
                style={s.profileInput}
                value={draftName}
              />
            </View>
            <View style={s.profileField}>
              <Text style={s.profileLabel}>Email address</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setDraftEmail}
                placeholder="teacher@example.com"
                style={s.profileInput}
                value={draftEmail}
              />
            </View>
            <View style={s.profileField}>
              <Text style={s.profileLabel}>Phone number</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={setDraftPhone}
                placeholder="+254 700 000 000"
                style={s.profileInput}
                value={draftPhone}
              />
            </View>
            <View style={[s.profileField, s.profileDropdownField]}>
              <Text style={s.profileLabel}>{regionLabel}</Text>
              <Pressable
                onPress={() => {
                  setRegionMenuOpen(open => !open);
                  setSchoolMenuOpen(false);
                }}
                style={[s.profileInput, s.profileRegionSelect]}>
                <Text style={s.profileRegionText}>{draftRegion || 'Select location'}</Text>
                <ChevronDown size={15} color="#6B7280" />
              </Pressable>
              {regionMenuOpen ? (
                <View style={s.profileRegionMenu}>
                  <ScrollView nestedScrollEnabled style={s.profileRegionMenuScroll}>
                    {regions.map(option => (
                      <Pressable
                        key={option}
                        onPress={() => {
                          setDraftRegion(option);
                          setDraftSchool('');
                          setRegionMenuOpen(false);
                        }}
                        style={[
                          s.profileRegionItem,
                          draftRegion === option && s.profileRegionItemActive,
                        ]}>
                        <Text
                          style={[
                            s.profileRegionItemText,
                            draftRegion === option && s.profileRegionItemTextActive,
                          ]}>
                          {option}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
            <View style={[s.profileField, s.profileDropdownField]}>
              <Text style={s.profileLabel}>School</Text>
              <Pressable
                onPress={() => {
                  setSchoolMenuOpen(open => !open);
                  setRegionMenuOpen(false);
                }}
                style={[s.profileInput, s.profileRegionSelect]}>
                <Text style={s.profileRegionText}>{draftSchool || 'Select school'}</Text>
                <ChevronDown size={15} color="#6B7280" />
              </Pressable>
              {schoolMenuOpen ? (
                <View style={s.profileRegionMenu}>
                  <ScrollView nestedScrollEnabled style={s.profileRegionMenuScroll}>
                    {prioritizedSchools.length > 0 ? (
                      prioritizedSchools.map(option => (
                        <Pressable
                          key={option.id}
                          onPress={() => {
                            setDraftSchool(option.name);
                            setSchoolMenuOpen(false);
                          }}
                          style={[
                            s.profileRegionItem,
                            draftSchool === option.name && s.profileRegionItemActive,
                          ]}>
                          <Text
                            style={[
                              s.profileRegionItemText,
                              draftSchool === option.name && s.profileRegionItemTextActive,
                            ]}>
                            {option.name}
                          </Text>
                          <Text style={s.profileSchoolMeta}>{option.location}</Text>
                        </Pressable>
                      ))
                    ) : (
                      <View style={s.profileRegionItem}>
                        <Text style={s.profileRegionItemText}>No schools for this location</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={s.profileEditFooter}>
            <Pressable onPress={onClose} style={s.profileEditCancel}>
              <Text style={s.profileEditCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                onSave({
                  email: draftEmail.trim(),
                  name: draftName.trim(),
                  phone: draftPhone.trim(),
                  region: draftRegion,
                  school: draftSchool,
                })
              }
              style={s.profileEditSave}>
              <Text style={s.profileEditSaveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileToggleGroup({
  options,
  selected,
  title,
  onToggle,
}: {
  options: string[];
  selected: string[];
  title: string;
  onToggle: (value: string) => void;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>{title}</Text>
        <Text style={s.cardHeaderMeta}>{selected.length} selected</Text>
      </View>
      <View style={s.profileChipGrid}>
        {options.map(option => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              style={[s.profileToggle, active && s.profileToggleActive]}>
              <Text style={[s.profileToggleText, active && s.profileToggleTextActive]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TeacherLessonPlanView({
  grade,
  grades,
  subjectsByGrade,
  curriculumLabel,
  bottomNav,
  topNav,
}: {
  grade: string;
  grades: readonly string[];
  subjectsByGrade: Record<string, string[]>;
  curriculumLabel: string;
  bottomNav?: React.ReactNode;
  topNav?: React.ReactNode;
}) {
  const gradeOptions = grades.length > 0 ? grades : [grade];
  const initialGrade = gradeOptions.includes(grade) ? grade : gradeOptions[0];
  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const subjectOptions = useMemo(
    () => subjectsByGrade[selectedGrade] ?? [],
    [selectedGrade, subjectsByGrade],
  );
  const [selectedSubject, setSelectedSubject] = useState(
    subjectsByGrade[initialGrade]?.[0] ?? '',
  );
  const [duration, setDuration] = useState('35 minutes');
  const [style, setStyle] = useState('Revision');
  const [template, setTemplate] = useState('Revision');
  const [topic, setTopic] = useState('Linear equations and real-life problems');
  const [outcome, setOutcome] = useState(
    'Learners solve simple linear equations and explain each step using a real-life example.',
  );
  const [openSelect, setOpenSelect] = useState<'grade' | 'subject' | 'duration' | 'style' | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<'idle' | 'shared' | 'saved'>('idle');
  const [aiIdeas, setAiIdeas] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const generationRequestRef = useRef(0);
  const lessonMinutes = Number.parseInt(duration, 10) || 35;
  const flow = buildLessonFlow(lessonMinutes, style);

  useEffect(() => {
    if (!subjectOptions.includes(selectedSubject)) {
      setSelectedSubject(subjectOptions[0] ?? '');
    }
  }, [selectedSubject, subjectOptions]);

  function clearPlan() {
    generationRequestRef.current += 1;
    setSelectedGrade(gradeOptions[0] || grade);
    setSelectedSubject(subjectOptions[0] || '');
    setDuration('35 minutes');
    setStyle('Revision');
    setTemplate('Revision');
    setTopic('');
    setOutcome('');
    setReady(false);
    setShowPreview(false);
    setStatus('idle');
    setAiIdeas('');
    setIsGeneratingPlan(false);
    setOpenSelect(null);
  }

  function markSetupEdited() {
    generationRequestRef.current += 1;
    setReady(false);
    setShowPreview(false);
    setStatus('idle');
    setIsGeneratingPlan(false);
  }

  async function generatePlan() {
    if (!selectedSubject) {
      Alert.alert(
        'Curriculum not available',
        `${curriculumLabel} subjects have not been published for ${selectedGrade}.`,
      );
      return false;
    }
    const nextTopic = topic.trim() || 'Linear equations and real-life problems';
    const nextOutcome =
      outcome.trim() ||
      'Learners solve simple linear equations and explain each step using a real-life example.';
    setTopic(nextTopic);
    setOutcome(nextOutcome);
    setStatus('idle');
    setReady(true);
    setShowPreview(true);
    setAiIdeas('');
    setOpenSelect(null);
    setIsGeneratingPlan(true);
    const requestId = generationRequestRef.current + 1;
    generationRequestRef.current = requestId;
    try {
      const ideas = await generateLessonPlanIdeas({
        gradeLevel: selectedGrade,
        subject: selectedSubject,
        topic: nextTopic,
        outcome: nextOutcome,
        durationMinutes: lessonMinutes,
        style,
      });
      if (generationRequestRef.current === requestId) {
        setAiIdeas(ideas);
      }
      return true;
    } catch (error) {
      console.error('Error generating lesson plan ideas:', error);
      if (generationRequestRef.current === requestId) {
        setAiIdeas(
          'AI presentation ideas could not be generated right now. Use the structured lesson preview below and try Ask AI again when the connection is stable.',
        );
      }
      return true;
    } finally {
      if (generationRequestRef.current === requestId) {
        setIsGeneratingPlan(false);
      }
    }
  }

  async function savePlan() {
    if (!ready) {
      const generated = await generatePlan();
      if (!generated) {
        return;
      }
    }
    setIsSavingPlan(true);
    try {
      await saveTeacherLessonPlan({
        gradeLevel: selectedGrade,
        subject: selectedSubject,
        topic: topic.trim() || 'Untitled lesson',
        outcome: outcome.trim() || 'Learning outcome not specified.',
        durationMinutes: lessonMinutes,
        style,
        plan: {
          flow,
          materials:
            'Board, chalk or marker, learner notebooks, 5 practice questions and one word problem.',
          aiIdeas,
        },
      });
      setStatus('saved');
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      Alert.alert('Save failed', 'Could not save this lesson plan. Please try again.');
    } finally {
      setIsSavingPlan(false);
    }
  }

  return (
    <View style={s.teacherListPortal}>
      {topNav}
      <ScrollView contentContainerStyle={s.lessonPlanContent}>
        <LinearGradient
          colors={['#FF8A3D', '#FF5710']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.lessonHero}>
          <View pointerEvents="none" style={s.lessonHeroBubble} />
          <View style={s.lessonHeroTop}>
            <Text style={s.lessonHeroKicker}>{selectedGrade.toUpperCase()} TODAY</Text>
            <View style={s.lessonReadyPill}>
              <Text style={s.lessonReadyText}>{curriculumLabel} Ready</Text>
            </View>
          </View>
          <Text style={s.lessonHeroTitle}>Create a clean lesson plan in minutes</Text>
          <View style={s.lessonStatRow}>
            <LessonStat value={lessonMinutes} label="Minutes" />
            <LessonStat value={flow.length} label="Sections" />
            <LessonStat value={ready ? 1 : 0} label="Export" />
          </View>
        </LinearGradient>

        {!showPreview ? (
          <View style={s.lessonPanel}>
            <View style={s.lessonPanelHeader}>
              <Text style={s.lessonPanelTitle}>Quick Setup</Text>
              <View style={s.lessonStepPill}>
                <Text style={s.lessonStepText}>Step 1 of 2</Text>
              </View>
            </View>
            <View style={s.lessonFormGrid}>
              <LessonSelect
                label="Grade"
                open={openSelect === 'grade'}
                options={gradeOptions}
                value={selectedGrade}
                zIndex={24}
                onSelect={value => {
                  setSelectedGrade(value);
                  markSetupEdited();
                  setOpenSelect(null);
                }}
                onToggle={() => setOpenSelect(openSelect === 'grade' ? null : 'grade')}
              />
              <LessonSelect
                label="Subject"
                open={openSelect === 'subject'}
                options={subjectOptions}
                value={selectedSubject}
                zIndex={23}
                onSelect={value => {
                  setSelectedSubject(value);
                  markSetupEdited();
                  setOpenSelect(null);
                }}
                onToggle={() => setOpenSelect(openSelect === 'subject' ? null : 'subject')}
              />
              <LessonSelect
                label="Duration"
                open={openSelect === 'duration'}
                options={['25 minutes', '35 minutes', '45 minutes', '60 minutes']}
                value={duration}
                zIndex={22}
                onSelect={value => {
                  setDuration(value);
                  markSetupEdited();
                  setOpenSelect(null);
                }}
                onToggle={() => setOpenSelect(openSelect === 'duration' ? null : 'duration')}
              />
              <LessonSelect
                label="Style"
                open={openSelect === 'style'}
                options={['Revision', 'Activity', 'Remedial', 'Homework']}
                value={style}
                zIndex={21}
                onSelect={value => {
                  setStyle(value);
                  setTemplate(value);
                  markSetupEdited();
                  setOpenSelect(null);
                }}
                onToggle={() => setOpenSelect(openSelect === 'style' ? null : 'style')}
              />
            </View>
            <View style={s.lessonInputBlock}>
              <Text style={s.lessonFieldLabel}>Topic</Text>
              <TextInput
                onChangeText={value => {
                  setTopic(value);
                  markSetupEdited();
                }}
                placeholder="What are learners covering?"
                placeholderTextColor="#8A94A6"
                style={s.lessonTextInput}
                value={topic}
              />
            </View>
            <View style={s.lessonInputBlock}>
              <Text style={s.lessonFieldLabel}>Learning Outcome</Text>
              <TextInput
                multiline
                onChangeText={value => {
                  setOutcome(value);
                  markSetupEdited();
                }}
                placeholder="What should learners demonstrate by the end?"
                placeholderTextColor="#8A94A6"
                style={[s.lessonTextInput, s.lessonOutcomeInput]}
                value={outcome}
              />
            </View>
            <Text style={[s.lessonFieldLabel, s.lessonTemplateLabel]}>Templates</Text>
            <View style={s.lessonTemplateRow}>
              {['Revision', 'Activity', 'Remedial', 'Homework'].map(item => {
                const active = template === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setTemplate(item);
                      setStyle(item);
                      markSetupEdited();
                    }}
                    style={[s.lessonTemplateChip, active && s.lessonTemplateChipActive]}>
                    <Text style={[s.lessonTemplateText, active && s.lessonTemplateTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.lessonActionRow}>
              <Pressable onPress={clearPlan} style={s.lessonClearButton}>
                <Text style={s.lessonClearText}>Clear</Text>
              </Pressable>
              <Pressable
                disabled={isGeneratingPlan}
                onPress={generatePlan}
                style={[s.lessonGenerateButton, isGeneratingPlan && s.lessonButtonDisabled]}>
                <Text style={s.lessonGenerateText}>
                  {isGeneratingPlan ? 'Thinking...' : 'Ask AI'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showPreview ? (
          <View style={s.lessonPanel}>
            <View style={s.lessonPanelHeader}>
              <Text style={s.lessonPanelTitle}>Lesson Preview</Text>
              <View style={[s.lessonStepPill, ready ? s.lessonReadyPreviewPill : s.lessonDraftPill]}>
                <Text style={s.lessonStepText}>{ready ? 'Ready' : 'Draft'}</Text>
              </View>
            </View>
            <View style={s.lessonPreviewCard}>
              <Text style={s.lessonPreviewTitle}>
                {selectedSubject}. {topic.trim() || 'Untitled lesson'}
              </Text>
              <Text style={s.lessonPreviewBody}>
                {outcome.trim() || 'Add an outcome, then generate a lesson plan preview.'}
              </Text>
            </View>
            <View style={s.lessonPreviewCard}>
              <Text style={s.lessonPreviewTitle}>Materials</Text>
              <Text style={s.lessonPreviewBody}>
                Board, chalk or marker, learner notebooks, 5 practice questions and one word
                problem.
              </Text>
            </View>
            <View style={s.lessonFlowCard}>
              <Text style={s.lessonPreviewTitle}>Lesson Flow</Text>
              {flow.map(item => (
                <View key={item.title} style={s.lessonFlowRow}>
                  <View style={s.lessonTimePill}>
                    <Text style={s.lessonTimeText}>{item.minutes}m</Text>
                  </View>
                  <View style={s.rowMain}>
                    <Text style={s.lessonFlowTitle}>{item.title}</Text>
                    <Text style={s.lessonFlowBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>
            {aiIdeas || isGeneratingPlan ? (
              <View style={s.lessonPreviewCard}>
                <Text style={s.lessonPreviewTitle}>AI Presentation Ideas</Text>
                <Text style={s.lessonPreviewBody}>
                  {aiIdeas || 'Preparing AI presentation ideas...'}
                </Text>
                {aiIdeas && !isGeneratingPlan ? (
                  <ReportAiContentSheet
                    accessibilityLabel="Report AI lesson ideas"
                    buttonLabel="Report AI ideas"
                    contentText={aiIdeas}
                    context={{
                      gradeLevel: selectedGrade,
                      subject: selectedSubject,
                      topic: topic.trim() || null,
                      outcome: outcome.trim() || null,
                      durationMinutes: lessonMinutes,
                      style,
                    }}
                    source="teacher_lesson_plan_ideas"
                  />
                ) : null}
              </View>
            ) : null}
            <View style={s.lessonActionRow}>
              <Pressable onPress={() => setShowPreview(false)} style={s.lessonEditButton}>
                <Text style={s.lessonEditText}>Edit Setup</Text>
              </Pressable>
              <Pressable
                onPress={() => setStatus('shared')}
                style={[s.lessonShareButton, status === 'shared' && s.lessonShareButtonActive]}>
                <Text style={s.lessonShareText}>{status === 'shared' ? 'Shared' : 'Share'}</Text>
              </Pressable>
              <Pressable
                disabled={isSavingPlan || isGeneratingPlan}
                onPress={savePlan}
                style={[
                  s.lessonSaveButton,
                  status === 'saved' && s.lessonSaveButtonActive,
                  (isSavingPlan || isGeneratingPlan) && s.lessonButtonDisabled,
                ]}>
                <Text style={s.lessonSaveText}>
                  {isGeneratingPlan
                    ? 'Preparing...'
                    : isSavingPlan
                      ? 'Saving...'
                      : status === 'saved'
                        ? 'Saved'
                        : 'Save Plan'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
      {bottomNav}
    </View>
  );
}

function LessonStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.lessonStatCard}>
      <Text style={s.lessonStatValue}>{value}</Text>
      <Text style={s.lessonStatLabel}>{label}</Text>
    </View>
  );
}

type DropdownAnchor = { height: number; width: number; x: number; y: number };

function useFloatingDropdownAnchor(open: boolean, onToggle: () => void) {
  const anchorRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<DropdownAnchor>({
    height: 44,
    width: Math.min(320, SCREEN.width - 24),
    x: 12,
    y: 80,
  });

  const toggle = useCallback(() => {
    if (open) {
      onToggle();
      return;
    }

    const anchorNode = anchorRef.current;
    if (!anchorNode?.measureInWindow) {
      onToggle();
      return;
    }

    let didMeasure = false;
    const fallbackTimer = setTimeout(() => {
      if (!didMeasure) {
        onToggle();
      }
    }, 50);

    anchorNode.measureInWindow((x, y, width, height) => {
      didMeasure = true;
      clearTimeout(fallbackTimer);
      setAnchor({ height, width, x, y });
      onToggle();
    });
  }, [onToggle, open]);

  return { anchor, anchorRef, toggle };
}

function FloatingDropdownModal({
  anchor,
  children,
  label,
  onClose,
  visible,
}: {
  anchor: DropdownAnchor;
  children: React.ReactNode;
  label: string;
  onClose: () => void;
  visible: boolean;
}) {
  const title = label.toLowerCase().startsWith('select ') ? label : `Select ${label}`;
  const windowSize = Dimensions.get('window');
  const gutter = 12;
  const menuWidth = Math.min(Math.max(anchor.width, 240), windowSize.width - gutter * 2);
  const left = Math.max(
    gutter,
    Math.min(anchor.x, windowSize.width - menuWidth - gutter),
  );
  const belowTop = anchor.y + anchor.height + 6;
  const spaceBelow = windowSize.height - belowTop - gutter;
  const openAbove = spaceBelow < 220 && anchor.y > spaceBelow;
  const availableHeight = openAbove ? anchor.y - gutter * 2 : spaceBelow;
  const placementStyle = openAbove
    ? {
        bottom: windowSize.height - anchor.y + 6,
        left,
        maxHeight: Math.min(320, Math.max(150, availableHeight)),
        width: menuWidth,
      }
    : {
        left,
        maxHeight: Math.min(320, Math.max(150, availableHeight)),
        top: belowTop,
        width: menuWidth,
      };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}>
      <View style={s.dropdownModalBackdrop}>
        <Pressable
          accessibilityLabel={`Close ${label} dropdown`}
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[s.dropdownModalCard, placementStyle]}>
          <View style={s.dropdownModalHeader}>
            <Text style={s.dropdownModalTitle}>{title}</Text>
            <Pressable
              accessibilityLabel={`Close ${label} dropdown`}
              onPress={onClose}
              style={s.dropdownModalClose}>
              <X color="#5F6C83" size={19} strokeWidth={2.5} />
            </Pressable>
          </View>
          <ScrollView style={s.dropdownModalOptions}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function LessonSelect({
  label,
  open,
  options,
  value,
  zIndex,
  onSelect,
  onToggle,
}: {
  label: string;
  open: boolean;
  options: readonly string[];
  value: string;
  zIndex: number;
  onSelect: (value: string) => void;
  onToggle: () => void;
}) {
  const { anchor, anchorRef, toggle } = useFloatingDropdownAnchor(open, onToggle);

  return (
    <View style={[s.lessonSelectWrap, { zIndex }]}>
      <Text style={s.lessonFieldLabel}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label} dropdown`}
        onPress={toggle}
        ref={anchorRef}
        style={s.lessonSelectButton}>
        <Text numberOfLines={1} style={s.lessonSelectText}>
          {value}
        </Text>
        <ChevronDown color="#111827" size={16} strokeWidth={2.7} />
      </Pressable>
      <FloatingDropdownModal anchor={anchor} label={label} onClose={toggle} visible={open}>
        <View>
          {options.map(option => (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={[s.lessonSelectOption, option === value && s.lessonSelectOptionActive]}>
              <Text
                style={[
                  s.lessonSelectOptionText,
                  option === value && s.lessonSelectOptionTextActive,
                ]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </FloatingDropdownModal>
    </View>
  );
}

function buildLessonFlow(minutes: number, style: string) {
  if (style === 'Activity') {
    return [
      { minutes: Math.max(5, Math.round(minutes * 0.16)), title: 'Warm up', body: 'Pair learners and review yesterday\'s concept with one quick challenge.' },
      { minutes: Math.max(10, Math.round(minutes * 0.34)), title: 'Group activity', body: 'Teams solve a real-life problem and explain their method on paper.' },
      { minutes: Math.max(10, Math.round(minutes * 0.34)), title: 'Share back', body: 'Groups compare answers, note differences and correct common errors.' },
      { minutes: Math.max(5, Math.round(minutes * 0.16)), title: 'Exit ticket', body: 'Each learner completes one independent question before leaving.' },
    ];
  }

  if (style === 'Remedial') {
    return [
      { minutes: Math.max(5, Math.round(minutes * 0.16)), title: 'Diagnose', body: 'Ask two short questions to locate the exact misconception.' },
      { minutes: Math.max(12, Math.round(minutes * 0.36)), title: 'Teacher model', body: 'Model the correct method slowly and name each step out loud.' },
      { minutes: Math.max(10, Math.round(minutes * 0.32)), title: 'Guided retry', body: 'Learners solve similar questions with teacher prompts and peer support.' },
      { minutes: Math.max(5, Math.round(minutes * 0.16)), title: 'Confidence check', body: 'Learners rate their confidence and submit one corrected example.' },
    ];
  }

  return [
    { minutes: Math.max(5, Math.round(minutes * 0.14)), title: 'Warm up', body: 'Ask learners to solve one simple equation individually.' },
    { minutes: Math.max(10, Math.round(minutes * 0.34)), title: 'Teacher guide', body: 'Model two examples and show how to balance both sides.' },
    { minutes: Math.max(10, Math.round(minutes * 0.37)), title: 'Practice', body: 'Pairs solve three questions, then compare answers.' },
    { minutes: Math.max(5, Math.round(minutes * 0.15)), title: 'Exit ticket', body: 'Each learner solves one new equation before leaving.' },
  ];
}

function TeacherMessagesView({
  grade,
  grades,
  bottomNav,
  topNav,
}: {
  grade: string;
  grades: string[];
  bottomNav?: React.ReactNode;
  topNav?: React.ReactNode;
}) {
  const [selectedGrade, setSelectedGrade] = useState(grade);
  const gradeOptions = grades.length > 0 ? grades : [grade];
  const [parents, setParents] = useState<TeacherParentContact[]>([]);
  const [messages, setMessages] = useState<TeacherParentMessage[]>([]);
  const [audienceMode, setAudienceMode] = useState<MessageAudienceMode>('grade');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [parentMenuOpen, setParentMenuOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportedMessageIds, setReportedMessageIds] = useState<Record<string, boolean>>({});
  const selectedParent = parents.find(parent => parent.id === selectedParentId);
  const canSend = draft.trim().length > 0 && (audienceMode === 'grade' || Boolean(selectedParent));
  const gradeDropdownOptions = gradeOptions.map(item => ({ value: item, label: item }));
  const parentDropdownOptions = parents.map(parent => ({
    value: parent.id,
    label: parent.name,
    meta: `${parent.child_count} ${parent.child_count === 1 ? 'child' : 'children'} linked`,
  }));
  const parentAccountLabel = `${parents.length} parent account${parents.length === 1 ? '' : 's'}`;

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextParents = await getTeacherParents(selectedGrade);
      const validParent = nextParents.find(parent => parent.id === selectedParentId);
      const nextParentId = audienceMode === 'parent' && validParent ? validParent.id : '';
      if (nextParentId !== selectedParentId) {
        setSelectedParentId(nextParentId);
      }
      if (audienceMode === 'parent' && !nextParentId) {
        setParents(nextParents);
        setMessages([]);
        return;
      }
      const nextMessages = await getTeacherParentMessages({
        gradeLevel: selectedGrade,
        parentUserId: audienceMode === 'parent' && nextParentId ? nextParentId : undefined,
      });
      setParents(nextParents);
      setMessages(nextMessages);
    } catch (error) {
      console.error('Error loading teacher messages:', error);
      Alert.alert('Messages unavailable', 'Could not load parent messages right now.');
    } finally {
      setIsLoading(false);
    }
  }, [audienceMode, selectedGrade, selectedParentId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  function selectGrade(value: string) {
    setSelectedGrade(value);
    setAudienceMode('grade');
    setSelectedParentId('');
    setGradeMenuOpen(false);
    setParentMenuOpen(false);
  }

  function selectAllParents() {
    setAudienceMode('grade');
    setSelectedParentId('');
    setParentMenuOpen(false);
  }

  function selectOneParent() {
    setAudienceMode('parent');
    setGradeMenuOpen(false);
  }

  function selectParent(parentId: string) {
    setAudienceMode('parent');
    setSelectedParentId(parentId);
    setParentMenuOpen(false);
  }

  function applyMessageTemplate() {
    setDraft(`Hello ${selectedGrade} parents, this is a reminder that `);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || (audienceMode === 'parent' && !selectedParent)) {
      return;
    }
    setIsSendingMessage(true);
    try {
      await sendTeacherParentMessage({
        gradeLevel: selectedGrade,
        parentUserId: audienceMode === 'parent' ? selectedParentId : null,
        body,
      });
      setDraft('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending teacher message:', error);
      Alert.alert('Message failed', 'Could not send this message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function reportMessage(message: TeacherParentMessage) {
    if (reportingMessageId || reportedMessageIds[message.id]) {
      return;
    }

    setReportingMessageId(message.id);
    try {
      await reportTeacherParentMessage(message.id);
      setReportedMessageIds(current => ({ ...current, [message.id]: true }));
    } catch (error) {
      console.error('Error reporting teacher-parent message:', error);
      Alert.alert('Report failed', 'Could not report this message. Please try again.');
    } finally {
      setReportingMessageId(null);
    }
  }

  return (
    <View style={[s.teacherListPortal, s.messagesPage]}>
      {topNav}

      <ScrollView
        contentContainerStyle={s.teacherMessagesContent}
        keyboardShouldPersistTaps="handled">
        <View style={s.messageSectionCard}>
          <Text style={s.messageSectionTitle}>1. Select grade</Text>
          <MessageDropdown
            hideLabel
            label="Grade"
            leadingIcon={<GraduationCap color="#FF5A1F" size={24} strokeWidth={2.2} />}
            open={gradeMenuOpen}
            options={gradeDropdownOptions}
            value={selectedGrade}
            onSelect={selectGrade}
            onToggle={() => {
              setGradeMenuOpen(open => !open);
              setParentMenuOpen(false);
            }}
          />

          <View style={s.messageRecipientSummary}>
            <Info color="#FF5A1F" size={19} strokeWidth={2.3} />
            <Text style={s.messageRecipientSummaryText}>
              {audienceMode === 'parent'
                ? selectedParent
                  ? `This message will go only to ${selectedParent.name}.`
                  : 'Choose a parent below to send an individual note.'
                : `This message will go to all parent accounts linked to ${selectedGrade}.`}
            </Text>
          </View>
        </View>

        <View style={s.messageSectionCard}>
          <Text style={s.messageSectionTitle}>2. Who do you want to message?</Text>
          <View style={s.messageAudienceCards}>
            <Pressable
              accessibilityLabel={`Send to all parents in ${selectedGrade}`}
              onPress={selectAllParents}
              style={[
                s.messageAudienceCard,
                audienceMode === 'grade' && s.messageAudienceCardActive,
              ]}>
              <Users
                color={audienceMode === 'grade' ? '#FF5A1F' : '#5F6C83'}
                size={25}
                strokeWidth={2.2}
              />
              <View style={s.messageAudienceCardCopy}>
                <Text style={s.messageAudienceCardTitle}>All {selectedGrade} parents</Text>
                <Text style={s.messageAudienceCardMeta}>
                  {isLoading ? 'Loading recipients...' : `Send to ${parentAccountLabel}`}
                </Text>
              </View>
              <View
                style={[
                  s.messageRadio,
                  audienceMode === 'grade' && s.messageRadioActive,
                ]}>
                {audienceMode === 'grade' ? <View style={s.messageRadioDot} /> : null}
              </View>
            </Pressable>

            <Pressable
              accessibilityLabel="Send to one parent"
              onPress={selectOneParent}
              style={[
                s.messageAudienceCard,
                audienceMode === 'parent' && s.messageAudienceCardActive,
              ]}>
              <MessageCircle
                color={audienceMode === 'parent' ? '#FF5A1F' : '#5F6C83'}
                size={25}
                strokeWidth={2.2}
              />
              <View style={s.messageAudienceCardCopy}>
                <Text style={s.messageAudienceCardTitle}>One parent</Text>
                <Text style={s.messageAudienceCardMeta}>Choose a specific parent</Text>
              </View>
              <View
                style={[
                  s.messageRadio,
                  audienceMode === 'parent' && s.messageRadioActive,
                ]}>
                {audienceMode === 'parent' ? <View style={s.messageRadioDot} /> : null}
              </View>
            </Pressable>
          </View>

          {audienceMode === 'parent' ? (
            <MessageDropdown
              active
              emptyText={parents.length > 0 ? 'Choose a parent' : 'No parents found for this grade'}
              label="Select parent"
              open={parentMenuOpen}
              options={parentDropdownOptions}
              value={selectedParentId}
              onSelect={selectParent}
              onToggle={() => {
                if (parents.length > 0) {
                  setParentMenuOpen(open => !open);
                  setGradeMenuOpen(false);
                }
              }}
            />
          ) : null}
        </View>

        <View style={s.messageSectionCard}>
          <View style={s.messageComposerHeading}>
            <Text style={s.messageSectionTitle}>3. Write your message</Text>
            <Pressable
              accessibilityLabel="Use message template"
              onPress={applyMessageTemplate}
              style={s.messageTemplateButton}>
              <FileText color="#209653" size={16} strokeWidth={2.4} />
              <Text style={s.messageTemplateText}>Use template</Text>
            </Pressable>
          </View>

          <View style={s.messageInputShell}>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={setDraft}
              placeholder="Write a class update, reminder, or individual note..."
              placeholderTextColor="#7B879C"
              style={s.messageInput}
              value={draft}
            />
            <Text style={s.messageCharacterCount}>{draft.length}/1000</Text>
          </View>

          <View style={s.messageComposerFooter}>
            <View style={s.messageAttachmentRow}>
              <View style={s.messageAttachmentChip}>
                <Paperclip color="#738096" size={15} strokeWidth={2.2} />
                <Text style={s.messageAttachmentText}>Attach file</Text>
              </View>
              <View style={s.messageAttachmentChip}>
                <ImageIcon color="#738096" size={15} strokeWidth={2.2} />
                <Text style={s.messageAttachmentText}>Add image</Text>
              </View>
              <View style={s.messageAttachmentChip}>
                <Link2 color="#738096" size={15} strokeWidth={2.2} />
                <Text style={s.messageAttachmentText}>Add link</Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Send message to selected recipients"
              disabled={isSendingMessage || !canSend}
              onPress={sendMessage}
              style={[
                s.messageSendButton,
                (isSendingMessage || !canSend) && s.lessonButtonDisabled,
              ]}>
              <Send color="#FFFFFF" size={20} strokeWidth={2.3} />
              <Text style={s.messageSendText}>
                {isSendingMessage ? 'Sending...' : 'Send Message'}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={s.messageHistoryCard}>
          {isLoading ? (
            <View style={s.messageEmptyState}>
              <Inbox color="#2470C7" size={34} strokeWidth={2.1} />
              <View style={s.messageEmptyCopy}>
                <Text style={s.rowTitle}>Loading messages...</Text>
                <Text style={s.rowMeta}>Checking your parent message history.</Text>
              </View>
            </View>
          ) : messages.length === 0 ? (
            <View style={s.messageEmptyState}>
              <Inbox color="#2470C7" size={34} strokeWidth={2.1} />
              <View style={s.messageEmptyCopy}>
                <Text style={s.rowTitle}>No messages yet</Text>
                <Text style={s.rowMeta}>Messages you send will appear here for your records.</Text>
              </View>
            </View>
          ) : (
            messages.map(message => {
              const fromTeacher = message.sender_user_id === message.teacher_user_id;
              return (
                <View
                  key={message.id}
                  style={[
                    s.messageBubble,
                    fromTeacher ? s.messageBubbleTeacher : s.messageBubbleParent,
                  ]}>
                  <Text style={s.messageBubbleSender}>{message.sender_name}</Text>
                  <Text style={s.messageBubbleBody}>{message.body}</Text>
                  <View style={s.messageBubbleMetaRow}>
                    <Text style={s.messageBubbleTime}>
                      {new Date(message.created_at).toLocaleString('en-KE', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Pressable
                      accessibilityLabel={
                        reportedMessageIds[message.id] ? 'Message reported' : 'Report message'
                      }
                      disabled={reportingMessageId === message.id || reportedMessageIds[message.id]}
                      onPress={() => reportMessage(message)}
                      style={[
                        s.messageReportButton,
                        reportedMessageIds[message.id] && s.messageReportButtonSubmitted,
                      ]}>
                      <Flag
                        color={reportedMessageIds[message.id] ? '#16A34A' : '#64748B'}
                        size={12}
                        strokeWidth={2.4}
                      />
                      <Text
                        style={[
                          s.messageReportText,
                          reportedMessageIds[message.id] && s.messageReportTextSubmitted,
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
      </ScrollView>
      {bottomNav}
    </View>
  );
}

function MessageDropdown({
  active = false,
  emptyText = 'No options available',
  hideLabel = false,
  label,
  leadingIcon,
  open,
  options,
  value,
  onSelect,
  onToggle,
}: {
  active?: boolean;
  emptyText?: string;
  hideLabel?: boolean;
  label: string;
  leadingIcon?: React.ReactNode;
  open: boolean;
  options: MessageDropdownOption[];
  value: string;
  onSelect: (value: string) => void;
  onToggle: () => void;
}) {
  const selectedOption = options.find(option => option.value === value);
  const disabled = options.length === 0;
  const { anchor, anchorRef, toggle } = useFloatingDropdownAnchor(open, onToggle);

  return (
    <View style={s.messageDropdownWrap}>
      {!hideLabel ? <Text style={s.messageDropdownLabel}>{label}</Text> : null}
      <Pressable
        accessibilityLabel={`${label} dropdown`}
        disabled={disabled}
        onPress={toggle}
        ref={anchorRef}
        style={[
          s.messageDropdownButton,
          active && s.messageDropdownButtonActive,
          disabled && s.lessonButtonDisabled,
        ]}>
        <View style={s.messageDropdownMain}>
          {leadingIcon}
          <View style={s.rowMain}>
            <Text numberOfLines={1} style={s.messageDropdownValue}>
              {selectedOption?.label || emptyText}
            </Text>
            {selectedOption?.meta ? (
              <Text numberOfLines={1} style={s.messageDropdownMeta}>
                {selectedOption.meta}
              </Text>
            ) : null}
          </View>
        </View>
        <ChevronDown color="#5F6C83" size={18} strokeWidth={2.6} />
      </Pressable>
      <FloatingDropdownModal
        anchor={anchor}
        label={label}
        onClose={toggle}
        visible={open && !disabled}>
        <View>
          {options.map(option => {
            const optionActive = option.value === value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onSelect(option.value)}
                style={[s.messageDropdownOption, optionActive && s.messageDropdownOptionActive]}>
                <View style={s.rowMain}>
                  <Text
                    numberOfLines={1}
                    style={[
                      s.messageDropdownOptionText,
                      optionActive && s.messageDropdownOptionTextActive,
                    ]}>
                    {option.label}
                  </Text>
                  {option.meta ? (
                    <Text numberOfLines={1} style={s.messageDropdownOptionMeta}>
                      {option.meta}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </FloatingDropdownModal>
    </View>
  );
}

function getTeacherDisplayName(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed || /test teacher/i.test(trimmed)) {
    return 'Ms. Njeri';
  }
  const pieces = trimmed.split(/\s+/);
  if (pieces.length === 1) {
    return pieces[0];
  }
  return pieces.slice(0, 2).join(' ');
}

function createTeacherPortalStyles(): Record<string, any> {
  const palette = {
    background: '#F7F8F5',
    header: '#FFFFFF',
    text: '#07111F',
    muted: '#667085',
    surface: '#FFFFFF',
    border: '#E5E8EE',
    rowLine: '#EEF1F4',
    orange: '#FF6B1A',
    orangeSoft: '#FFF3EA',
    green: '#138A43',
    greenSoft: '#EBF9F0',
    shadow: '#0B1726',
  };

  return {
    ...s,
    backIconColor: '#111827',
    mutedIconColor: '#667085',
    sortIconColor: '#111827',
    chevronColor: '#7A8494',
    filterIconSize: 16,
    teacherListPortal: [
      s.teacherListPortal,
      {
        backgroundColor: '#FFFFFF',
      },
    ],
    listPortalHeader: [
      s.listPortalHeader,
      {
        backgroundColor: palette.header,
        borderBottomWidth: 0,
        elevation: 0,
        justifyContent: 'space-between',
        minHeight: 62,
        paddingBottom: 8,
        paddingHorizontal: 20,
        paddingTop: 10,
        position: 'relative',
        shadowOpacity: 0,
      },
    ],
    headerLogoBadge: {
      alignItems: 'center',
      height: 42,
      justifyContent: 'center',
      width: 48,
      zIndex: 2,
    },
    headerLogoImage: {
      height: 34,
      width: 34,
    },
    back: [s.back, { minWidth: 74 }],
    backText: [
      s.backText,
      {
        color: '#111827',
        fontSize: 15,
        fontWeight: '800',
      },
    ],
    titleBlock: {
      alignItems: 'center',
      left: 70,
      minWidth: 0,
      paddingHorizontal: 4,
      position: 'absolute',
      right: 70,
      top: 21,
    },
    headerTitle: [
      s.headerTitle,
      {
        color: palette.text,
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 0,
        lineHeight: 27,
      },
    ],
    portalNewButton: {
      alignItems: 'center',
      backgroundColor: palette.orange,
      borderRadius: 18,
      elevation: 5,
      flexDirection: 'row',
      gap: 4,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 84,
      paddingHorizontal: 14,
      shadowColor: palette.orange,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
    },
    portalNewButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '900',
    },
    portalProfileButton: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderColor: palette.orange,
      borderRadius: 20,
      borderWidth: 2,
      elevation: 4,
      height: 42,
      justifyContent: 'center',
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      width: 42,
    },
    portalProfileInitials: {
      color: palette.green,
      fontSize: 14,
      fontWeight: '900',
    },
    portalActionGroup: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minWidth: 42,
      zIndex: 2,
    },
    portalIconButton: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderColor: '#E6EBF0',
      borderRadius: 18,
      borderWidth: 1,
      elevation: 3,
      height: 38,
      justifyContent: 'center',
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      width: 38,
    },
    portalActionIconColor: palette.orange,
    segmented: [
      s.segmented,
      {
        backgroundColor: '#F3F5F7',
        borderColor: '#E4E9E5',
        borderRadius: 20,
        borderWidth: 1,
        elevation: 2,
        marginBottom: 12,
        marginHorizontal: 20,
        marginTop: 0,
        padding: 4,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
    ],
    seg: [s.seg, { borderRadius: 16, minHeight: 44, paddingVertical: 10 }],
    segActive: [
      s.segActive,
      {
        backgroundColor: '#FFFFFF',
        borderBottomColor: palette.orange,
        borderBottomWidth: 4,
        elevation: 3,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
    ],
    segText: [
      s.segText,
      {
        color: palette.muted,
        fontSize: 15,
        fontWeight: '900',
      },
    ],
    segTextActive: [
      s.segTextActive,
      {
        color: palette.green,
      },
    ],
    content: [
      s.content,
      {
        gap: 18,
        paddingBottom: 104,
        paddingHorizontal: 16,
        paddingTop: 0,
      },
    ],
    filterRow: [
      s.filterRow,
      {
        flexWrap: 'nowrap',
        gap: 8,
        justifyContent: 'space-between',
        zIndex: 20,
      },
    ],
    dropdownWrap: [s.dropdownWrap, { flex: 1, minWidth: 0, zIndex: 30 }],
    chip: [
      s.chip,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 17,
        borderWidth: 1,
        elevation: 1,
        flex: 1,
        gap: 5,
        justifyContent: 'center',
        minHeight: 50,
        minWidth: 0,
        paddingHorizontal: 8,
        paddingVertical: 9,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 9,
      },
    ],
    chipText: [
      s.chipText,
      {
        color: palette.text,
        flexShrink: 1,
        fontSize: 12,
        fontWeight: '900',
      },
    ],
    menu: [
      s.menu,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 16,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        top: 50,
      },
    ],
    menuItemActive: [s.menuItemActive, { backgroundColor: palette.orangeSoft }],
    menuText: [s.menuText, { color: palette.muted, fontSize: 13, fontWeight: '800' }],
    menuTextActive: [s.menuTextActive, { color: palette.orange }],
    grid: [s.grid, { gap: 14 }],
    metric: [
      s.metric,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 19,
        elevation: 2,
        justifyContent: 'space-between',
        minHeight: 138,
        overflow: 'hidden',
        paddingHorizontal: 15,
        paddingVertical: 18,
        position: 'relative',
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 9 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
      },
    ],
    metricTopStrip: {
      height: '100%',
      left: 0,
      opacity: 0.58,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    metricTopStripGreen: { backgroundColor: '#F7FCF9' },
    metricTopStripBlue: { backgroundColor: '#EFFAF3' },
    metricDoodle: {
      alignItems: 'center',
      backgroundColor: '#DDF7E8',
      borderRadius: 14,
      height: 48,
      justifyContent: 'center',
      position: 'absolute',
      right: 15,
      top: 17,
      width: 48,
    },
    metricDoodleColor: palette.green,
    metricLabel: [
      s.metricLabel,
      {
        color: palette.muted,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0,
        textTransform: 'none',
      },
    ],
    metricValue: [
      s.metricValue,
      {
        color: palette.green,
        fontSize: 38,
        fontWeight: '900',
        lineHeight: 44,
      },
    ],
    metricHint: [
      s.metricHint,
      {
        color: palette.muted,
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 7,
        marginLeft: 7,
      },
    ],
    metricAccent: [
      s.metricAccent,
      {
        color: palette.green,
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 8,
        marginLeft: 6,
      },
    ],
    metricSubline: [
      s.metricSubline,
      {
        color: palette.muted,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
      },
    ],
    card: [
      s.card,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 20,
        elevation: 2,
        overflow: 'hidden',
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 9 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
      },
    ],
    cardHeader: [
      s.cardHeader,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.rowLine,
        minHeight: 58,
        paddingHorizontal: 16,
        paddingVertical: 15,
      },
    ],
    cardHeaderText: [
      s.cardHeaderText,
      {
        color: palette.text,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0,
        textTransform: 'none',
      },
    ],
    cardHeaderMeta: [
      s.cardHeaderMeta,
      {
        color: palette.orange,
        fontSize: 12,
        fontWeight: '800',
      },
    ],
    supportToggle: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
      paddingLeft: 10,
    },
    row: [
      s.row,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.rowLine,
        minHeight: 91,
        paddingHorizontal: 16,
        paddingVertical: 15,
      },
    ],
    rowLead: [s.rowLead, { gap: 14 }],
    rowTitle: [
      s.rowTitle,
      {
        color: palette.text,
        fontSize: 16,
        fontWeight: '900',
        lineHeight: 21,
      },
    ],
    rowMeta: [
      s.rowMeta,
      {
        color: palette.muted,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
      },
    ],
    rowEnd: [s.rowEnd, { gap: 10 }],
    scoreWrap: [s.scoreWrap, { alignItems: 'center', minWidth: 52 }],
    score: [
      s.score,
      {
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
      },
    ],
    rowTiny: [
      s.rowTiny,
      {
        color: palette.muted,
        fontSize: 11,
        fontWeight: '800',
        lineHeight: 14,
        textTransform: 'uppercase',
      },
    ],
    avatarLargeSize: 54,
    avatarArtFallback: true,
    avatar: [
      s.avatar,
      {
        backgroundColor: '#EEF5F0',
        borderColor: '#E2E8E4',
        borderWidth: 1,
      },
    ],
    avatarText: [s.avatarText, { color: palette.green, fontSize: 14, fontWeight: '900' }],
    goodText: [s.goodText, { color: palette.green }],
    warnText: [s.warnText, { color: '#D97706' }],
    badText: [s.badText, { color: '#D9480F' }],
    assignmentList: [s.assignmentList, { gap: 10 }],
    assignmentCard: [
      s.assignmentCard,
      {
        backgroundColor: palette.surface,
        borderColor: palette.border,
        borderRadius: 18,
        overflow: 'hidden',
        paddingLeft: 20,
        position: 'relative',
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
    ],
    assignmentSpine: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      top: 0,
      width: 5,
    },
    spineBlue: { backgroundColor: '#3B82F6' },
    spineGreen: { backgroundColor: '#22C55E' },
    spineOrange: { backgroundColor: '#FB923C' },
    spinePurple: { backgroundColor: '#15803D' },
    spineTeal: { backgroundColor: '#14B8A6' },
    subjectPurple: { backgroundColor: '#DCFCE7', color: '#15803D' },
    subjectTeal: { backgroundColor: '#CCFBF1', color: '#0F766E' },
    assignmentTitle: [s.assignmentTitle, { color: palette.text }],
    assignmentMeta: [s.assignmentMeta, { color: palette.muted }],
    assignmentMetaOverdue: { color: '#DC2626', fontWeight: '800' },
    date: [s.date, { color: palette.muted }],
    primary: [
      s.primary,
      {
        backgroundColor: palette.orange,
        borderRadius: 18,
      },
    ],
    track: [s.track, { backgroundColor: '#E7ECE9' }],
    fill: [s.fill, { backgroundColor: palette.green }],
    bottomNav: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderColor: '#E7EAEE',
      borderTopWidth: 1,
      bottom: 0,
      elevation: 12,
      flexDirection: 'row',
      height: 82,
      justifyContent: 'space-around',
      left: 0,
      paddingBottom: 8,
      paddingHorizontal: 8,
      paddingTop: 8,
      position: 'absolute',
      right: 0,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.06,
      shadowRadius: 18,
    },
    bottomNavItem: {
      alignItems: 'center',
      flex: 1,
      gap: 4,
      justifyContent: 'center',
      minHeight: 62,
    },
    bottomNavIconColor: '#667085',
    bottomNavActiveColor: palette.orange,
    bottomNavLabel: {
      color: '#667085',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
      textAlign: 'center',
    },
    bottomNavLabelActive: {
      color: palette.orange,
      fontWeight: '900',
    },
    cockpit: {
      position: 'relative',
    },
    homeHero: {
      borderRadius: 22,
      elevation: 6,
      overflow: 'hidden',
      paddingBottom: 30,
      paddingHorizontal: 20,
      paddingTop: 14,
      position: 'relative',
      shadowColor: palette.orange,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.28,
      shadowRadius: 20,
    },
    homeHeroBubbleLarge: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 999,
      height: 150,
      position: 'absolute',
      right: -46,
      top: -58,
      width: 150,
    },
    homeHeroBubbleSmall: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 999,
      bottom: -34,
      height: 90,
      left: -26,
      position: 'absolute',
      width: 90,
    },
    homeHeroDate: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.1,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    homeHeroTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontStyle: 'italic',
      fontWeight: '900',
      letterSpacing: -0.4,
      lineHeight: 27,
    },
    homeHeroSubline: {
      color: 'rgba(255,255,255,0.92)',
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    pulseCard: {
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderColor: '#FFE7D6',
      borderRadius: 20,
      borderWidth: 1,
      elevation: 7,
      flexDirection: 'row',
      gap: 14,
      marginHorizontal: 10,
      marginTop: -20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: '#B33A0D',
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.2,
      shadowRadius: 22,
    },
    attentionStrip: {
      backgroundColor: '#FFFFFF',
      borderColor: palette.border,
      borderRadius: 18,
      borderWidth: 1,
      elevation: 2,
      marginTop: 10,
      paddingHorizontal: 15,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 7 },
      shadowOpacity: 0.06,
      shadowRadius: 14,
    },
    glassRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      minHeight: 48,
      paddingVertical: 9,
    },
    glassRowDivider: {
      borderTopColor: 'rgba(33,29,27,0.09)',
      borderTopWidth: 1,
    },
    glassNum: {
      color: '#211D1B',
      fontSize: 21,
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: -0.8,
      minWidth: 42,
    },
    glassNumRed: {
      color: '#E8112D',
    },
    glassText: {
      color: '#4D4642',
      flex: 1,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      minWidth: 0,
    },
    pulseRing: {
      height: 64,
      position: 'relative',
      width: 64,
    },
    pulseRingCenter: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    pulseRingValue: {
      color: '#211D1B',
      fontSize: 15,
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
    },
    pulseMain: {
      flex: 1,
      minWidth: 0,
    },
    pulseLabel: {
      color: '#A09890',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    pulsePhrase: {
      color: '#211D1B',
      fontSize: 14,
      fontWeight: '800',
      marginTop: 2,
    },
    pulseSide: {
      alignItems: 'flex-end',
    },
    pulseSideValue: {
      color: '#211D1B',
      fontSize: 21,
      fontStyle: 'italic',
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
    },
    pulseSideLabel: {
      color: '#A09890',
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    rowMain: [s.rowMain, { gap: 3 }],
    rowTitleLine: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    rowTitleShrink: {
      flexShrink: 1,
    },
    trendChip: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    trendChipExcellent: { backgroundColor: '#DCFCE7' },
    trendChipImproving: { backgroundColor: '#DBEAFE' },
    trendChipStable: { backgroundColor: '#F1F5F9' },
    trendChipText: {
      fontSize: 10.5,
      fontWeight: '900',
      lineHeight: 14,
    },
    trendChipTextExcellent: { color: '#15803D' },
    trendChipTextImproving: { color: '#1D4ED8' },
    trendChipTextStable: { color: '#64748B' },
    hwLine: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 3,
    },
    hwTrack: {
      backgroundColor: '#EDF1F5',
      borderRadius: 999,
      height: 5,
      overflow: 'hidden',
      width: 74,
    },
    hwFill: {
      backgroundColor: palette.green,
      borderRadius: 999,
      height: '100%',
    },
    hwLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    scorePill: {
      alignItems: 'center',
      borderRadius: 12,
      justifyContent: 'center',
      minWidth: 54,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    scorePillGood: { backgroundColor: '#EAF9F0' },
    scorePillWarn: { backgroundColor: '#FEF6E7' },
    scorePillBad: { backgroundColor: '#FDEDE7' },
    scorePillText: {
      fontSize: 15,
      fontWeight: '900',
      lineHeight: 19,
    },
    avatarCompactSize: 30,
    compactRow: {
      alignItems: 'center',
      borderTopColor: palette.rowLine,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
      minHeight: 46,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    compactMain: {
      flex: 1,
      minWidth: 0,
    },
    compactName: {
      color: palette.text,
      fontSize: 13.5,
      fontWeight: '800',
      lineHeight: 17,
    },
    compactMeta: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 15,
      marginTop: 1,
    },
    compactPill: {
      alignItems: 'center',
      borderRadius: 9,
      justifyContent: 'center',
      minWidth: 44,
      paddingHorizontal: 7,
      paddingVertical: 3,
    },
    compactPillText: {
      fontSize: 12.5,
      fontWeight: '900',
      lineHeight: 16,
    },
    insightsHeader: {
      alignItems: 'center',
      backgroundColor: '#FFF7E8',
      borderColor: '#FDE9C3',
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 13,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    insightsIconBadge: {
      alignItems: 'center',
      backgroundColor: '#FEF3C7',
      borderRadius: 13,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    insightsHeaderMain: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    insightsTitle: {
      color: '#07111F',
      fontSize: 16,
      fontWeight: '900',
    },
    insightsSubline: {
      color: '#8A6A2A',
      fontSize: 12.5,
      fontWeight: '700',
      lineHeight: 17,
    },
  };
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(piece => piece[0]?.toUpperCase() || '')
    .join('');
}

const s = StyleSheet.create({
  root: { alignItems: 'center', flex: 1, backgroundColor: '#FFFFFF' },
  teacherPhoneShell: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    maxWidth: 430,
    paddingTop: TEACHER_TOP_INSET,
    width: '100%',
  },
  teacherDashboardScroll: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  teacherDashboardContent: {
    paddingBottom: 18,
    paddingHorizontal: 17,
  },
  teacherListPortal: {
    backgroundColor: '#F6F7F9',
    flex: 1,
  },
  listPortalHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  teacherTopBar: {
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
  teacherGreetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'space-between',
    marginTop: 9,
    overflow: 'visible',
    position: 'relative',
    zIndex: 80,
  },
  teacherGreeting: {
    color: '#25252B',
    flex: 1,
    fontSize: 14.2,
    fontWeight: '900',
    letterSpacing: 0,
  },
  classSelectorWrap: {
    maxWidth: 188,
    position: 'relative',
    zIndex: 100,
  },
  classSelector: {
    alignItems: 'center',
    backgroundColor: '#FCFCFD',
    borderColor: '#E3E3E8',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 188,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  classSelectorMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(255,255,255,0.86)',
    borderRadius: 18,
    borderWidth: 1.2,
    elevation: 24,
    minWidth: 164,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 34,
    width: 172,
    zIndex: 120,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 28,
  },
  classSelectorMenuGlass: {
    borderRadius: 18,
    paddingVertical: 4,
  },
  classSelectorMenuItem: {
    borderBottomColor: 'rgba(255,75,16,0.08)',
    borderBottomWidth: 1,
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  classSelectorMenuItemActive: {
    backgroundColor: 'rgba(255,242,236,0.92)',
  },
  classSelectorMenuText: {
    color: '#18181B',
    fontSize: 12,
    fontWeight: '900',
  },
  classSelectorMenuTextActive: {
    color: '#FF4B10',
  },
  classSelectorIcon: {
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  classSelectorText: {
    color: '#15151A',
    flexShrink: 1,
    fontSize: 9.6,
    fontWeight: '900',
  },
  teacherSubtitle: {
    color: '#5C5D63',
    fontSize: 15.5,
    fontWeight: '500',
    marginTop: 11,
  },
  teacherHero: {
    borderColor: '#FF4B10',
    borderRadius: 19,
    borderWidth: 1.4,
    height: 139,
    marginTop: 9,
    overflow: 'hidden',
    position: 'relative',
  },
  teacherHeroCopy: {
    paddingLeft: 20,
    paddingTop: 13,
    width: '66%',
    position: 'relative',
    zIndex: 2,
  },
  teacherHeroTitle: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '900',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  teacherHeroScoreRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginTop: 3,
  },
  teacherHeroScore: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 58,
    textShadowColor: 'rgba(0,0,0,0.14)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  teacherHeroPercent: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 40,
    marginLeft: 3,
    marginTop: 7,
  },
  teacherHeroStatus: {
    color: '#FFFFFF',
    fontSize: 14.3,
    fontWeight: '900',
    lineHeight: 17,
    marginTop: -3,
  },
  improvementPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  improvementIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.23)',
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 14,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  improvementArrow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  improvementText: {
    color: '#FFFFFF',
    fontSize: 12.3,
    fontWeight: '800',
  },
  teacherHeroArt: {
    bottom: -8,
    height: 150,
    position: 'absolute',
    right: -48,
    width: 232,
    zIndex: 1,
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  quickRail: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E2E5',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingBottom: 7,
    paddingHorizontal: 14,
    paddingTop: 7,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconBox: {
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    marginBottom: 5,
    width: 56,
  },
  quickLabel: {
    color: '#111116',
    fontSize: 11.4,
    fontWeight: '900',
    lineHeight: 14,
    textAlign: 'center',
  },
  teacherCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
  },
  teacherDashboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 136,
    overflow: 'hidden',
    paddingBottom: 5,
    paddingHorizontal: 8,
    paddingTop: 6,
    position: 'relative',
    width: '48.8%',
  },
  teacherDashboardCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    position: 'relative',
    zIndex: 1,
  },
  teacherCardIconBadge: {
    alignItems: 'center',
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  teacherCardTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },
  classMetricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
    position: 'relative',
    zIndex: 1,
  },
  classMetricIcon: {
    alignItems: 'center',
    borderRadius: 13,
    height: 25,
    justifyContent: 'center',
    width: 25,
  },
  classMetricValue: {
    color: '#16161A',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },
  classMetricLabel: {
    color: '#57585F',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 13,
  },
  teacherProgressBarTrack: {
    backgroundColor: '#E9EBEE',
    borderRadius: 999,
    height: 7,
    marginTop: 3,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  teacherProgressBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  classGoalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    position: 'relative',
    zIndex: 1,
  },
  classGoalText: {
    color: '#505158',
    fontSize: 9.5,
    fontWeight: '700',
  },
  priorityRows: {
    gap: 4,
    position: 'relative',
    zIndex: 1,
  },
  priorityRow: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#F1D5D0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 26,
    paddingHorizontal: 7,
  },
  priorityCopy: {
    flex: 1,
    minWidth: 0,
  },
  priorityName: {
    color: '#15151A',
    fontSize: 10.6,
    fontWeight: '800',
    lineHeight: 13,
  },
  priorityMeta: {
    color: '#5D5E65',
    fontSize: 9.3,
    fontWeight: '500',
    lineHeight: 11,
  },
  priorityBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  priorityHigh: { backgroundColor: '#FFE5E4' },
  priorityMedium: { backgroundColor: '#FFF1DF' },
  priorityText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  priorityHighText: { color: '#F11E1E' },
  priorityMediumText: { color: '#FF650D' },
  redActionButton: {
    borderRadius: 9,
    marginTop: 5,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  redActionGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 25,
  },
  redActionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  teacherAssignmentRows: {
    gap: 5,
    position: 'relative',
    zIndex: 1,
  },
  teacherAssignmentItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#E5D9FF',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 30,
    padding: 4,
  },
  teacherAssignmentIconBox: {
    alignItems: 'center',
    backgroundColor: '#F0E8FF',
    borderRadius: 10,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  teacherAssignmentTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  teacherAssignmentTitle: {
    color: '#111116',
    fontSize: 9.8,
    fontWeight: '900',
    lineHeight: 12,
  },
  teacherAssignmentMeta: {
    color: '#6B6C73',
    fontSize: 9.2,
    fontWeight: '500',
    marginTop: 2,
  },
  teacherActionLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    position: 'relative',
    zIndex: 1,
  },
  teacherActionLinkText: {
    color: '#7446DD',
    fontSize: 12,
    fontWeight: '700',
  },
  groupRows: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: '#D7EACF',
    borderRadius: 9,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  groupRow: {
    alignItems: 'center',
    borderBottomColor: '#DDEBD8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 26,
    paddingHorizontal: 7,
  },
  groupIconCell: {
    width: 28,
  },
  groupText: {
    color: '#17171B',
    flex: 1,
    fontSize: 10.2,
    fontWeight: '700',
  },
  groupCount: {
    color: '#17171B',
    fontSize: 10.8,
    fontWeight: '800',
    marginRight: 8,
  },
  groupViewButton: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
    position: 'relative',
    zIndex: 1,
  },
  groupViewText: {
    color: '#11891E',
    fontSize: 12,
    fontWeight: '700',
  },
  aiNote: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDBA7A',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 7,
    minHeight: 72,
    overflow: 'hidden',
    padding: 7,
    position: 'relative',
  },
  aiTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    position: 'relative',
    zIndex: 1,
  },
  aiIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  aiTitle: {
    color: '#FF5A0A',
    fontSize: 14,
    fontWeight: '900',
  },
  aiCopyRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 3,
    position: 'relative',
    zIndex: 1,
  },
  aiBody: {
    color: '#15151A',
    flex: 1,
    fontSize: 10.8,
    fontWeight: '500',
    lineHeight: 14,
  },
  sendTaskButton: {
    alignItems: 'center',
    borderColor: '#FF5A0A',
    borderRadius: 12,
    borderWidth: 1.2,
    justifyContent: 'center',
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  sendTaskText: {
    color: '#FF5A0A',
    fontSize: 12.5,
    fontWeight: '700',
  },
  teacherBottomNav: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DADADD',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    height: 70,
    justifyContent: 'space-around',
    paddingBottom: 5,
    paddingHorizontal: 13,
  },
  teacherNavItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 64,
    position: 'relative',
  },
  teacherNavIndicator: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 3,
    position: 'absolute',
    top: 0,
    width: 58,
  },
  teacherNavIndicatorActive: {
    backgroundColor: '#FF4B10',
  },
  teacherNavLabel: {
    color: '#5B5C61',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  teacherNavLabelActive: {
    color: '#FF4B10',
    fontWeight: '700',
  },
  overlayFill: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    paddingTop: TEACHER_TOP_INSET,
  },
  floatingModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,17,31,0.44)',
    paddingHorizontal: 14,
    paddingVertical: 28,
  },
  floatingModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  assignmentModalCard: {
    width: '100%',
    maxWidth: 398,
    maxHeight: Math.min(SCREEN.height - TEACHER_TOP_INSET - 44, 760),
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    shadowColor: '#07111F',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 42,
    elevation: 18,
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { color: '#1D4ED8', fontWeight: '800', fontSize: 16 },
  backTextOrange: { color: '#FF4B10', fontWeight: '800', fontSize: 16 },
  headerTitle: { color: '#111827', fontWeight: '900', fontSize: 18 },
  portalNewButton: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  portalNewText: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '900',
  },
  spacer: { width: 56 },
  heroCard: {
    backgroundColor: '#0B2D4D',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    padding: 18,
    gap: 14,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    color: '#B7F7D0',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  heroBody: {
    color: '#D7E4EF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    marginTop: 2,
  },
  heroAside: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 92,
  },
  healthBadge: {
    alignItems: 'flex-end',
  },
  healthValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  healthLabel: {
    color: '#B7C9DA',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroButton: {
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  heroButtonText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryStrip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7EF',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  summaryDivider: {
    backgroundColor: '#E5E7EB',
    width: 1,
  },
  summaryValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  segmented: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 4,
    flexDirection: 'row',
  },
  seg: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segActive: { backgroundColor: '#FFF' },
  segText: { color: '#6B7280', fontWeight: '800', fontSize: 12 },
  segTextActive: { color: '#111827' },
  content: { padding: 16, paddingTop: 14, paddingBottom: 32, gap: 14 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  dropdownWrap: { position: 'relative' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipText: { color: '#374151', fontSize: 12, fontWeight: '800' },
  chipPushEnd: { marginLeft: 'auto' },
  chipAlert: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  chipAlertText: { color: '#B91C1C' },
  menu: {
    position: 'absolute',
    top: 46,
    left: 0,
    minWidth: 150,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    zIndex: 10,
  },
  menuItem: { paddingHorizontal: 14, paddingVertical: 12 },
  menuItemActive: { backgroundColor: '#EFF6FF' },
  menuText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  menuTextActive: { color: '#2563EB' },
  primary: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  metric: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E7EF',
    padding: 14,
    minHeight: 112,
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end' },
  metricValue: { color: '#111827', fontSize: 28, fontWeight: '900', marginTop: 8 },
  metricAccent: {
    color: '#16A34A',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
    marginBottom: 4,
  },
  metricHint: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
    marginBottom: 4,
  },
  metricSubline: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    marginTop: 6,
  },
  risk: { color: '#DC2626' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E7EF',
    overflow: 'hidden',
  },
  lessonPlanContent: {
    gap: 13,
    padding: 16,
    paddingBottom: 104,
  },
  lessonHero: {
    borderRadius: 24,
    elevation: 6,
    minHeight: 188,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
    shadowColor: '#FF6B1A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  lessonHeroBubble: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 999,
    height: 150,
    position: 'absolute',
    right: -46,
    top: -58,
    width: 150,
  },
  lessonHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lessonHeroKicker: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  lessonReadyPill: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  lessonReadyText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  lessonHeroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 26,
    maxWidth: 270,
  },
  lessonStatRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  lessonStatCard: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  lessonStatValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
  },
  lessonStatLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  lessonPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE3EC',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'visible',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  lessonPanelHeader: {
    alignItems: 'center',
    borderBottomColor: '#E4E9F0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  lessonPanelTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  lessonStepPill: {
    backgroundColor: '#FFF0EA',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  lessonReadyPreviewPill: {
    backgroundColor: '#FFF0EA',
  },
  lessonDraftPill: {
    backgroundColor: '#EEF4FF',
  },
  lessonStepText: {
    color: '#FF4B10',
    fontSize: 10,
    fontWeight: '900',
  },
  lessonFormGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  lessonSelectWrap: {
    flexBasis: '48.4%',
    flexGrow: 1,
    position: 'relative',
  },
  lessonFieldLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 7,
  },
  lessonSelectButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#CFD8E5',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 13,
  },
  lessonSelectText: {
    color: '#020617',
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    marginRight: 8,
  },
  dropdownModalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
    flex: 1,
  },
  dropdownModalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0EA',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 18,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#172235',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  dropdownModalHeader: {
    alignItems: 'center',
    borderBottomColor: '#EEF2F7',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
  },
  dropdownModalTitle: {
    color: '#07142B',
    fontSize: 16,
    fontWeight: '900',
  },
  dropdownModalClose: {
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  dropdownModalOptions: {
    flexShrink: 1,
  },
  lessonSelectOption: {
    borderBottomColor: '#EEF2F7',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lessonSelectOptionActive: {
    backgroundColor: '#FFF0EA',
  },
  lessonSelectOptionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  lessonSelectOptionTextActive: {
    color: '#FF4B10',
    fontWeight: '900',
  },
  lessonInputBlock: {
    paddingHorizontal: 14,
    paddingTop: 11,
  },
  lessonTextInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CFD8E5',
    borderRadius: 11,
    borderWidth: 1,
    color: '#020617',
    fontSize: 13,
    fontWeight: '900',
    minHeight: 42,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  lessonOutcomeInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  lessonTemplateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 14,
  },
  lessonTemplateLabel: {
    marginTop: 14,
    paddingHorizontal: 14,
  },
  lessonTemplateChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7DEE9',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lessonTemplateChipActive: {
    backgroundColor: '#FFF0EA',
    borderColor: '#FFD3C2',
  },
  lessonTemplateText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '900',
  },
  lessonTemplateTextActive: {
    color: '#FF4B10',
  },
  lessonActionRow: {
    flexDirection: 'row',
    gap: 11,
    padding: 14,
  },
  lessonClearButton: {
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderColor: '#E0E4EA',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  lessonClearText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '900',
  },
  lessonEditButton: {
    alignItems: 'center',
    backgroundColor: '#F1F3F6',
    borderColor: '#E0E4EA',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  lessonEditText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '900',
  },
  lessonGenerateButton: {
    alignItems: 'center',
    backgroundColor: '#FF4B2B',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    shadowColor: '#FF4B10',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  lessonGenerateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  lessonPreviewCard: {
    borderColor: '#DCE3EC',
    borderRadius: 11,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 14,
    padding: 13,
  },
  lessonPreviewTitle: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  lessonPreviewBody: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 8,
  },
  lessonReportButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#DCE3EC',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lessonReportButtonSubmitted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  lessonReportText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
  },
  lessonReportTextSubmitted: {
    color: '#16A34A',
  },
  lessonReportError: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 7,
  },
  lessonFlowCard: {
    borderColor: '#DCE3EC',
    borderRadius: 11,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 13,
  },
  lessonFlowRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  lessonTimePill: {
    alignItems: 'center',
    backgroundColor: '#EEF7FF',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 48,
  },
  lessonTimeText: {
    color: '#006FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  lessonFlowTitle: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '900',
  },
  lessonFlowBody: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },
  lessonShareButton: {
    alignItems: 'center',
    backgroundColor: '#E9FFF2',
    borderColor: '#8BE7B2',
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  lessonShareButtonActive: {
    backgroundColor: '#D8FBE7',
  },
  lessonShareText: {
    color: '#00A629',
    fontSize: 13,
    fontWeight: '900',
  },
  lessonSaveButton: {
    alignItems: 'center',
    backgroundColor: '#0D1726',
    borderRadius: 11,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  lessonSaveButtonActive: {
    backgroundColor: '#14243A',
  },
  lessonSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  lessonButtonDisabled: {
    opacity: 0.58,
  },
  messageAudienceScroll: {
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  messageAudienceChip: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#DCE3EC',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    marginRight: 8,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  messageAudienceChipActive: {
    backgroundColor: '#FF6B1A',
    borderColor: '#FF6B1A',
  },
  messageAudienceText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  messageAudienceTextActive: {
    color: '#FFFFFF',
  },
  teacherMessagesContent: {
    backgroundColor: '#FBFCFE',
    gap: 12,
    paddingBottom: 104,
    paddingHorizontal: 13,
    paddingTop: 14,
  },
  messagesPage: {
    backgroundColor: '#FBFCFE',
  },
  messageSectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEE5EE',
    borderRadius: 17,
    borderWidth: 1,
    gap: 12,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  messageSectionTitle: {
    color: '#07142B',
    fontSize: 15.5,
    fontWeight: '900',
    lineHeight: 21,
  },
  messageAudienceCards: {
    flexDirection: 'row',
    gap: 9,
  },
  messageAudienceCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0EA',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    minHeight: 106,
    paddingHorizontal: 10,
    paddingVertical: 12,
    position: 'relative',
  },
  messageAudienceCardActive: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FF5A1F',
  },
  messageAudienceCardCopy: {
    alignItems: 'center',
    minWidth: 0,
  },
  messageAudienceCardTitle: {
    color: '#07142B',
    fontSize: 11.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  messageAudienceCardMeta: {
    color: '#6B7890',
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 13,
    marginTop: 3,
    textAlign: 'center',
  },
  messageRadio: {
    alignItems: 'center',
    borderColor: '#AAB5C7',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: 8,
    top: 8,
    width: 20,
  },
  messageRadioActive: {
    borderColor: '#FF5A1F',
  },
  messageRadioDot: {
    backgroundColor: '#FF5A1F',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  messageRecipientSummary: {
    alignItems: 'center',
    backgroundColor: '#FFF5EF',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  messageRecipientSummaryText: {
    color: '#7C3A24',
    flex: 1,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 16,
  },
  messageDropdownWrap: {
    gap: 6,
    position: 'relative',
    zIndex: 5,
  },
  messageDropdownLabel: {
    color: '#07142B',
    fontSize: 11.5,
    fontWeight: '900',
  },
  messageDropdownButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0EA',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageDropdownButtonActive: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FF5A1F',
  },
  messageDropdownMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0,
  },
  messageDropdownValue: {
    color: '#07142B',
    fontSize: 14,
    fontWeight: '900',
  },
  messageDropdownMeta: {
    color: '#667085',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  messageDropdownOption: {
    borderBottomColor: '#EEF2F7',
    borderBottomWidth: 1,
    minHeight: 45,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  messageDropdownOptionActive: {
    backgroundColor: '#FFF3EA',
  },
  messageDropdownOptionText: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '900',
  },
  messageDropdownOptionTextActive: {
    color: '#FF6B1A',
  },
  messageDropdownOptionMeta: {
    color: '#667085',
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 2,
  },
  messageComposerHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  messageTemplateButton: {
    alignItems: 'center',
    backgroundColor: '#EEF9F1',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
  },
  messageTemplateText: {
    color: '#209653',
    fontSize: 10.5,
    fontWeight: '900',
  },
  messageInputShell: {
    position: 'relative',
  },
  messageInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8E0EA',
    borderRadius: 13,
    borderWidth: 1,
    color: '#07142B',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 19,
    minHeight: 124,
    paddingBottom: 30,
    paddingHorizontal: 13,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  messageCharacterCount: {
    bottom: 10,
    color: '#718096',
    fontSize: 10.5,
    fontWeight: '700',
    position: 'absolute',
    right: 12,
  },
  messageComposerFooter: {
    gap: 10,
  },
  messageAttachmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  messageAttachmentChip: {
    alignItems: 'center',
    backgroundColor: '#FAFBFC',
    borderColor: '#E0E6EE',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 35,
    paddingHorizontal: 5,
  },
  messageAttachmentText: {
    color: '#738096',
    fontSize: 9.5,
    fontWeight: '700',
  },
  messageSendButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#27A85B',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 160,
    paddingHorizontal: 20,
  },
  messageSendText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  messageHistoryCard: {
    backgroundColor: '#F5FAFF',
    borderColor: '#D9E9FA',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  messageEmptyState: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  messageEmptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  messageBubble: {
    borderRadius: 14,
    maxWidth: '88%',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  messageBubbleTeacher: {
    alignSelf: 'flex-end',
    backgroundColor: '#EAFBF0',
    borderColor: '#BFEBCD',
    borderWidth: 1,
  },
  messageBubbleParent: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4EC',
    borderColor: '#FFDCC6',
    borderWidth: 1,
  },
  messageBubbleSender: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  messageBubbleBody: {
    color: '#07111F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  messageBubbleTime: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  messageBubbleMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 7,
  },
  messageReportButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(148,163,184,0.36)',
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
  messageReportTextSubmitted: {
    color: '#15803D',
  },
  profileHero: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFE0D2',
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    overflow: 'visible',
    padding: 16,
    zIndex: 12,
  },
  profileHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
    paddingRight: 46,
  },
  profileEditButton: {
    alignItems: 'center',
    backgroundColor: '#FFF2EC',
    borderColor: '#FFD1BC',
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    top: 16,
    width: 38,
    zIndex: 2,
  },
  profileAvatar: {
    alignItems: 'center',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  profileName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  profileCountryWrap: {
    alignItems: 'flex-end',
    minWidth: 56,
    position: 'relative',
    zIndex: 50,
  },
  profileCountryButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 3,
    height: 36,
    justifyContent: 'center',
    width: 48,
  },
  profileCountryFlag: { fontSize: 21 },
  profileCountryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  profileCountryItemActive: { backgroundColor: '#FFF2EC' },
  profileCountryItemFlag: { fontSize: 18 },
  profileCountryItemText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
  },
  profileCountryItemTextActive: { color: '#FF4B10' },
  profileField: {
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  profileHeroFields: {
    marginTop: 8,
  },
  profileSummaryGrid: {
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
  },
  profileSummaryItem: {
    paddingVertical: 1,
  },
  profileSummaryValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  profileLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  profileInput: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileInputShort: {
    maxWidth: 190,
    width: '52%',
  },
  profileDropdownField: {
    overflow: 'visible',
    zIndex: 10,
  },
  profileRegionSelect: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  profileRegionText: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  profileRegionMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 250,
    overflow: 'hidden',
    width: '100%',
  },
  profileRegionMenuScroll: { maxHeight: 248 },
  profileRegionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileRegionItemActive: { backgroundColor: '#ECFDF3' },
  profileRegionItemText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
  },
  profileRegionItemTextActive: { color: '#128A44' },
  profileSchoolMeta: {
    color: '#8A94A6',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  profileEditOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  profileEditBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
  },
  profileEditCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFE0D2',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 18,
    maxHeight: '86%',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    width: '100%',
  },
  profileEditHeader: {
    alignItems: 'center',
    borderBottomColor: '#F3F4F6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  profileEditTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '900',
  },
  profileEditSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  profileEditClose: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  profileEditContent: {
    paddingHorizontal: 18,
    paddingVertical: 4,
  },
  profileEditFooter: {
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  profileEditCancel: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
  },
  profileEditCancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '900',
  },
  profileEditSave: {
    alignItems: 'center',
    backgroundColor: '#FF4B10',
    borderRadius: 14,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    shadowColor: '#FF4B10',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  profileEditSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  profileSignOutButton: {
    alignItems: 'center',
    backgroundColor: '#FFF1F0',
    borderColor: '#FFD6D0',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  profileSignOutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '900',
  },
  profileChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 14,
  },
  profileToggle: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  profileToggleActive: {
    backgroundColor: '#FFF2EC',
    borderColor: '#FFB08D',
  },
  profileToggleText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  profileToggleTextActive: {
    color: '#FF4B10',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeaderText: {
    color: '#4B5563',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardHeaderMeta: { color: '#6B7280', fontSize: 10, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#F3F4F6',
  },
  rowLead: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  rowEnd: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowEndTight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5E7EB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#1D4ED8', fontWeight: '900', fontSize: 13 },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#111827', fontWeight: '800', fontSize: 14 },
  rowMeta: { color: '#6B7280', fontSize: 11, fontWeight: '600', lineHeight: 16 },
  rowMetaTiny: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scoreWrap: { alignItems: 'flex-end', marginRight: 4 },
  rowTiny: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  score: { fontWeight: '900', fontSize: 14 },
  studentProgressLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  studentProgressTrack: {
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  studentProgressFill: {
    backgroundColor: '#0F766E',
    borderRadius: 999,
    height: 6,
  },
  studentProgressText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  goodText: { color: '#15803D' },
  warnText: { color: '#C2410C' },
  badText: { color: '#B91C1C' },
  empty: { paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  assignmentList: { gap: 12 },
  assignmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E1E7EF',
    padding: 16,
  },
  assignmentHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  subjectPill: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  subjectBlue: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  subjectGreen: { backgroundColor: '#DCFCE7', color: '#166534' },
  subjectOrange: { backgroundColor: '#FFEDD5', color: '#C2410C' },
  date: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  assignmentTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 20,
  },
  assignmentMeta: { color: '#6B7280', fontSize: 12, fontWeight: '600' },
  assignmentInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  assignmentInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 2,
  },
  progressLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  progressCount: { color: '#111827', fontSize: 12, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 12,
  },
  fill: { height: 8, borderRadius: 999, backgroundColor: '#2563EB' },
  fillComplete: { backgroundColor: '#16A34A' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRoot: { flex: 1, backgroundColor: '#F2F2F7' },
  detailHead: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailTitle: { flex: 1, color: '#111827', fontWeight: '800', fontSize: 16 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  detailMetric: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    alignItems: 'center',
  },
  detailMetricValue: { fontSize: 28, fontWeight: '900', marginTop: 6 },
  averageMetric: { color: '#1D4ED8' },
  pendingRow: { opacity: 0.6 },
  pendingAvatar: { backgroundColor: '#F3F4F6' },
  pendingAvatarText: { color: '#6B7280', fontWeight: '900' },
  pendingText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreNeutral: { color: '#111827' },
  reviewHeaderMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  reviewHeaderText: { flex: 1 },
  reviewStudentName: { color: '#111827', fontWeight: '800', fontSize: 14 },
  reviewLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scoreBadgeText: { color: '#1D4ED8', fontSize: 12, fontWeight: '800' },
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    gap: 12,
  },
  reviewQuestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  questionNumber: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  reviewQuestionText: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '800' },
  answerBlock: { borderRadius: 16, borderWidth: 1, padding: 12 },
  answerBlockCorrect: { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' },
  answerBlockIncorrect: { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
  answerBlockLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  answerBlockValue: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  answerValueGood: { color: '#166534' },
  answerValueBad: { color: '#991B1B' },
  correctAnswerBlock: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  correctAnswerLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  correctAnswerValue: { color: '#374151', fontSize: 14, fontWeight: '600', marginTop: 4 },
  reviewFooter: { flexDirection: 'row', justifyContent: 'flex-end' },
  reviewStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reviewStatusText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  answerLabelGood: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  answerLabelBad: {
    color: '#991B1B',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  wizardRoot: {
    backgroundColor: '#FFFFFF',
    maxHeight: '100%',
    position: 'relative',
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E7EBEA',
    marginTop: 10,
    marginBottom: 2,
  },
  wizardHead: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EDF0EF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseButton: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F4F6F3',
  },
  modalCloseButtonGhost: { minWidth: 72, minHeight: 38 },
  wizardHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    paddingHorizontal: 6,
  },
  wizardHeaderTitle: {
    color: '#07111F',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
  },
  regenerateButton: {
    minWidth: 72,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#FFF4EC',
  },
  wizardContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 },
  wizardScroll: { maxHeight: Math.min(SCREEN.height - TEACHER_TOP_INSET - 178, 640) },
  wizardInner: { gap: 12, maxWidth: 440, alignSelf: 'center', width: '100%' },
  cancelText: { color: '#667085', fontWeight: '900', fontSize: 13 },
  actionText: { color: '#F97316', fontWeight: '900', fontSize: 12 },
  wizardTitle: { color: '#07111F', fontWeight: '900', fontSize: 21, letterSpacing: 0 },
  wizardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9EEE9',
    gap: 10,
    padding: 15,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  twoCol: { flexDirection: 'row', gap: 10, zIndex: 8 },
  flexField: { flex: 1 },
  field: { gap: 7, marginBottom: 10 },
  input: {
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#E1E7E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#07111F',
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: { minHeight: 96, textAlignVertical: 'top' },
  selectWrap: { position: 'relative', zIndex: 1 },
  selectField: {
    minHeight: 50,
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#E1E7E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: { color: '#07111F', fontSize: 14, fontWeight: '800', flexShrink: 1 },
  selectMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E9E3',
    overflow: 'hidden',
    marginTop: 8,
    maxHeight: 190,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  selectMenuScroll: { maxHeight: 190 },
  generate: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  publishButton: {
    backgroundColor: '#128A44',
    shadowColor: '#128A44',
  },
  generateDisabled: {
    backgroundColor: '#D2D8D2',
    shadowOpacity: 0,
  },
  editorStack: { gap: 14, maxWidth: 440, alignSelf: 'center', width: '100%' },
  titleInput: {
    color: '#07111F',
    fontSize: 18,
    fontWeight: '900',
    paddingVertical: 0,
    marginTop: 8,
  },
  descInput: {
    color: '#4A5565',
    fontSize: 14,
    fontWeight: '700',
    minHeight: 64,
    textAlignVertical: 'top',
    paddingVertical: 0,
    marginTop: 8,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9EEE9',
    padding: 16,
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFF4EC',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    overflow: 'hidden',
    color: '#C2410C',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  questionHeaderBlock: { paddingRight: 70, marginBottom: 12 },
  questionHeaderLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  questionInput: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
    paddingVertical: 0,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  optionStack: { gap: 8, marginBottom: 12, paddingLeft: 8 },
  optionLabel: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F97316' },
  optionInput: {
    flex: 1,
    backgroundColor: '#FAFBF8',
    borderWidth: 1,
    borderColor: '#E1E7E1',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#07111F',
    fontSize: 12,
    fontWeight: '700',
  },
  addOptionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 },
  addOptionText: { color: '#F97316', fontSize: 11, fontWeight: '900' },
  answerKeyCard: {
    backgroundColor: '#ECF8EF',
    borderWidth: 1,
    borderColor: '#BDE7C8',
    borderRadius: 16,
    padding: 12,
  },
  answerKeyLabel: {
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  answerKeyInput: { color: '#166534', fontSize: 14, fontWeight: '800', paddingVertical: 0 },
  publishBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#EDF0EF',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dueDateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  dueDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dueDateChip: {
    backgroundColor: '#F4F6F5',
    borderColor: '#E4E9E5',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dueDateChipActive: {
    backgroundColor: '#FFF3EA',
    borderColor: '#F97316',
  },
  dueDateChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  dueDateChipTextActive: {
    color: '#EA580C',
  },
  dueDatePreview: {
    color: '#667085',
    fontSize: 12.5,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,24,39,0.95)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
});

