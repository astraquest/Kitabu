import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Users,
} from 'lucide-react-native';

import { TeacherAssignmentDetailSection } from '../components/teacher/TeacherAssignmentDetailSection';
import { TeacherAssignmentsSection } from '../components/teacher/TeacherAssignmentsSection';
import { TeacherAssignmentWizardSection } from '../components/teacher/TeacherAssignmentWizardSection';
import { TeacherStudentsSection } from '../components/teacher/TeacherStudentsSection';
import { TeacherSubmissionReviewSection } from '../components/teacher/TeacherSubmissionReviewSection';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { DEFAULT_GRADE } from '../constants/grades';
import { generateAssignmentJson } from '../services/aiService';
import {
  Assignment,
  Question,
  StudentPerformance,
  StudentSubmission,
  SubmittedAssignment,
} from '../types/app';

interface TeacherPortalScreenProps {
  onBack: () => void;
  onOpenStudentPreview: () => void;
  students: StudentPerformance[];
  assignments: SubmittedAssignment[];
  submissionsByAssignment: Record<string, StudentSubmission[]>;
  onPublishAssignment: (assignment: Omit<Assignment, 'id' | 'status'>) => Promise<void>;
}

type Tab = 'students' | 'assignments';
type WizardStep = 1 | 2;
type SlideDirection = 'right' | 'bottom';

const SCREEN = Dimensions.get('window');

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
  onBack,
  onOpenStudentPreview,
  students,
  assignments,
  submissionsByAssignment,
  onPublishAssignment,
}: TeacherPortalScreenProps) {
  const [tab, setTab] = useState<Tab>('students');
  const [gradeFilter, setGradeFilter] = useState('All');
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

  const activeSubmissionList = assignment
    ? submissionsByAssignment[assignment.id] || []
    : [];

  const questionLookup = useMemo(
    () =>
      new Map((assignment?.questions || []).map(question => [question.id, question])),
    [assignment],
  );

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

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.back}>
          <ChevronLeft size={24} color="#1D4ED8" />
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Teacher's Portal</Text>
        <View style={s.spacer} />
      </View>

      <View style={s.heroCard}>
        <View style={s.heroCopy}>
          <Text style={s.heroEyebrow}>Class Operations</Text>
          <Text style={s.heroTitle}>Supported grades readiness dashboard</Text>
          <Text style={s.heroBody}>
            Track mastery, remedial attention, and assignment follow-through from one teacher view.
          </Text>
        </View>
        <View style={s.heroAside}>
          <View style={s.healthBadge}>
            <Text style={s.healthValue}>{averageScore}%</Text>
            <Text style={s.healthLabel}>Class avg</Text>
          </View>
          <Pressable onPress={onOpenStudentPreview} style={s.heroButton}>
            <Eye size={14} color="#1D4ED8" />
            <Text style={s.heroButtonText}>Preview</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.summaryStrip}>
        <View style={s.summaryItem}>
          <Users size={16} color="#1D4ED8" />
          <View>
            <Text style={s.summaryValue}>{students.length}</Text>
            <Text style={s.summaryLabel}>Learners</Text>
          </View>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <AlertTriangle size={16} color={remedialCount > 0 ? '#B45309' : '#15803D'} />
          <View>
            <Text style={s.summaryValue}>{remedialCount}</Text>
            <Text style={s.summaryLabel}>Need support</Text>
          </View>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryItem}>
          <ClipboardList size={16} color="#0F766E" />
          <View>
            <Text style={s.summaryValue}>{openAssignmentCount}</Text>
            <Text style={s.summaryLabel}>Open work</Text>
          </View>
        </View>
      </View>

      <View style={s.segmented}>
        {(['students', 'assignments'] as const).map(value => (
          <Pressable
            key={value}
            onPress={() => setTab(value)}
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

      {student ? (
        <StudentDetailsModal
          user={{
            name: student.name,
            role: 'Student',
            grade: student.grade,
            email: '',
            gender: 'Not Specified',
            avatar: student.avatar,
            school: '',
            phone: '',
            dateJoined: '',
            lastSeen: student.lastActive,
            status: student.trend,
          }}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F7F9' },
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
