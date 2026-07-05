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
    id: 'agriculture',
    name: 'Agriculture',
    colorFrom: '#65A30D',
    colorTo: '#3F6212',
  },
  {
    id: 'creative_arts',
    name: 'Creative Arts',
    colorFrom: '#DB2777',
    colorTo: '#7E22CE',
  },
  {
    id: 'ai_education',
    name: 'AI Education',
    colorFrom: '#0F172A',
    colorTo: '#2563EB',
  },
];

const GRADE_6_CURRICULUM_SEEDS: Record<string, {
  strandTitle: string;
  subTitle: string;
  subStrandTitle: string;
  type: 'knowledge' | 'skill' | 'competence';
  outcome: string;
  inquiryQuestion: string;
  lessonContent: string;
}> = {
  math: {
    strandTitle: 'Numbers',
    subTitle: 'Build fluency with whole numbers, fractions, and decimals.',
    subStrandTitle: 'Fractions and Decimals',
    type: 'skill',
    outcome: 'Compare, order, and convert fractions and decimals in practical Grade 6 situations.',
    inquiryQuestion: 'How can fractions and decimals describe the same amount?',
    lessonContent: 'Use fraction models and place value tables to compare common fractions and decimals. Convert one form to the other, then explain which value is greater and why.',
  },
  english: {
    strandTitle: 'Listening and Speaking',
    subTitle: 'Develop confident communication and active listening.',
    subStrandTitle: 'Active Listening',
    type: 'skill',
    outcome: 'Listen to spoken information, identify key ideas, and respond using clear Grade 6 language.',
    inquiryQuestion: 'What makes a listener understand and remember important details?',
    lessonContent: 'Practise listening for the speaker, topic, key points, and supporting details. Use short notes to ask a follow-up question or retell the message accurately.',
  },
  science: {
    strandTitle: 'Living Things and Their Environment',
    subTitle: 'Explore how organisms survive and interact.',
    subStrandTitle: 'Body Systems',
    type: 'knowledge',
    outcome: 'Describe how selected body systems work together to keep human beings healthy.',
    inquiryQuestion: 'Why do body systems need to work together?',
    lessonContent: 'Study how the respiratory and circulatory systems exchange and transport oxygen. Connect each organ to its role, then explain one healthy habit that supports the system.',
  },
  kiswahili: {
    strandTitle: 'Kusikiliza na Kuzungumza',
    subTitle: 'Kuimarisha mawasiliano bora kwa Kiswahili.',
    subStrandTitle: 'Mazungumzo ya Heshima',
    type: 'skill',
    outcome: 'Kutumia msamiati na matamshi sahihi kushiriki mazungumzo mafupi kwa heshima.',
    inquiryQuestion: 'Ni maneno gani hufanya mazungumzo yawe ya heshima?',
    lessonContent: 'Jifunze salamu, maneno ya heshima, na jinsi ya kuuliza au kujibu swali kwa utulivu. Fanya mazoezi ya mazungumzo mafupi na mwenzako.',
  },
  social: {
    strandTitle: 'Citizenship',
    subTitle: 'Understand rights, responsibilities, and national identity.',
    subStrandTitle: 'Kenyan Citizenship',
    type: 'knowledge',
    outcome: 'Identify ways Kenyan citizens show responsibility at home, school, and in the community.',
    inquiryQuestion: 'How do responsible citizens help their community?',
    lessonContent: 'Review examples of citizen responsibilities such as respecting others, caring for public property, and following rules. Match each responsibility to a real school or community situation.',
  },
  agriculture: {
    strandTitle: 'Crop Production',
    subTitle: 'Learn practical ways to grow and care for crops.',
    subStrandTitle: 'Kitchen Garden Care',
    type: 'skill',
    outcome: 'Describe simple practices for preparing, planting, watering, and caring for a kitchen garden.',
    inquiryQuestion: 'What helps vegetables grow well in a small garden?',
    lessonContent: 'Explore soil preparation, seed spacing, watering, weeding, and safe pest control. Plan a small kitchen garden using locally available materials.',
  },
  creative_arts: {
    strandTitle: 'Creating and Performing',
    subTitle: 'Use art, music, and movement to communicate ideas.',
    subStrandTitle: 'Pattern and Rhythm',
    type: 'skill',
    outcome: 'Create a simple visual or performance pattern that communicates an idea clearly.',
    inquiryQuestion: 'How can repeated patterns make art or music more interesting?',
    lessonContent: 'Study repeated shapes, colours, beats, and movements. Create a short pattern, perform or display it, then explain the idea behind the choices.',
  },
  ai_education: {
    strandTitle: 'Responsible AI Use',
    subTitle: 'Learn how to use AI tools safely and thoughtfully.',
    subStrandTitle: 'Asking Better Questions',
    type: 'competence',
    outcome: 'Write a clear prompt that gives an AI tutor enough context to provide useful learning help.',
    inquiryQuestion: 'What details help an AI tutor understand what I need?',
    lessonContent: 'Compare vague and specific prompts. Include grade, subject, topic, what is confusing, and the kind of help needed before asking an AI tutor for support.',
  },
};

function buildGrade6CurriculumData() {
  return SUBJECTS.reduce<Record<string, LearningStrand[]>>((data, subject) => {
    const seed = GRADE_6_CURRICULUM_SEEDS[subject.id];
    if (!seed) {
      return data;
    }

    data[`Grade 6-${subject.id}`] = [
      {
        id: `grade-6-${subject.id}-strand-1`,
        title: seed.strandTitle,
        subTitle: seed.subTitle,
        number: '1',
        subStrands: [
          {
            id: `grade-6-${subject.id}-sub-strand-1`,
            title: seed.subStrandTitle,
            number: '1.1',
            type: seed.type,
            description: seed.outcome,
            pages: [
              {
                pageId: `grade-6-${subject.id}-lesson-1`,
                title: seed.subStrandTitle,
                content: seed.lessonContent,
                estimatedMinutes: 8,
              },
            ],
            isLocked: false,
            isCompleted: false,
            masteryScore: null,
            outcomes: [
              {
                id: `grade-6-${subject.id}-outcome-1`,
                text: seed.outcome,
              },
            ],
            inquiryQuestions: [
              {
                id: `grade-6-${subject.id}-inquiry-1`,
                text: seed.inquiryQuestion,
              },
            ],
          },
        ],
      },
    ];

    return data;
  }, {});
}

export const INITIAL_CURRICULUM_DATA: Record<string, LearningStrand[]> =
  buildGrade6CurriculumData();
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
];

export const INITIAL_SCHOOLS: SchoolData[] = [
  {
    id: 'mock-school-green-valley',
    name: 'Green Valley Junior School',
    status: 'Active',
    location: 'Nairobi County, Kenya',
    totalStudents: 4,
    email: 'admin@greenvalley.example',
    phone: '+254700000111',
    principal: 'Mrs. Ruth Wanjiku',
    gradeCounts: {
      'Grade 5': 1,
      'Grade 6': 1,
      'Grade 8': 1,
      'Grade 12': 1,
    },
  },
  {
    id: 'mock-school-kisii-highlands',
    name: 'Kisii Highlands Junior School',
    status: 'Active',
    location: 'Kisii County, Kenya',
    totalStudents: 3,
    email: 'admin@kisiihighlands.example',
    phone: '+254700000222',
    principal: 'Mr. Evans Ogembo',
    gradeCounts: {
      'Grade 4': 1,
      'Grade 6': 1,
      'Grade 10': 1,
    },
  },
  {
    id: 'mock-school-mombasa-coast',
    name: 'Mombasa Coast Junior School',
    status: 'Active',
    location: 'Mombasa County, Kenya',
    totalStudents: 3,
    email: 'admin@mombasacoast.example',
    phone: '+254700000333',
    principal: 'Mrs. Fatuma Hassan',
    gradeCounts: {
      'Grade 7': 1,
      'Grade 9': 1,
      'Grade 11': 1,
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
    grade: 'Grade 11',
    assessmentScore: 72,
    homeworkCompletion: 66,
    lastActive: '2 days ago',
    trend: 'Stable',
    avatar: 'JM',
  },
  {
    id: 'student-eunice-akinyi',
    name: 'Eunice Akinyi',
    grade: 'Grade 12',
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
    school: INITIAL_SCHOOLS[index % INITIAL_SCHOOLS.length]?.name ?? 'Green Valley Junior School',
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
  country: 'Kenya',
  county: '',
  phone: '',
  dateJoined: '',
  points: 0,
};
