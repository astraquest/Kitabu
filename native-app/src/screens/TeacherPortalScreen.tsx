import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
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
import {
  CalendarCheck2,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Pencil,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Path,
} from 'react-native-svg';

import { TeacherAssignmentDetailSection } from '../components/teacher/TeacherAssignmentDetailSection';
import { TeacherAssignmentsSection } from '../components/teacher/TeacherAssignmentsSection';
import { TeacherAssignmentWizardSection } from '../components/teacher/TeacherAssignmentWizardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherSubmissionReviewSection } from '../components/teacher/TeacherSubmissionReviewSection';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { studentPerformanceToModalUser } from '../components/studentDetailsAdapters';
import { RemedialAssignmentPayload } from '../components/studentRemedialLogic';
import { DEFAULT_GRADE, SUPPORTED_GRADES, TEACHER_ALL_GRADES_FILTER } from '../constants/grades';
import {
  COUNTRY_OPTIONS,
  CountryOption,
  REGIONS_BY_COUNTRY,
  countryCodeForName,
  countryNameForCode,
} from '../constants/locations';
import { generateAssignmentJson, generateLessonPlanIdeas } from '../services/aiService';
import {
  getTeacherParentMessages,
  getTeacherParents,
  saveTeacherLessonPlan,
  sendTeacherParentMessage,
  TeacherParentContact,
  TeacherParentMessage,
} from '../services/teacherService';
import {
  Assignment,
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
  onPublishAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
}

type Tab = 'students' | 'assignments';
type PortalView = 'students' | 'assignments' | 'lessonPlan' | 'messages' | 'profile';
type WizardStep = 1 | 2;
type SlideDirection = 'right' | 'bottom';

const SCREEN = Dimensions.get('window');
const TEACHER_DEFAULT_GRADE = 'Grade 10';
const TEACHER_SUBJECTS = ['Mathematics', 'English', 'Science', 'Kiswahili', 'Social Studies'];
type TeacherCountryCode = CountryOption['code'];

const SUBJECT_STRANDS: Record<string, string[]> = {
  Math: ['Numbers & Operations', 'Algebra', 'Geometry', 'Data Handling'],
  English: ['Grammar', 'Reading Comprehension', 'Creative Writing', 'Oral Skills'],
  Science: ['Living Things', 'Matter & Energy', 'Earth & Space', 'Forces'],
  History: ['Ancient Civilizations', 'World Wars', 'Local History', 'Government'],
  Geography: ['Physical Geography', 'Human Geography', 'Maps & Skills', 'Environment'],
};

const STRAND_SUBSTRANDS: Record<string, string[]> = {
  'Numbers & Operations': ['Integers', 'Fractions', 'Decimals', 'Percentages'],
  Algebra: ['Linear Equations', 'Quadratic Expressions', 'Inequalities', 'Variables'],
  Geometry: ['Angles', 'Triangles', 'Circles', 'Area & Volume'],
  'Data Handling': ['Mean, Mode, Median', 'Pie Charts', 'Bar Graphs'],
  Grammar: ['Nouns', 'Verbs', 'Adjectives', 'Tenses'],
  'Reading Comprehension': ['Short Stories', 'Poems', 'News Articles'],
  'Living Things': ['Plants', 'Animals', 'Human Body', 'Ecosystems'],
  'Matter & Energy': ['States of Matter', 'Heat', 'Light', 'Sound'],
};

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
  onPublishAssignment,
}: TeacherPortalScreenProps) {
  const [tab, setTab] = useState<Tab>('students');
  const [portalView, setPortalView] = useState<PortalView>('students');
  const [selectedGrade, setSelectedGrade] = useState(TEACHER_DEFAULT_GRADE);
  const [gradeFilter, setGradeFilter] = useState(TEACHER_ALL_GRADES_FILTER);
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
  const [subject, setSubject] = useState('Math');
  const [grade, setGrade] = useState(DEFAULT_GRADE);
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
    teacherProfile.email || teacherEmail || 'teacher@kitabu.ai',
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
      : ['Mathematics', 'Science', 'English'],
  );
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

  const selectedClassStudents = useMemo(
    () => students.filter(item => item.grade === selectedGrade),
    [selectedGrade, students],
  );

  const teacherGradeOptions = useMemo(() => {
    const selectedOptions = SUPPORTED_GRADES.filter(option => taughtGrades.includes(option));
    return selectedOptions.length > 0 ? selectedOptions : [TEACHER_DEFAULT_GRADE];
  }, [taughtGrades]);

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

  const averageScore = Math.round(
    students.reduce((total, current) => total + current.assessmentScore, 0) /
      Math.max(1, students.length),
  );
  const remedialCount = students.filter(item => item.assessmentScore < 70).length;
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
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
        {Platform.OS === 'web' ? <StatusChrome /> : null}
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
            onBack={() => setPortalView(tab)}
            onChangeCountry={value => {
              const nextRegionMeta = REGIONS_BY_COUNTRY[value] ?? REGIONS_BY_COUNTRY.KE;
              const nextRegion = nextRegionMeta.options[0] || '';
              setProfileCountryCode(value);
              setProfileRegion(nextRegion);
              saveTeacherProfile({
                country: countryNameForCode(value),
                countryCode: value,
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
            subjects={taughtSubjects}
            onBack={() => setPortalView(tab)}
          />
        ) : portalView === 'messages' ? (
          <TeacherMessagesView
            grade={selectedGrade}
            students={selectedClassStudents}
            onBack={() => setPortalView(tab)}
          />
        ) : (
          <View style={portalStyles.teacherListPortal}>
            <View style={portalStyles.listPortalHeader}>
              <Pressable onPress={() => setPortalView(tab)} style={portalStyles.back}>
                <ChevronLeft size={24} color={portalStyles.backIconColor} strokeWidth={2.7} />
                <Text style={portalStyles.backText}>Back</Text>
              </Pressable>
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
                  accessibilityLabel="Open lesson planner"
                  onPress={() => setPortalView('lessonPlan')}
                  style={portalStyles.portalIconButton}>
                  <CalendarCheck2 color={portalStyles.portalActionIconColor} size={18} strokeWidth={2.7} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Open parent messages"
                  onPress={() => setPortalView('messages')}
                  style={portalStyles.portalIconButton}>
                  <MessageSquareText color={portalStyles.portalActionIconColor} size={18} strokeWidth={2.7} />
                </Pressable>
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
              {tab === 'students' ? (
                <TeacherStudentsSection
                  styles={portalStyles}
                  gradeFilter={gradeFilter}
                  gradeMenuOpen={gradeMenuOpen}
                  subjectFilter={subjectFilter}
                  subjectMenuOpen={subjectMenuOpen}
                  sortBy={sortBy}
                  showRemedial={showRemedial}
                  averageScore={averageScore}
                  remedialCount={remedialCount}
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
          subjectStrands={SUBJECT_STRANDS}
          strandSubStrands={STRAND_SUBSTRANDS}
          onSetStep={setStep}
          onSetGrade={value => {
            setGrade(value);
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

function StatusChrome() {
  return (
    <View style={s.statusChrome}>
      <Text style={s.statusTime}>1:30</Text>
      <View style={s.statusRight}>
        <View style={s.signalBars}>
          <View style={[s.signalBar, s.signalBarShort]} />
          <View style={[s.signalBar, s.signalBarMedium]} />
          <View style={[s.signalBar, s.signalBarTall]} />
          <View style={[s.signalBar, s.signalBarFull]} />
        </View>
        <Svg width={21} height={16} viewBox="0 0 21 16">
          <Path d="M2 6c5-5 12-5 17 0" stroke="#050505" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Path d="M6 10c3-3 7-3 10 0" stroke="#050505" strokeWidth="3" strokeLinecap="round" fill="none" />
          <Circle cx="10.5" cy="14" r="2" fill="#050505" />
        </Svg>
        <View style={s.battery}>
          <Text style={s.batteryText}>86</Text>
        </View>
      </View>
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
  onBack,
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
  onBack: () => void;
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
            onPress={() => setCountryMenuOpen(open => !open)}
            style={s.profileCountryButton}>
            <Text style={s.profileCountryFlag}>{countryConfig.flag}</Text>
            <ChevronDown size={13} color="#6B7280" />
          </Pressable>
          {countryMenuOpen ? (
            <View style={s.profileCountryMenu}>
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
          ) : null}
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
          options={TEACHER_SUBJECTS}
          selected={taughtSubjects}
          title="Subjects taught"
          onToggle={onToggleSubject}
        />
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
                placeholder="teacher@kitabu.ai"
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
  subjects,
  onBack,
}: {
  grade: string;
  grades: readonly string[];
  subjects: string[];
  onBack: () => void;
}) {
  const gradeOptions = grades.length > 0 ? grades : [grade];
  const subjectOptions = subjects.length > 0 ? subjects : TEACHER_SUBJECTS.slice(0, 4);
  const [selectedGrade, setSelectedGrade] = useState(gradeOptions.includes(grade) ? grade : gradeOptions[0]);
  const [selectedSubject, setSelectedSubject] = useState(subjectOptions[0] || 'Mathematics');
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
  const [ready, setReady] = useState(true);
  const [status, setStatus] = useState<'idle' | 'shared' | 'saved'>('idle');
  const [aiIdeas, setAiIdeas] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const lessonMinutes = Number.parseInt(duration, 10) || 35;
  const flow = buildLessonFlow(lessonMinutes, style);

  function clearPlan() {
    setSelectedGrade(gradeOptions[0] || grade);
    setSelectedSubject(subjectOptions[0] || 'Mathematics');
    setDuration('35 minutes');
    setStyle('Revision');
    setTemplate('Revision');
    setTopic('');
    setOutcome('');
    setReady(false);
    setStatus('idle');
    setAiIdeas('');
    setOpenSelect(null);
  }

  async function generatePlan() {
    const nextTopic = topic.trim() || 'Linear equations and real-life problems';
    const nextOutcome =
      outcome.trim() ||
      'Learners solve simple linear equations and explain each step using a real-life example.';
    setTopic(nextTopic);
    setOutcome(nextOutcome);
    setReady(true);
    setStatus('idle');
    setOpenSelect(null);
    setIsGeneratingPlan(true);
    try {
      const ideas = await generateLessonPlanIdeas({
        gradeLevel: selectedGrade,
        subject: selectedSubject,
        topic: nextTopic,
        outcome: nextOutcome,
        durationMinutes: lessonMinutes,
        style,
      });
      setAiIdeas(ideas);
    } catch (error) {
      console.error('Error generating lesson plan ideas:', error);
      Alert.alert('AI unavailable', 'Could not generate lesson ideas right now. Please try again.');
    } finally {
      setIsGeneratingPlan(false);
    }
  }

  async function savePlan() {
    if (!ready) {
      await generatePlan();
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
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Lesson Plan</Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.lessonPlanContent}>
        <View style={s.lessonHero}>
          <View style={s.lessonHeroTop}>
            <Text style={s.lessonHeroKicker}>{selectedGrade.toUpperCase()} TODAY</Text>
            <View style={s.lessonReadyPill}>
              <Text style={s.lessonReadyText}>CBC Ready</Text>
            </View>
          </View>
          <Text style={s.lessonHeroTitle}>Create a clean lesson plan in minutes</Text>
          <View style={s.lessonStatRow}>
            <LessonStat value={lessonMinutes} label="Minutes" />
            <LessonStat value={flow.length} label="Sections" />
            <LessonStat value={ready ? 1 : 0} label="Export" />
          </View>
        </View>

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
                setReady(false);
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
                setReady(false);
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
                    setReady(false);
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
          {aiIdeas ? (
            <View style={s.lessonPreviewCard}>
              <Text style={s.lessonPreviewTitle}>AI Presentation Ideas</Text>
              <Text style={s.lessonPreviewBody}>{aiIdeas}</Text>
            </View>
          ) : null}
          <View style={s.lessonActionRow}>
            <Pressable
              onPress={() => setStatus('shared')}
              style={[s.lessonShareButton, status === 'shared' && s.lessonShareButtonActive]}>
              <Text style={s.lessonShareText}>{status === 'shared' ? 'Shared' : 'Share'}</Text>
            </Pressable>
            <Pressable
              disabled={isSavingPlan}
              onPress={savePlan}
              style={[
                s.lessonSaveButton,
                status === 'saved' && s.lessonSaveButtonActive,
                isSavingPlan && s.lessonButtonDisabled,
              ]}>
              <Text style={s.lessonSaveText}>
                {isSavingPlan ? 'Saving...' : status === 'saved' ? 'Saved' : 'Save Plan'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
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
  return (
    <View style={[s.lessonSelectWrap, { zIndex }]}>
      <Text style={s.lessonFieldLabel}>{label}</Text>
      <Pressable onPress={onToggle} style={s.lessonSelectButton}>
        <Text numberOfLines={1} style={s.lessonSelectText}>
          {value}
        </Text>
        <ChevronDown color="#111827" size={16} strokeWidth={2.7} />
      </Pressable>
      {open ? (
        <View style={s.lessonSelectMenu}>
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
      ) : null}
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
  students,
  onBack,
}: {
  grade: string;
  students: StudentPerformance[];
  onBack: () => void;
}) {
  const supportCount = students.filter(item => item.assessmentScore < 70).length;
  const [parents, setParents] = useState<TeacherParentContact[]>([]);
  const [messages, setMessages] = useState<TeacherParentMessage[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('all');
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const selectedParent = parents.find(parent => parent.id === selectedParentId);

  async function loadMessages(parentId = selectedParentId) {
    setIsLoading(true);
    try {
      const [nextParents, nextMessages] = await Promise.all([
        getTeacherParents(grade),
        getTeacherParentMessages({
          gradeLevel: grade,
          parentUserId: parentId === 'all' ? undefined : parentId,
        }),
      ]);
      setParents(nextParents);
      setMessages(nextMessages);
      if (parentId !== 'all' && !nextParents.some(parent => parent.id === parentId)) {
        setSelectedParentId('all');
      }
    } catch (error) {
      console.error('Error loading teacher messages:', error);
      Alert.alert('Messages unavailable', 'Could not load parent messages right now.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMessages('all');
  }, [grade]);

  async function selectParent(parentId: string) {
    setSelectedParentId(parentId);
    await loadMessages(parentId);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body) {
      return;
    }
    setIsSendingMessage(true);
    try {
      await sendTeacherParentMessage({
        gradeLevel: grade,
        parentUserId: selectedParentId === 'all' ? null : selectedParentId,
        body,
      });
      setDraft('');
      await loadMessages(selectedParentId);
    } catch (error) {
      console.error('Error sending teacher message:', error);
      Alert.alert('Message failed', 'Could not send this message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }

  return (
    <TeacherSimplePortalView title="Messages" onBack={onBack}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardHeaderText}>{grade} Parent Messages</Text>
          <Text style={s.cardHeaderMeta}>
            {isLoading ? 'Loading...' : `${parents.length} parents`}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.messageAudienceScroll}>
          <Pressable
            onPress={() => selectParent('all')}
            style={[
              s.messageAudienceChip,
              selectedParentId === 'all' && s.messageAudienceChipActive,
            ]}>
            <Users
              color={selectedParentId === 'all' ? '#FFFFFF' : '#0F172A'}
              size={16}
              strokeWidth={2.5}
            />
            <Text
              style={[
                s.messageAudienceText,
                selectedParentId === 'all' && s.messageAudienceTextActive,
              ]}>
              All Parents
            </Text>
          </Pressable>
          {parents.map(parent => (
            <Pressable
              key={parent.id}
              onPress={() => selectParent(parent.id)}
              style={[
                s.messageAudienceChip,
                selectedParentId === parent.id && s.messageAudienceChipActive,
              ]}>
              <Text
                style={[
                  s.messageAudienceText,
                  selectedParentId === parent.id && s.messageAudienceTextActive,
                ]}>
                {parent.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={s.messageComposer}>
          <Text style={s.messageComposerLabel}>
            {selectedParent ? `Message ${selectedParent.name}` : `Message all ${grade} parents`}
          </Text>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder={
              supportCount > 0
                ? `Example: ${supportCount} learners need revision support this week...`
                : 'Write a class update, reminder, or individual note...'
            }
            placeholderTextColor="#8A94A6"
            style={s.messageInput}
            value={draft}
          />
          <Pressable
            disabled={isSendingMessage || draft.trim().length === 0}
            onPress={sendMessage}
            style={[
              s.messageSendButton,
              (isSendingMessage || draft.trim().length === 0) && s.lessonButtonDisabled,
            ]}>
            <Text style={s.messageSendText}>{isSendingMessage ? 'Sending...' : 'Send'}</Text>
          </Pressable>
        </View>

        <View style={s.messageThread}>
          {messages.length === 0 ? (
            <View style={s.messageEmptyState}>
              <Text style={s.rowTitle}>No messages yet</Text>
              <Text style={s.rowMeta}>
                Messages sent here are saved and visible to the intended parent accounts.
              </Text>
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
                  <Text style={s.messageBubbleTime}>
                    {new Date(message.created_at).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </View>
    </TeacherSimplePortalView>
  );
}

function TeacherSimplePortalView({
  children,
  title,
  onBack,
}: {
  children: React.ReactNode;
  title: string;
  onBack: () => void;
}) {
  return (
    <View style={s.teacherListPortal}>
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
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
    filterIconSize: 19,
    teacherListPortal: [
      s.teacherListPortal,
      {
        backgroundColor: palette.background,
      },
    ],
    listPortalHeader: [
      s.listPortalHeader,
      {
        backgroundColor: palette.header,
        borderBottomWidth: 0,
        elevation: 0,
        minHeight: 86,
        paddingBottom: 18,
        paddingHorizontal: 18,
        paddingTop: 18,
        shadowOpacity: 0,
      },
    ],
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
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 4,
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
      gap: 7,
      justifyContent: 'flex-end',
      minWidth: 128,
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
        backgroundColor: '#F0F3F1',
        borderColor: '#E4E9E5',
        borderRadius: 18,
        borderWidth: 1,
        elevation: 2,
        marginBottom: 18,
        marginHorizontal: 22,
        marginTop: 0,
        padding: 5,
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
      },
    ],
    seg: [s.seg, { borderRadius: 14, minHeight: 50, paddingVertical: 13 }],
    segActive: [
      s.segActive,
      {
        backgroundColor: '#FFFFFF',
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
        paddingBottom: 36,
        paddingHorizontal: 16,
        paddingTop: 0,
      },
    ],
    filterRow: [
      s.filterRow,
      {
        flexWrap: 'nowrap',
        gap: 10,
        justifyContent: 'space-between',
        zIndex: 20,
      },
    ],
    dropdownWrap: [s.dropdownWrap, { flexShrink: 1, zIndex: 30 }],
    chip: [
      s.chip,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 17,
        borderWidth: 1,
        elevation: 1,
        minHeight: 44,
        paddingHorizontal: 11,
        paddingVertical: 10,
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
        fontSize: 13,
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
        borderRadius: 18,
        elevation: 2,
        justifyContent: 'space-between',
        minHeight: 130,
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
        color: palette.text,
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
    card: [
      s.card,
      {
        backgroundColor: '#FFFFFF',
        borderColor: palette.border,
        borderRadius: 18,
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
        color: palette.muted,
        fontSize: 12,
        fontWeight: '800',
      },
    ],
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
        shadowColor: palette.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
    ],
    assignmentTitle: [s.assignmentTitle, { color: palette.text }],
    assignmentMeta: [s.assignmentMeta, { color: palette.muted }],
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
  signalBarShort: { height: 8 },
  signalBarMedium: { height: 12 },
  signalBarTall: { height: 16 },
  signalBarFull: { height: 20 },
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
    maxHeight: Math.min(SCREEN.height - 56, 760),
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
  content: { padding: 16, paddingTop: 8, paddingBottom: 32, gap: 14 },
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
    paddingBottom: 96,
  },
  lessonHero: {
    backgroundColor: '#172235',
    borderRadius: 14,
    minHeight: 188,
    padding: 17,
  },
  lessonHeroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  lessonHeroKicker: {
    color: '#C9D8F2',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  lessonReadyPill: {
    borderColor: '#6C7789',
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
    backgroundColor: '#344052',
    borderColor: '#5B6473',
    borderRadius: 9,
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
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'visible',
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
  lessonSelectMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D4DDE9',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 16,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    shadowColor: '#172235',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    top: 68,
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
  messageComposer: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    padding: 14,
  },
  messageComposerLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  messageInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DCE3EC',
    borderRadius: 13,
    borderWidth: 1,
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 86,
    paddingHorizontal: 13,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  messageSendButton: {
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
  messageSendText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  messageThread: {
    borderTopColor: '#EEF2F7',
    borderTopWidth: 1,
    gap: 10,
    padding: 14,
  },
  messageEmptyState: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E3E8EF',
    borderRadius: 13,
    borderWidth: 1,
    padding: 14,
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
    marginTop: 7,
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
  profileCountryMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    borderWidth: 1,
    elevation: 10,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    top: 48,
    width: 174,
    zIndex: 60,
  },
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
  wizardContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  wizardScroll: { maxHeight: Math.min(SCREEN.height - 230, 610) },
  wizardInner: { gap: 16, maxWidth: 440, alignSelf: 'center', width: '100%' },
  cancelText: { color: '#667085', fontWeight: '900', fontSize: 13 },
  actionText: { color: '#F97316', fontWeight: '900', fontSize: 12 },
  wizardTitle: { color: '#07111F', fontWeight: '900', fontSize: 21, letterSpacing: 0 },
  wizardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E9EEE9',
    padding: 15,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 3,
  },
  twoCol: { flexDirection: 'row', gap: 10, zIndex: 8 },
  flexField: { flex: 1 },
  field: { gap: 7, marginBottom: 13 },
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
  textArea: { minHeight: 112, textAlignVertical: 'top' },
  selectWrap: { position: 'relative', zIndex: 8 },
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
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E3E9E3',
    overflow: 'hidden',
    zIndex: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
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

