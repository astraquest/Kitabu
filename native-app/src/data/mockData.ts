import {
  Assignment,
  Book,
  Flashcard,
  LearningStrand,
  Podcast,
  Question,
  SchoolData,
  StudentPerformance,
  StudentSubmission,
  Subject,
  SubmittedAssignment,
  UserProfile,
  ParentChildSummary,
} from '../types/app';

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Mathematics',
    colorFrom: '#9333EA',
    colorTo: '#6D28D9',
  },
  {
    id: 'english',
    name: 'English',
    colorFrom: '#2563EB',
    colorTo: '#4338CA',
  },
  {
    id: 'science',
    name: 'Science',
    colorFrom: '#059669',
    colorTo: '#0F766E',
  },
  {
    id: 'kiswahili',
    name: 'Kiswahili',
    colorFrom: '#D97706',
    colorTo: '#C2410C',
  },
  {
    id: 'social',
    name: 'Social Studies',
    colorFrom: '#DC2626',
    colorTo: '#BE123C',
  },
  {
    id: 'ai_education',
    name: 'AI Education',
    colorFrom: '#0F172A',
    colorTo: '#2563EB',
  },
];

export const INITIAL_CURRICULUM_DATA: Record<string, LearningStrand[]> = {};
export const FALLBACK_STRAND: LearningStrand = {
  id: 'strand-empty',
  title: 'No Curriculum Available',
  subTitle: 'Curriculum content has not been published yet.',
  subStrands: [],
};
export const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'sample-homework-math-fractions',
    title: 'Fractions and Decimals Practice',
    subject: 'Mathematics',
    description: 'Convert fractions to decimals and compare values using real classroom examples.',
    gradeLevel: 'Grade 6',
    dueDate: '2026-06-24',
    status: 'pending',
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'Which decimal is equal to 3/4?',
        options: ['0.25', '0.5', '0.75', '1.25'],
        correctAnswer: '0.75',
        explanation: 'Divide 3 by 4 to get 0.75.',
      },
      {
        id: 2,
        type: 'TRUE_FALSE',
        text: '0.6 is greater than 2/3.',
        correctAnswer: 'False',
        explanation: '2/3 is approximately 0.67, which is greater than 0.6.',
      },
      {
        id: 3,
        type: 'SHORT_ANSWER',
        text: 'Explain one way to compare 5/8 and 0.7.',
        correctAnswer: 'Convert 5/8 to 0.625, then compare it with 0.7.',
        explanation: 'Changing both values to decimals makes the comparison direct.',
      },
    ],
  },
  {
    id: 'sample-homework-science-cells',
    title: 'Cells and Body Systems',
    subject: 'Science',
    description: 'Review cell parts and how body systems work together to keep organisms alive.',
    gradeLevel: 'Grade 6',
    dueDate: '2026-06-26',
    status: 'pending',
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'Which cell part controls most cell activities?',
        options: ['Nucleus', 'Cell wall', 'Cytoplasm', 'Vacuole'],
        correctAnswer: 'Nucleus',
        explanation: 'The nucleus contains genetic material and controls cell activities.',
      },
      {
        id: 2,
        type: 'MCQ',
        text: 'Which system carries oxygen and nutrients around the body?',
        options: ['Digestive system', 'Circulatory system', 'Skeletal system', 'Excretory system'],
        correctAnswer: 'Circulatory system',
        explanation: 'Blood in the circulatory system transports oxygen and nutrients.',
      },
      {
        id: 3,
        type: 'SHORT_ANSWER',
        text: 'Name one way the respiratory and circulatory systems work together.',
        correctAnswer: 'The respiratory system brings oxygen into the lungs, and blood carries it to body cells.',
        explanation: 'The lungs and blood vessels work together to supply oxygen to cells.',
      },
    ],
  },
  {
    id: 'sample-homework-english-reading',
    title: 'Reading Comprehension Check',
    subject: 'English',
    description: 'Identify main ideas, supporting details, and the best evidence from a short passage.',
    gradeLevel: 'Grade 6',
    dueDate: '2026-06-28',
    status: 'completed',
    score: 82,
    submittedDate: '2026-06-18',
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'What is the main idea of a paragraph?',
        options: ['A small detail', 'The central point', 'A new vocabulary word', 'The final punctuation mark'],
        correctAnswer: 'The central point',
        userAnswer: 'The central point',
        explanation: 'The main idea is what the paragraph is mostly about.',
      },
      {
        id: 2,
        type: 'TRUE_FALSE',
        text: 'Evidence from a text should support your answer.',
        correctAnswer: 'True',
        userAnswer: 'True',
        explanation: 'Good answers use evidence that directly supports the point.',
      },
      {
        id: 3,
        type: 'SHORT_ANSWER',
        text: 'Write one sentence explaining why evidence matters.',
        correctAnswer: 'Evidence shows that an answer is based on the text.',
        userAnswer: 'It proves the answer comes from what I read.',
        explanation: 'Evidence connects your answer to the passage.',
      },
    ],
  },
  {
    id: 'sample-homework-kiswahili-insha',
    title: 'Uandishi wa Insha Fupi',
    subject: 'Kiswahili',
    description: 'Jibu maswali kuhusu mpangilio wa insha na matumizi sahihi ya msamiati.',
    gradeLevel: 'Grade 6',
    dueDate: '2026-06-30',
    status: 'pending',
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'Sehemu ya kwanza ya insha huitwaje?',
        options: ['Hitimisho', 'Mwili', 'Utangulizi', 'Marejeleo'],
        correctAnswer: 'Utangulizi',
        explanation: 'Utangulizi humwelekeza msomaji kwenye mada ya insha.',
      },
      {
        id: 2,
        type: 'TRUE_FALSE',
        text: 'Hitimisho linapaswa kurudia wazo kuu kwa ufupi.',
        correctAnswer: 'True',
        explanation: 'Hitimisho hufunga insha kwa kusisitiza hoja muhimu.',
      },
      {
        id: 3,
        type: 'SHORT_ANSWER',
        text: 'Taja sifa moja ya aya nzuri.',
        correctAnswer: 'Aya nzuri huwa na wazo moja kuu na sentensi zinazoliunga mkono.',
        explanation: 'Aya iliyo wazi husaidia msomaji kufuata hoja.',
      },
    ],
  },
  {
    id: 'sample-homework-social-counties',
    title: 'Kenya Counties and Resources',
    subject: 'Social Studies',
    description: 'Match counties with natural resources and explain how communities use them.',
    gradeLevel: 'Grade 6',
    dueDate: '2026-07-02',
    status: 'pending',
    questions: [
      {
        id: 1,
        type: 'MCQ',
        text: 'Which county is well known for tea farming in Kenya?',
        options: ['Kericho', 'Mombasa', 'Turkana', 'Garissa'],
        correctAnswer: 'Kericho',
        explanation: 'Kericho has a cool, wet climate that supports tea farming.',
      },
      {
        id: 2,
        type: 'TRUE_FALSE',
        text: 'Fishing is an important economic activity around Lake Victoria.',
        correctAnswer: 'True',
        explanation: 'Communities around Lake Victoria rely on fishing for income and food.',
      },
      {
        id: 3,
        type: 'SHORT_ANSWER',
        text: 'Give one reason natural resources should be conserved.',
        correctAnswer: 'Conservation keeps resources available for future use.',
        explanation: 'Responsible use protects livelihoods and the environment.',
      },
    ],
  },
];

export const INITIAL_SCHOOLS: SchoolData[] = [
  {
    id: 'mock-school-green-valley',
    name: 'Green Valley Junior School',
    status: 'Active',
    location: 'Nairobi, Kenya',
    totalStudents: 10,
    email: 'admin@greenvalley.example',
    phone: '+254700000111',
    principal: 'Mrs. Ruth Wanjiku',
    gradeCounts: {
      'Grade 4': 1,
      'Grade 5': 1,
      'Grade 6': 2,
      'Grade 7': 1,
      'Grade 8': 1,
      'Grade 9': 1,
      'Grade 10': 1,
      'Form 3': 1,
      'Form 4': 1,
    },
  },
];
export const INITIAL_BOOKS: Book[] = [];
export const INITIAL_FLASHCARDS: Flashcard[] = [];
export const INITIAL_QUIZ_QUESTIONS: Question[] = [];
export const INITIAL_PODCASTS: Podcast[] = [];
export const INITIAL_TEACHER_STUDENTS: StudentPerformance[] = [
  {
    id: 'student-amina-otieno',
    name: 'Amina Otieno',
    grade: 'Grade 6',
    assessmentScore: 91,
    homeworkCompletion: 96,
    lastActive: 'today',
    trend: 'Excellent',
    avatar: 'AO',
  },
  {
    id: 'student-brian-mutua',
    name: 'Brian Mutua',
    grade: 'Grade 6',
    assessmentScore: 74,
    homeworkCompletion: 82,
    lastActive: 'yesterday',
    trend: 'Improving',
    avatar: 'BM',
  },
  {
    id: 'student-chebet-kiptoo',
    name: 'Chebet Kiptoo',
    grade: 'Grade 9',
    assessmentScore: 63,
    homeworkCompletion: 58,
    lastActive: '2 days ago',
    trend: 'Stable',
    avatar: 'CK',
  },
  {
    id: 'student-fatuma-hassan',
    name: 'Fatuma Hassan',
    grade: 'Grade 5',
    assessmentScore: 82,
    homeworkCompletion: 88,
    lastActive: 'today',
    trend: 'Improving',
    avatar: 'FH',
  },
  {
    id: 'student-david-mwangi',
    name: 'David Mwangi',
    grade: 'Grade 4',
    assessmentScore: 86,
    homeworkCompletion: 90,
    lastActive: 'today',
    trend: 'Improving',
    avatar: 'DM',
  },
  {
    id: 'student-george-odhiambo',
    name: 'George Odhiambo',
    grade: 'Grade 7',
    assessmentScore: 78,
    homeworkCompletion: 73,
    lastActive: 'yesterday',
    trend: 'Stable',
    avatar: 'GO',
  },
  {
    id: 'student-hannah-cheruiyot',
    name: 'Hannah Cheruiyot',
    grade: 'Grade 8',
    assessmentScore: 69,
    homeworkCompletion: 71,
    lastActive: '3 days ago',
    trend: 'Improving',
    avatar: 'HC',
  },
  {
    id: 'student-ian-kariuki',
    name: 'Ian Kariuki',
    grade: 'Grade 10',
    assessmentScore: 84,
    homeworkCompletion: 80,
    lastActive: 'today',
    trend: 'Excellent',
    avatar: 'IK',
  },
  {
    id: 'student-joy-muthoni',
    name: 'Joy Muthoni',
    grade: 'Form 3',
    assessmentScore: 72,
    homeworkCompletion: 66,
    lastActive: '2 days ago',
    trend: 'Stable',
    avatar: 'JM',
  },
  {
    id: 'student-eunice-akinyi',
    name: 'Eunice Akinyi',
    grade: 'Form 4',
    assessmentScore: 55,
    homeworkCompletion: 44,
    lastActive: '4 days ago',
    trend: 'Stable',
    avatar: 'EA',
  },
];

export const INITIAL_SUBMITTED_ASSIGNMENTS: SubmittedAssignment[] = INITIAL_ASSIGNMENTS.map(
  (assignment, index) => ({
    ...assignment,
    submittedCount:
      index === 2 ? INITIAL_TEACHER_STUDENTS.length : Math.max(2, INITIAL_TEACHER_STUDENTS.length - index),
    totalStudents: INITIAL_TEACHER_STUDENTS.length,
    averageScore: [88, 76, 82, 71, 79][index] ?? 80,
    dateSent: ['2026-06-17', '2026-06-18', '2026-06-15', '2026-06-19', '2026-06-20'][index] ?? '2026-06-18',
  }),
);

function buildSubmission(
  student: StudentPerformance,
  assignment: Assignment,
  score: number,
  status: StudentSubmission['status'],
): StudentSubmission {
  return {
    studentId: student.id,
    studentName: student.name,
    avatar: student.avatar,
    score,
    status,
    answers: assignment.questions.map((question, index) => ({
      questionId: question.id,
      question: question.text,
      answer:
        status === 'Pending'
          ? ''
          : String(index === 1 && score < 70 ? 'Needs review' : question.correctAnswer ?? 'Submitted answer'),
      isCorrect: status !== 'Pending' && !(index === 1 && score < 70),
    })),
  };
}

export const INITIAL_SUBMISSIONS_BY_ASSIGNMENT: Record<string, StudentSubmission[]> =
  INITIAL_ASSIGNMENTS.reduce<Record<string, StudentSubmission[]>>((acc, assignment, assignmentIndex) => {
    const scoresByAssignment = [
      [96, 84, 68, 91, 60],
      [89, 78, 62, 86, 55],
      [94, 80, 72, 88, 76],
      [87, 74, 58, 82, 0],
      [92, 70, 64, 85, 0],
    ];
    const statusesByAssignment: StudentSubmission['status'][][] = [
      ['Completed', 'Completed', 'Late', 'Completed', 'Late'],
      ['Completed', 'Completed', 'Late', 'Completed', 'Pending'],
      ['Completed', 'Completed', 'Completed', 'Completed', 'Completed'],
      ['Completed', 'Completed', 'Late', 'Completed', 'Pending'],
      ['Completed', 'Late', 'Late', 'Completed', 'Pending'],
    ];

    acc[assignment.id] = INITIAL_TEACHER_STUDENTS.map((student, studentIndex) =>
      buildSubmission(
        student,
        assignment,
        scoresByAssignment[assignmentIndex]?.[studentIndex] ?? 75,
        statusesByAssignment[assignmentIndex]?.[studentIndex] ?? 'Completed',
      ),
    );
    return acc;
  }, {});

export const INITIAL_PARENT_CHILDREN: ParentChildSummary[] = INITIAL_TEACHER_STUDENTS.map(
  (student, index) => ({
    id: student.id,
    name: student.name,
    email: `${student.name.toLowerCase().replace(/\s+/g, '.')}@students.kitabu.example`,
    grade: student.grade,
    school: 'Green Valley Junior School',
    relationship: index < 2 ? 'Child' : 'Linked learner',
    assessment_average: student.assessmentScore,
    homework_completion: student.homeworkCompletion,
    completed_lessons: [18, 14, 9, 16, 12, 11, 10, 15, 13, 7][index] ?? 8,
    total_lessons: 20,
    mastery_average: Math.max(45, student.assessmentScore - 4),
    due_reviews: [1, 2, 4, 1, 2, 3, 3, 1, 2, 5][index] ?? 2,
    last_active: student.lastActive,
    diagnostic: {
      completed: index !== 4,
      percentage: index === 4 ? null : student.assessmentScore,
      completedAt: index === 4 ? null : '2026-06-16',
    },
    recent_assignments: INITIAL_ASSIGNMENTS.slice(0, 4).map(assignment => {
      const submission = INITIAL_SUBMISSIONS_BY_ASSIGNMENT[assignment.id]?.[index];
      return {
        id: assignment.id,
        title: assignment.title,
        subject: assignment.subject,
        status: submission?.status === 'Pending' ? 'pending' : 'completed',
        score: submission?.status === 'Pending' ? null : submission?.score ?? null,
        dueAt: assignment.dueDate,
      };
    }),
    weekly_trends: [
      { weekStart: '2026-06-01', lessonsCompleted: 2 + index, assignmentsCompleted: 1, assessmentAverage: Math.max(45, student.assessmentScore - 8), weeklyExamScore: Math.max(40, student.assessmentScore - 10) },
      { weekStart: '2026-06-08', lessonsCompleted: 3 + index, assignmentsCompleted: 2, assessmentAverage: Math.max(48, student.assessmentScore - 5), weeklyExamScore: Math.max(45, student.assessmentScore - 6) },
      { weekStart: '2026-06-15', lessonsCompleted: 4 + index, assignmentsCompleted: Math.max(1, Math.round(student.homeworkCompletion / 35)), assessmentAverage: student.assessmentScore, weeklyExamScore: student.assessmentScore },
    ],
    weekly_report: {
      generatedAt: '2026-06-19',
      activeDays: [5, 4, 3, 5, 4, 3, 3, 5, 4, 2][index] ?? 3,
      lessonsCompleted: [6, 5, 3, 6, 4, 4, 3, 5, 4, 2][index] ?? 3,
      assignmentsCompleted: [4, 3, 2, 4, 3, 2, 2, 3, 3, 1][index] ?? 2,
      assessmentAverage: student.assessmentScore,
      weeklyExamScore: index === 4 ? null : student.assessmentScore,
      strengths: [
        student.assessmentScore >= 80 ? 'Strong independent practice' : 'Responds well to guided practice',
        student.homeworkCompletion >= 80 ? 'Consistent homework follow-through' : 'Improving assignment routines',
      ],
      focusAreas: [
        student.assessmentScore < 70 ? 'Daily remediation on weak strands' : 'Stretch questions for deeper mastery',
        student.homeworkCompletion < 70 ? 'Complete pending homework before Friday' : 'Maintain current study rhythm',
      ],
    },
  }),
);

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Kitabu User',
  role: 'Student Account',
  grade: 'Grade 6',
  gender: 'Not Specified',
  email: '',
  avatar: 'avatar-afro-boy',
  school: '',
  phone: '',
  dateJoined: '',
  points: 0,
};
