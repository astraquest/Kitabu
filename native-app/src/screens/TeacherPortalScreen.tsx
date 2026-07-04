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
  Bell,
  CalendarCheck2,
  AlertTriangle,
  ClipboardCheck,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Home,
  MessageSquareText,
  Sparkles,
  Star,
  Target,
  UserRound,
  Users,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

import { TeacherAssignmentDetailSection } from '../components/teacher/TeacherAssignmentDetailSection';
import { TeacherAssignmentsSection } from '../components/teacher/TeacherAssignmentsSection';
import { TeacherAssignmentWizardSection } from '../components/teacher/TeacherAssignmentWizardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherSubmissionReviewSection } from '../components/teacher/TeacherSubmissionReviewSection';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { DEFAULT_GRADE, SUPPORTED_GRADES } from '../constants/grades';
import { generateAssignmentJson } from '../services/aiService';
import {
  Assignment,
  Question,
  StudentPerformance,
  StudentSubmission,
  SubmittedAssignment,
  UserProfile,
} from '../types/app';

interface TeacherPortalScreenProps {
  teacherName?: string;
  teacherEmail?: string;
  students: StudentPerformance[];
  assignments: SubmittedAssignment[];
  submissionsByAssignment: Record<string, StudentSubmission[]>;
  onPublishAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
}

type Tab = 'students' | 'assignments';
type PortalView =
  | 'dashboard'
  | 'students'
  | 'assignments'
  | 'reports'
  | 'lessonPlan'
  | 'messages'
  | 'classList'
  | 'profile';
type WizardStep = 1 | 2;
type SlideDirection = 'right' | 'bottom';

const SCREEN = Dimensions.get('window');
const TEACHER_DEFAULT_GRADE = 'Grade 10';
const TEACHER_SUBJECTS = ['Mathematics', 'English', 'Science', 'Kiswahili', 'Social Studies'];

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
      return;
    }

    translate.setValue(start);
    Animated.timing(translate, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
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
  onPublishAssignment,
}: TeacherPortalScreenProps) {
  const [tab, setTab] = useState<Tab>('students');
  const [portalView, setPortalView] = useState<PortalView>('dashboard');
  const [selectedGrade, setSelectedGrade] = useState(TEACHER_DEFAULT_GRADE);
  const [gradeFilter, setGradeFilter] = useState(TEACHER_DEFAULT_GRADE);
  const [gradeMenuOpen, setGradeMenuOpen] = useState(false);
  const [dashboardGradeMenuOpen, setDashboardGradeMenuOpen] = useState(false);
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
  const [profileName, setProfileName] = useState(getTeacherDisplayName(teacherName));
  const [profileEmail, setProfileEmail] = useState(teacherEmail || 'teacher@kitabu.ai');
  const [taughtGrades, setTaughtGrades] = useState<string[]>([TEACHER_DEFAULT_GRADE, 'Grade 9']);
  const [taughtSubjects, setTaughtSubjects] = useState<string[]>([
    'Mathematics',
    'Science',
    'English',
  ]);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    questions: Assignment['questions'];
  } | null>(null);

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

  const dashboardGradeOptions = useMemo(() => {
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
  const averageHomework = Math.round(
    students.reduce((total, current) => total + current.homeworkCompletion, 0) /
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
  const teacherDisplayName = getTeacherDisplayName(teacherName);
  const dashboardSummary = buildTeacherDashboardSummary({
    students: selectedClassStudents,
    remedialCount: selectedClassStudents.filter(item => item.assessmentScore < 70).length,
  });

  const activeSubmissionList = assignment
    ? submissionsByAssignment[assignment.id] || []
    : [];

  const questionLookup = useMemo(
    () =>
      new Map((assignment?.questions || []).map(question => [question.id, question])),
    [assignment],
  );

  useEffect(() => {
    if (dashboardGradeOptions.includes(selectedGrade)) {
      return;
    }

    const nextGrade = dashboardGradeOptions[0] || TEACHER_DEFAULT_GRADE;
    setSelectedGrade(nextGrade);
    setGradeFilter(nextGrade);
    setGrade(nextGrade);
  }, [dashboardGradeOptions, selectedGrade]);

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
      setTimeout(() => setToast(false), 3000);
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

  function openPortalSection(section: Tab) {
    setTab(section);
    setPortalView(section);
  }

  function selectTeacherGrade(value: string) {
    setSelectedGrade(value);
    setGradeFilter(value);
    setGrade(value);
    setDashboardGradeMenuOpen(false);
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
        {portalView === 'dashboard' ? (
          <ScrollView
            contentContainerStyle={s.teacherDashboardContent}
            showsVerticalScrollIndicator={false}
            style={s.teacherDashboardScroll}>
            <View style={s.teacherTopBar}>
              <BrandLogo />
              <Pressable onPress={() => setPortalView('dashboard')} style={s.bellButton}>
                <Bell color="#101014" size={28} strokeWidth={2.5} />
                <View style={s.notificationDot} />
              </Pressable>
            </View>

            <View style={s.teacherGreetingRow}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                numberOfLines={1}
                style={s.teacherGreeting}>
                Good afternoon, {teacherDisplayName} {'\uD83D\uDC4B'}
              </Text>
              <ClassSelector
                grade={selectedGrade}
                isOpen={dashboardGradeMenuOpen}
                onSelectGrade={selectTeacherGrade}
                onToggle={() => setDashboardGradeMenuOpen(open => !open)}
                options={dashboardGradeOptions}
                studentCount={dashboardSummary.studentCount}
              />
            </View>

            <Text style={s.teacherSubtitle}>
              Manage today's learning progress and support needs.
            </Text>

            <TeacherHeroCard grade={selectedGrade} mastery={dashboardSummary.mastery} />

            <TeacherQuickActions
              onAssignments={() => openPortalSection('assignments')}
              onLessonPlan={() => setPortalView('lessonPlan')}
              onMessages={() => setPortalView('messages')}
              onReports={() => setPortalView('reports')}
            />

            <View style={s.teacherCardGrid}>
              <ClassOverviewCard
                activeToday={dashboardSummary.activeToday}
                classActiveRate={dashboardSummary.classActiveRate}
                needSupport={dashboardSummary.needSupport}
                studentCount={dashboardSummary.studentCount}
              />
              <PriorityStudentsCard
                onSelectStudent={priorityStudent =>
                  setStudent(resolvePriorityStudent(priorityStudent, students))
                }
                rows={dashboardSummary.priorityStudents}
              />
              <TeacherAssignmentsCard
                assignments={dashboardSummary.assignmentRows}
                onCreateAssignment={() => setWizardOpen(true)}
              />
              <StudentGroupsCard onViewGroups={() => openPortalSection('students')} />
            </View>

            <AiTeachingNote onSendTask={() => setWizardOpen(true)} />
          </ScrollView>
        ) : portalView === 'profile' ? (
          <TeacherProfileView
            email={profileEmail}
            name={profileName}
            taughtGrades={taughtGrades}
            taughtSubjects={taughtSubjects}
            onBack={() => setPortalView('dashboard')}
            onChangeEmail={setProfileEmail}
            onChangeName={setProfileName}
            onToggleGrade={toggleTaughtGrade}
            onToggleSubject={toggleTaughtSubject}
          />
        ) : portalView === 'classList' ? (
          <SelectedClassListView
            grade={selectedGrade}
            students={selectedClassStudents}
            onBack={() => setPortalView('dashboard')}
            onSelectStudent={setStudent}
          />
        ) : portalView === 'reports' ? (
          <TeacherReportsView
            averageHomework={averageHomework}
            averageScore={averageScore}
            dashboardSummary={dashboardSummary}
            grade={selectedGrade}
            remedialCount={remedialCount}
            onBack={() => setPortalView('dashboard')}
          />
        ) : portalView === 'lessonPlan' ? (
          <TeacherLessonPlanView
            grade={selectedGrade}
            grades={dashboardGradeOptions}
            subjects={taughtSubjects}
            onBack={() => setPortalView('dashboard')}
          />
        ) : portalView === 'messages' ? (
          <TeacherMessagesView
            grade={selectedGrade}
            students={selectedClassStudents}
            onBack={() => setPortalView('dashboard')}
          />
        ) : (
          <View style={s.teacherListPortal}>
            <View style={s.listPortalHeader}>
              <Pressable onPress={() => setPortalView('dashboard')} style={s.back}>
                <ChevronLeft size={24} color="#FF4B10" />
                <Text style={s.backTextOrange}>Dashboard</Text>
              </Pressable>
              <Text style={s.headerTitle}>
                {tab === 'students' ? 'Students' : 'Assignments'}
              </Text>
              <View style={s.spacer} />
            </View>

            <View style={s.segmented}>
              {(['students', 'assignments'] as const).map(value => (
                <Pressable
                  key={value}
                  onPress={() => openPortalSection(value)}
                  style={[s.seg, tab === value && s.segActive]}>
                  <Text style={[s.segText, tab === value && s.segTextActive]}>
                    {value === 'students' ? 'Students' : 'Assignments'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView contentContainerStyle={s.content}>
              {tab === 'students' ? (
                <TeacherStudentsSection
                  styles={s}
                  gradeFilter={gradeFilter}
                  gradeMenuOpen={gradeMenuOpen}
                  sortBy={sortBy}
                  showRemedial={showRemedial}
                  averageScore={averageScore}
                  averageHomework={averageHomework}
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
                  onToggleSort={() => setSortBy(sortBy === 'name' ? 'score' : 'name')}
                  onToggleRemedial={() => setShowRemedial(value => !value)}
                  onSelectStudent={setStudent}
                />
              ) : (
                <TeacherAssignmentsSection
                  styles={s}
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

        <TeacherBottomNavigation
          activeView={portalView}
          onClassList={() => setPortalView('classList')}
          onHome={() => setPortalView('dashboard')}
          onProfile={() => setPortalView('profile')}
          onStudents={() => {
            setTab('students');
            setPortalView('students');
          }}
        />
      </View>

      {student ? (
        <StudentDetailsModal
          user={buildTeacherStudentModalUser(student)}
          assessmentScore={student.assessmentScore}
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

      <SlideOverlay visible={wizardOpen} direction="bottom" onRequestClose={closeWizard}>
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
      </SlideOverlay>

      {toast ? (
        <View style={s.toast}>
          <CheckCircle2 size={18} color="#4ADE80" />
          <Text style={s.toastText}>Assignment Published</Text>
        </View>
      ) : null}
    </View>
  );
}

interface TeacherDashboardSummary {
  activeToday: number;
  assignmentRows: { id: string; submitted: string; title: string }[];
  classActiveRate: number;
  mastery: number;
  needSupport: number;
  priorityStudents: { focus: string; id: string; name: string; priority: 'High' | 'Medium' }[];
  studentCount: number;
}

function buildTeacherDashboardSummary({
  students,
  remedialCount,
}: {
  students: StudentPerformance[];
  remedialCount: number;
}): TeacherDashboardSummary {
  const studentCount = Math.max(42, students.length);
  const priorityFallback = [
    { id: 'priority-alice', name: 'Alice Wambui', focus: 'Fractions', priority: 'High' as const },
    { id: 'priority-brian', name: 'Brian Otieno', focus: 'Respiration', priority: 'Medium' as const },
    { id: 'priority-mary', name: 'Mary Achieng', focus: 'Inference', priority: 'Medium' as const },
  ];
  const assignmentFallback = [
    { id: 'teacher-weekend-assignment', title: 'Weekend Assignment', submitted: '28 submitted' },
    { id: 'teacher-science-quiz', title: 'Science Quiz', submitted: '19 submitted' },
  ];

  return {
    activeToday: 31,
    assignmentRows: assignmentFallback,
    classActiveRate: 74,
    mastery: 78,
    needSupport: Math.max(6, remedialCount),
    priorityStudents: priorityFallback,
    studentCount,
  };
}

function resolvePriorityStudent(
  priorityStudent: TeacherDashboardSummary['priorityStudents'][number],
  students: StudentPerformance[],
): StudentPerformance {
  const matchingStudent = students.find(
    student => student.name.toLowerCase() === priorityStudent.name.toLowerCase(),
  );

  if (matchingStudent) {
    return matchingStudent;
  }

  const fallbackScore = priorityStudent.priority === 'High' ? 58 : 66;
  return {
    id: priorityStudent.id,
    name: priorityStudent.name,
    grade: 'Grade 10',
    assessmentScore: fallbackScore,
    homeworkCompletion: priorityStudent.priority === 'High' ? 52 : 68,
    lastActive: 'today',
    trend: priorityStudent.priority === 'High' ? 'Stable' : 'Improving',
    avatar: priorityStudent.name,
  };
}

function buildTeacherStudentModalUser(student: StudentPerformance): UserProfile {
  return {
    name: student.name,
    role: 'Student',
    grade: student.grade,
    email: `${student.name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'student'}@student.kitabu.ai`,
    gender: 'Not Specified',
    avatar: student.avatar,
    school: 'Greenwood High',
    phone: '',
    dateJoined: '',
    lastSeen: student.lastActive,
    status: student.trend,
  };
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

function BrandLogo() {
  return (
    <View style={s.brandWrap}>
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
      <Text style={s.brandText}>Kitabu</Text>
      <View style={s.aiBadge}>
        <Text style={s.aiBadgeText}>AI</Text>
      </View>
    </View>
  );
}

function ClassSelector({
  grade,
  isOpen,
  onSelectGrade,
  onToggle,
  options,
  studentCount,
}: {
  grade: string;
  isOpen: boolean;
  onSelectGrade: (grade: string) => void;
  onToggle: () => void;
  options: readonly string[];
  studentCount: number;
}) {
  return (
    <View style={s.classSelectorWrap}>
      <Pressable onPress={onToggle} style={s.classSelector}>
        <LinearGradient colors={['#FF4B10', '#FF7A16']} style={s.classSelectorIcon}>
          <Users color="#FFFFFF" size={13} strokeWidth={2.7} />
        </LinearGradient>
        <Text numberOfLines={1} style={s.classSelectorText}>
          {grade} {'\u2022'} {studentCount} students
        </Text>
        <ChevronDown color="#101014" size={15} strokeWidth={2.7} />
      </Pressable>
      {isOpen ? (
        <View style={s.classSelectorMenu}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,248,244,0.95)']}
            style={s.classSelectorMenuGlass}>
            {options.map(option => (
              <Pressable
                key={option}
                onPress={() => onSelectGrade(option)}
                style={[s.classSelectorMenuItem, option === grade && s.classSelectorMenuItemActive]}>
                <Text
                  style={[
                    s.classSelectorMenuText,
                    option === grade && s.classSelectorMenuTextActive,
                  ]}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </LinearGradient>
        </View>
      ) : null}
    </View>
  );
}

function TeacherHeroCard({ grade, mastery }: { grade: string; mastery: number }) {
  return (
    <LinearGradient
      colors={['#FF4620', '#FF6818', '#FFA22B']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={s.teacherHero}>
      <HeroTexture />
      <View style={s.teacherHeroCopy}>
        <Text style={s.teacherHeroTitle}>{grade} is on track</Text>
        <View style={s.teacherHeroScoreRow}>
          <Text style={s.teacherHeroScore}>{mastery}</Text>
          <Text style={s.teacherHeroPercent}>%</Text>
        </View>
        <Text style={s.teacherHeroStatus}>Class mastery average</Text>
        <View style={s.improvementPill}>
          <View style={s.improvementIcon}>
            <Text style={s.improvementArrow}>^</Text>
          </View>
          <Text style={s.improvementText}>+9% improvement this term</Text>
        </View>
      </View>
      <TeacherHeroStudentsArt />
    </LinearGradient>
  );
}

function HeroTexture() {
  return (
    <Svg height="100%" preserveAspectRatio="none" style={s.textureLayer} viewBox="0 0 394 146" width="100%">
      <Defs>
        <SvgLinearGradient id="teacherHeroGlow" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.35" />
        </SvgLinearGradient>
      </Defs>
      <Path d="M150 102C205 54 260 42 393 70" fill="none" stroke="#FFFFFF" strokeOpacity="0.78" strokeWidth="1.2" />
      <Path d="M0 124C92 76 162 68 238 100C296 124 342 115 394 96" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1" />
      <Path d="M220 126C260 67 310 42 394 24" fill="none" stroke="#FFFFFF" strokeOpacity="0.42" strokeWidth="1" />
      {Array.from({ length: 14 }).map((_, index) => (
        <Path
          key={`teacher-hero-wave-${index}`}
          d={`M210 ${138 - index * 4}C258 ${78 - index * 2} 317 ${45 - index} 404 ${42 + index * 4}`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.15"
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: 16 }).map((_, index) => (
        <Path
          key={`teacher-hero-left-wave-${index}`}
          d={`M-20 ${122 - index * 3}C54 ${90 - index * 2} 132 ${87 - index * 3} 221 ${114 - index}`}
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.11"
          strokeWidth="0.7"
        />
      ))}
      <Path d="M252 37l4 16 15 4-15 4-4 16-4-16-15-4 15-4 4-16z" fill="#FFFFFF" opacity="0.55" />
      <Path d="M306 24l2 8 8 2-8 2-2 8-2-8-8-2 8-2 2-8z" fill="#FFFFFF" opacity="0.34" />
      <Circle cx="356" cy="116" r="92" fill="url(#teacherHeroGlow)" opacity="0.55" />
    </Svg>
  );
}

function TeacherHeroStudentsArt() {
  return (
    <View pointerEvents="none" style={s.teacherHeroArt}>
      <Svg width={232} height={150} viewBox="0 0 232 150">
        <StudentFigure x={1} y={16} scale={0.8} skin="#8E4F30" hair="#1B0E0B" vest />
        <StudentFigure x={56} y={20} scale={0.82} skin="#A3653D" hair="#1B0E0B" />
        <StudentFigure x={105} y={18} scale={0.84} skin="#9B5C38" hair="#21120E" vest />
        <StudentFigure x={159} y={13} scale={0.83} skin="#7E442A" hair="#14100E" vest />
      </Svg>
    </View>
  );
}

function StudentFigure({
  hair,
  scale,
  skin,
  vest,
  x,
  y,
}: {
  hair: string;
  scale: number;
  skin: string;
  vest?: boolean;
  x: number;
  y: number;
}) {
  return (
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <Path d="M7 132c4-35 20-52 47-52s43 17 47 52H7z" fill={vest ? '#12233D' : '#F3F7FB'} />
      <Path d="M22 132c3-29 14-46 32-46s29 17 32 46H22z" fill="#F8FBFF" />
      <Path d="M45 93l9 15 9-15" fill="#FFFFFF" />
      <Path d="M50 105l7 27H44l7-27z" fill="#15315F" />
      <Path d="M56 106l22 26H66L51 110z" fill="#C8281A" opacity="0.85" />
      <Ellipse cx="54" cy="59" rx="28" ry="32" fill={skin} />
      <Circle cx="28" cy="62" r="6" fill={skin} />
      <Circle cx="80" cy="62" r="6" fill={skin} />
      <Path d="M43 69c7 6 16 6 23 0" stroke="#6F2E1A" strokeLinecap="round" strokeWidth="2.5" />
      <Path d="M44 74c6 4 15 4 21 0" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.8" />
      <Circle cx="44" cy="57" r="2.7" fill="#101014" />
      <Circle cx="64" cy="57" r="2.7" fill="#101014" />
      <Path d="M37 50c5-3 9-3 13 0" stroke="#1A0F0C" strokeLinecap="round" strokeWidth="2.8" />
      <Path d="M58 50c5-3 9-3 13 0" stroke="#1A0F0C" strokeLinecap="round" strokeWidth="2.8" />
      <Path d="M54 58c-2 6-1 10 3 13" stroke="#7A3921" strokeLinecap="round" strokeWidth="2" />
      <G fill={hair}>
        <Circle cx="24" cy="45" r="13" />
        <Circle cx="34" cy="29" r="13" />
        <Circle cx="50" cy="21" r="13" />
        <Circle cx="67" cy="24" r="13" />
        <Circle cx="79" cy="39" r="13" />
        <Circle cx="84" cy="55" r="11" />
      </G>
      <Path d="M24 52c7-20 24-29 45-20 9 4 15 12 18 25-9-11-18-17-28-17-13 9-25 12-38 10z" fill={hair} />
      {vest ? <Path d="M11 132h18l10-39c-16 8-25 21-28 39zM97 132H79L69 93c16 8 25 21 28 39z" fill="#121A29" /> : null}
    </G>
  );
}

function TeacherQuickActions({
  onAssignments,
  onLessonPlan,
  onMessages,
  onReports,
}: {
  onAssignments: () => void;
  onLessonPlan: () => void;
  onMessages: () => void;
  onReports: () => void;
}) {
  return (
    <View style={s.quickRail}>
      <QuickAction
        borderColor="#CDE4FF"
        colors={['#F4FAFF', '#EDF6FF']}
        icon={<ClipboardCheck color="#087CE4" size={35} strokeWidth={2.5} />}
        label="Assignments"
        onPress={onAssignments}
      />
      <QuickAction
        borderColor="#D8EED4"
        colors={['#FAFFF7', '#F1FAEF']}
        icon={<FileBarChart color="#22A83A" size={35} strokeWidth={2.5} />}
        label="Reports"
        onPress={onReports}
      />
      <QuickAction
        borderColor="#E2D5FF"
        colors={['#FBF9FF', '#F4F0FF']}
        icon={<CalendarCheck2 color="#8057E6" size={35} strokeWidth={2.5} />}
        label="Lesson Plan"
        onPress={onLessonPlan}
      />
      <QuickAction
        borderColor="#F4D2B7"
        colors={['#FFFDF9', '#FFF5EC']}
        icon={<MessageSquareText color="#FF7A00" size={35} strokeWidth={2.5} />}
        label="Messages"
        onPress={onMessages}
      />
    </View>
  );
}

function TeacherProfileView({
  email,
  name,
  taughtGrades,
  taughtSubjects,
  onBack,
  onChangeEmail,
  onChangeName,
  onToggleGrade,
  onToggleSubject,
}: {
  email: string;
  name: string;
  taughtGrades: string[];
  taughtSubjects: string[];
  onBack: () => void;
  onChangeEmail: (value: string) => void;
  onChangeName: (value: string) => void;
  onToggleGrade: (value: string) => void;
  onToggleSubject: (value: string) => void;
}) {
  return (
    <View style={s.teacherListPortal}>
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Dashboard</Text>
        </Pressable>
        <Text style={s.headerTitle}>Teacher Profile</Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.profileHero}>
          <LinearGradient colors={['#FF4B10', '#FF7A16']} style={s.profileAvatar}>
            <UserRound color="#FFFFFF" size={30} strokeWidth={2.7} />
          </LinearGradient>
          <View style={s.rowMain}>
            <Text style={s.profileName}>{name || 'Teacher'}</Text>
            <Text style={s.profileMeta}>{email}</Text>
          </View>
        </View>

        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>Personal Details</Text>
          </View>
          <View style={s.profileField}>
            <Text style={s.profileLabel}>Full name</Text>
            <TextInput
              onChangeText={onChangeName}
              placeholder="Teacher name"
              style={s.profileInput}
              value={name}
            />
          </View>
          <View style={s.profileField}>
            <Text style={s.profileLabel}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={onChangeEmail}
              placeholder="teacher@kitabu.ai"
              style={s.profileInput}
              value={email}
            />
          </View>
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

function SelectedClassListView({
  grade,
  students,
  onBack,
  onSelectStudent,
}: {
  grade: string;
  students: StudentPerformance[];
  onBack: () => void;
  onSelectStudent: (student: StudentPerformance) => void;
}) {
  return (
    <View style={s.teacherListPortal}>
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Dashboard</Text>
        </Pressable>
        <Text style={s.headerTitle}>{grade} List</Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardHeaderText}>Selected Class Students</Text>
            <Text style={s.cardHeaderMeta}>{students.length} learners</Text>
          </View>
          {students.length > 0 ? (
            students.map(item => (
              <Pressable key={item.id} onPress={() => onSelectStudent(item)} style={s.row}>
                <View style={s.rowLead}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={s.rowMain}>
                    <Text style={s.rowTitle}>{item.name}</Text>
                    <Text style={s.rowMeta}>
                      {item.trend} | Last active {item.lastActive}
                    </Text>
                  </View>
                </View>
                <View style={s.rowEndTight}>
                  <Text style={s.score}>{item.assessmentScore}%</Text>
                  <ChevronRight size={16} color="#9CA3AF" />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyText}>No students found for {grade}.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function TeacherReportsView({
  averageHomework,
  averageScore,
  dashboardSummary,
  grade,
  remedialCount,
  onBack,
}: {
  averageHomework: number;
  averageScore: number;
  dashboardSummary: TeacherDashboardSummary;
  grade: string;
  remedialCount: number;
  onBack: () => void;
}) {
  return (
    <TeacherSimplePortalView title="Reports" onBack={onBack}>
      <View style={s.grid}>
        <View style={s.metric}>
          <Text style={s.metricLabel}>{grade} Mastery</Text>
          <Text style={s.metricValue}>{averageScore}%</Text>
          <Text style={s.metricSubline}>Class mastery average</Text>
        </View>
        <View style={s.metric}>
          <Text style={s.metricLabel}>Homework</Text>
          <Text style={s.metricValue}>{averageHomework}%</Text>
          <Text style={s.metricSubline}>Recent assignment completion</Text>
        </View>
      </View>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardHeaderText}>Support Snapshot</Text>
          <Text style={s.cardHeaderMeta}>{remedialCount} need support</Text>
        </View>
        {dashboardSummary.priorityStudents.map(item => (
          <View key={item.id} style={s.row}>
            <View style={s.rowMain}>
              <Text style={s.rowTitle}>{item.name}</Text>
              <Text style={s.rowMeta}>{item.focus}</Text>
            </View>
            <Text style={[s.score, item.priority === 'High' ? s.badText : s.warnText]}>
              {item.priority}
            </Text>
          </View>
        ))}
      </View>
    </TeacherSimplePortalView>
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
    setOpenSelect(null);
  }

  function generatePlan() {
    setTopic(current => current.trim() || 'Linear equations and real-life problems');
    setOutcome(
      current =>
        current.trim() ||
        'Learners solve simple linear equations and explain each step using a real-life example.',
    );
    setReady(true);
    setStatus('idle');
    setOpenSelect(null);
  }

  return (
    <View style={s.teacherListPortal}>
      <View style={s.listPortalHeader}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#FF4B10" />
          <Text style={s.backTextOrange}>Dashboard</Text>
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
            <Pressable onPress={generatePlan} style={s.lessonGenerateButton}>
              <Text style={s.lessonGenerateText}>Generate Plan</Text>
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
          <View style={s.lessonActionRow}>
            <Pressable
              onPress={() => setStatus('shared')}
              style={[s.lessonShareButton, status === 'shared' && s.lessonShareButtonActive]}>
              <Text style={s.lessonShareText}>{status === 'shared' ? 'Shared' : 'Share'}</Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus('saved')}
              style={[s.lessonSaveButton, status === 'saved' && s.lessonSaveButtonActive]}>
              <Text style={s.lessonSaveText}>{status === 'saved' ? 'Saved' : 'Save Plan'}</Text>
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
  return (
    <TeacherSimplePortalView title="Messages" onBack={onBack}>
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardHeaderText}>{grade} Parent Messages</Text>
          <Text style={s.cardHeaderMeta}>{students.length} learners</Text>
        </View>
        <View style={s.row}>
          <View style={s.rowMain}>
            <Text style={s.rowTitle}>Weekly progress update</Text>
            <Text style={s.rowMeta}>Send summary to all parents in the selected class.</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </View>
        <View style={s.row}>
          <View style={s.rowMain}>
            <Text style={s.rowTitle}>Support follow-up</Text>
            <Text style={s.rowMeta}>{supportCount} learners currently need extra support.</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
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
          <Text style={s.backTextOrange}>Dashboard</Text>
        </Pressable>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={s.spacer} />
      </View>
      <ScrollView contentContainerStyle={s.content}>{children}</ScrollView>
    </View>
  );
}

function QuickAction({
  borderColor,
  colors,
  icon,
  label,
  onPress,
}: {
  borderColor: string;
  colors: [string, string];
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={s.quickAction}>
      <LinearGradient colors={colors} style={[s.quickIconBox, { borderColor }]}>
        {icon}
      </LinearGradient>
      <Text style={s.quickLabel}>{label}</Text>
    </Pressable>
  );
}

function TeacherDashboardCard({
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
  return (
    <View style={[s.teacherDashboardCard, { borderColor }]}>
      <CardTexture accent={accent} />
      <View style={s.teacherDashboardCardHeader}>
        <View style={[s.teacherCardIconBadge, { backgroundColor: accent }]}>
          {title === 'Class Overview' ? (
            <Users color="#FFFFFF" size={19} strokeWidth={2.5} />
          ) : title === 'Priority Students' ? (
            <Target color="#FFFFFF" size={19} strokeWidth={2.5} />
          ) : title === 'Assignments' ? (
            <ClipboardList color="#FFFFFF" size={19} strokeWidth={2.5} />
          ) : (
            <Users color="#FFFFFF" size={18} strokeWidth={2.5} />
          )}
        </View>
        <Text numberOfLines={1} style={[s.teacherCardTitle, { color: accent }]}>
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function ClassOverviewCard({
  activeToday,
  classActiveRate,
  needSupport,
  studentCount,
}: {
  activeToday: number;
  classActiveRate: number;
  needSupport: number;
  studentCount: number;
}) {
  return (
    <TeacherDashboardCard accent="#1388F2" borderColor="#9CC9FF" title="Class Overview">
      <ClassMetric
        icon={<Users color="#1388F2" size={22} strokeWidth={2.5} />}
        iconTone="#E8F4FF"
        label="Students"
        value={String(studentCount)}
      />
      <ClassMetric
        icon={<CheckCircle2 color="#FFFFFF" size={21} strokeWidth={2.8} />}
        iconTone="#38C43B"
        label="Active today"
        value={String(activeToday)}
      />
      <ClassMetric
        icon={<AlertTriangle color="#FFFFFF" size={20} strokeWidth={2.7} />}
        iconTone="#FF4B2C"
        label="Need support"
        value={String(needSupport)}
      />
      <View style={s.teacherProgressBarTrack}>
        <LinearGradient colors={['#0A7CFF', '#129AFF']} style={[s.teacherProgressBarFill, { width: `${classActiveRate}%` }]} />
      </View>
      <View style={s.classGoalRow}>
        <Text style={s.classGoalText}>{classActiveRate}% of class active</Text>
        <Text style={s.classGoalText}>Goal: 85%</Text>
      </View>
    </TeacherDashboardCard>
  );
}

function ClassMetric({
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
    <View style={s.classMetricRow}>
      <View style={[s.classMetricIcon, { backgroundColor: iconTone }]}>{icon}</View>
      <View>
        <Text style={s.classMetricValue}>{value}</Text>
        <Text style={s.classMetricLabel}>{label}</Text>
      </View>
    </View>
  );
}

function PriorityStudentsCard({
  onSelectStudent,
  rows,
}: {
  onSelectStudent: (student: TeacherDashboardSummary['priorityStudents'][number]) => void;
  rows: TeacherDashboardSummary['priorityStudents'];
}) {
  return (
    <TeacherDashboardCard accent="#F22626" borderColor="#FFB7B7" title="Priority Students">
      <View style={s.priorityRows}>
        {rows.map(row => (
          <Pressable key={row.id} onPress={() => onSelectStudent(row)} style={s.priorityRow}>
            <View style={s.priorityCopy}>
              <Text numberOfLines={1} style={s.priorityName}>{row.name}</Text>
              <Text style={s.priorityMeta}>{row.focus}</Text>
            </View>
            <View style={[s.priorityBadge, row.priority === 'High' ? s.priorityHigh : s.priorityMedium]}>
              <Text style={[s.priorityText, row.priority === 'High' ? s.priorityHighText : s.priorityMediumText]}>
                {row.priority}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable style={s.redActionButton}>
        <LinearGradient colors={['#FA3228', '#EF1F27']} style={s.redActionGradient}>
          <Text style={s.redActionText}>Open Support Plan</Text>
        </LinearGradient>
      </Pressable>
    </TeacherDashboardCard>
  );
}

function TeacherAssignmentsCard({
  assignments,
  onCreateAssignment,
}: {
  assignments: TeacherDashboardSummary['assignmentRows'];
  onCreateAssignment: () => void;
}) {
  return (
    <TeacherDashboardCard accent="#7446DD" borderColor="#D7C1FF" title="Assignments">
      <View style={s.teacherAssignmentRows}>
        {assignments.map(item => (
          <View key={item.id} style={s.teacherAssignmentItem}>
            <View style={s.teacherAssignmentIconBox}>
              <ClipboardList color="#7446DD" size={18} strokeWidth={2.5} />
            </View>
            <View style={s.teacherAssignmentTextWrap}>
              <Text numberOfLines={1} style={s.teacherAssignmentTitle}>{item.title}</Text>
              <Text style={s.teacherAssignmentMeta}>{item.submitted}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable onPress={onCreateAssignment} style={s.teacherActionLink}>
        <Text style={s.teacherActionLinkText}>Create assignment</Text>
        <ChevronRight color="#7446DD" size={22} strokeWidth={2.7} />
      </Pressable>
    </TeacherDashboardCard>
  );
}

function StudentGroupsCard({ onViewGroups }: { onViewGroups: () => void }) {
  const groups = [
    { color: '#16A34A', icon: <Star color="#16A34A" size={18} strokeWidth={2.4} />, label: 'Top performers', value: 12 },
    { color: '#FF7A00', icon: <UserRound color="#FF7A00" size={18} strokeWidth={2.4} />, label: 'Needs remedial', value: 6 },
    { color: '#55565D', icon: <UserRound color="#55565D" size={18} strokeWidth={2.4} />, label: 'Inactive learners', value: 4 },
  ];

  return (
    <TeacherDashboardCard accent="#1FAA2B" borderColor="#9EDC8C" title="Student Groups">
      <View style={s.groupRows}>
        {groups.map(group => (
          <Pressable key={group.label} style={s.groupRow}>
            <View style={s.groupIconCell}>{group.icon}</View>
            <Text numberOfLines={1} style={s.groupText}>{group.label}</Text>
            <Text style={s.groupCount}>{group.value}</Text>
            <ChevronRight color="#202125" size={17} strokeWidth={2.4} />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onViewGroups} style={s.groupViewButton}>
        <Text style={s.groupViewText}>View all groups</Text>
        <ChevronRight color="#11891E" size={21} strokeWidth={2.7} />
      </Pressable>
    </TeacherDashboardCard>
  );
}

function AiTeachingNote({ onSendTask }: { onSendTask: () => void }) {
  return (
    <View style={s.aiNote}>
      <CardTexture accent="#FF7A16" opacity={0.16} />
      <View style={s.aiTitleRow}>
        <LinearGradient colors={['#FF4B10', '#FF890C']} style={s.aiIcon}>
          <Sparkles color="#FFFFFF" size={18} strokeWidth={2.7} />
        </LinearGradient>
        <Text style={s.aiTitle}>AI Teaching Note</Text>
      </View>
      <View style={s.aiCopyRow}>
        <Text style={s.aiBody}>
          6 learners struggled with fractions today.{'\n'}Send a 10-minute revision task?
        </Text>
        <Pressable onPress={onSendTask} style={s.sendTaskButton}>
          <Text style={s.sendTaskText}>Send Task</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CardTexture({ accent, opacity = 0.13 }: { accent: string; opacity?: number }) {
  return (
    <Svg height="100%" preserveAspectRatio="none" style={s.textureLayer} viewBox="0 0 188 180" width="100%">
      {Array.from({ length: 8 }).map((_, index) => (
        <Path
          key={`teacher-card-curve-${index}`}
          d={`M92 ${-14 + index * 5}C130 ${12 + index * 2} 161 ${24 + index * 6} 203 ${15 + index * 11}`}
          fill="none"
          stroke={accent}
          strokeOpacity={opacity}
          strokeWidth="0.8"
        />
      ))}
      {Array.from({ length: 8 }).map((_, index) => (
        <Path
          key={`teacher-card-bottom-${index}`}
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

function TeacherBottomNavigation({
  activeView,
  onClassList,
  onHome,
  onProfile,
  onStudents,
}: {
  activeView: PortalView;
  onClassList: () => void;
  onHome: () => void;
  onProfile: () => void;
  onStudents: () => void;
}) {
  return (
    <View style={s.teacherBottomNav}>
      <TeacherNavItem active={activeView === 'dashboard'} icon={<Home />} label="Home" onPress={onHome} />
      <TeacherNavItem active={activeView === 'students'} icon={<Users />} label="Students" onPress={onStudents} />
      <TeacherNavItem active={activeView === 'classList'} icon={<ClipboardList />} label="Class List" onPress={onClassList} />
      <TeacherNavItem active={activeView === 'profile'} icon={<UserRound />} label="Profile" onPress={onProfile} />
    </View>
  );
}

function TeacherNavItem({
  active,
  icon,
  label,
  onPress,
}: {
  active?: boolean;
  icon: React.ReactElement<{ color?: string; size?: number; strokeWidth?: number }>;
  label: string;
  onPress?: () => void;
}) {
  const color = active ? '#FF4B10' : '#5B5C61';
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={s.teacherNavItem}>
      <View style={[s.teacherNavIndicator, active && s.teacherNavIndicatorActive]} />
      {React.cloneElement(icon, { color, size: 27, strokeWidth: active ? 3 : 2.6 })}
      <Text style={[s.teacherNavLabel, active && s.teacherNavLabelActive]}>{label}</Text>
    </Pressable>
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
  headerTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
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
  profileHero: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFE0D2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
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
  profileField: {
    borderTopColor: '#F3F4F6',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  wizardRoot: { flex: 1, backgroundColor: '#F2F2F7' },
  wizardHead: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wizardContent: { padding: 16, paddingBottom: 120 },
  wizardInner: { gap: 24, maxWidth: 440, alignSelf: 'center', width: '100%' },
  cancelText: { color: '#6B7280', fontWeight: '500', fontSize: 14 },
  actionText: { color: '#2563EB', fontWeight: '800', fontSize: 14 },
  center: { alignItems: 'center', paddingVertical: 8 },
  emoji: { fontSize: 36, marginBottom: 6 },
  wizardTitle: { color: '#111827', fontWeight: '800', fontSize: 18 },
  twoCol: { flexDirection: 'row', gap: 12, zIndex: 6 },
  flexField: { flex: 1 },
  field: { gap: 6, marginBottom: 14 },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: { minHeight: 128, textAlignVertical: 'top' },
  selectWrap: { position: 'relative', zIndex: 6 },
  selectField: {
    minHeight: 50,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: { color: '#111827', fontSize: 14, fontWeight: '700', flexShrink: 1 },
  selectMenu: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    zIndex: 12,
  },
  generate: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateDisabled: { backgroundColor: '#D1D5DB' },
  editorStack: { gap: 16, maxWidth: 440, alignSelf: 'center', width: '100%' },
  titleInput: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 0,
    marginTop: 8,
  },
  descInput: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
    minHeight: 64,
    textAlignVertical: 'top',
    paddingVertical: 0,
    marginTop: 8,
  },
  questionCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    position: 'relative',
  },
  typeBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    color: '#6B7280',
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
  optionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2563EB' },
  optionInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  addOptionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12 },
  addOptionText: { color: '#1D4ED8', fontSize: 11, fontWeight: '800' },
  answerKeyCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
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
