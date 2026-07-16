import { readFileSync } from 'node:fs';
import {
  defineCurriculumChapters,
  type CurriculumChapterSource,
  type CurriculumQuestionSource
} from './progressiveLearningCurriculum.js';

type SeniorGrade = 10 | 11;
type QuizBankQuestion = {
  questionNumber: number;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  strandTitle: string;
  subStrandTitle: string;
  learningOutcome: string;
  cognitiveLevel: 'recall' | 'understand' | 'apply' | 'analyze' | 'create';
};

type QuizBankFile = {
  gradeLevel: string;
  subjectId: string;
  subjectName: string;
  questions: QuizBankQuestion[];
};

type SeniorSubjectSpec = {
  appSubjectId: 'math' | 'english' | 'kiswahili' | 'science' | 'social';
  subjectName: string;
  quizBankId: 'mathematics' | 'english' | 'kiswahili' | 'general_science' | 'history_citizenship';
  setting: CurriculumChapterSource['visual']['setting'];
  chapters: [
    { slug: string; title: string; shortTitle: string; elements: [string, string, string] },
    { slug: string; title: string; shortTitle: string; elements: [string, string, string] },
    { slug: string; title: string; shortTitle: string; elements: [string, string, string] },
    { slug: string; title: string; shortTitle: string; elements: [string, string, string] },
    { slug: string; title: string; shortTitle: string; elements: [string, string, string] }
  ];
};

const QUIZ_BANK_COMMIT = '5df1eceb4be54fecd8b4cc0293d6eb936349f920';

const grade10Subjects: SeniorSubjectSpec[] = [
  {
    appSubjectId: 'math', subjectName: 'Mathematics', quizBankId: 'mathematics', setting: 'classroom',
    chapters: [
      { slug: 'indices-standard-form', title: 'Powers, Surds and Standard Form', shortTitle: 'Powers & Surds', elements: ['index law cards', 'standard-form scale', 'surd simplifier'] },
      { slug: 'logs-commercial-arithmetic', title: 'Logarithms and Commercial Arithmetic', shortTitle: 'Logs & Finance', elements: ['log table', 'percentage receipt', 'interest timeline'] },
      { slug: 'ratio-sequences', title: 'Ratios, Limits and Sequences', shortTitle: 'Patterns & Ratios', elements: ['ratio model', 'sequence tiles', 'limit arrows'] },
      { slug: 'equations-expressions', title: 'Equations and Algebraic Expressions', shortTitle: 'Equations & Factors', elements: ['equation balance', 'factor tiles', 'elimination grid'] },
      { slug: 'functions-formulae-inequalities', title: 'Functions, Formulae and Inequalities', shortTitle: 'Function Rules', elements: ['function machine', 'formula triangle', 'inequality line'] }
    ]
  },
  {
    appSubjectId: 'english', subjectName: 'English', quizBankId: 'english', setting: 'studio',
    chapters: [
      { slug: 'listening-speaking', title: 'Listen, Interpret and Respond', shortTitle: 'Active Listening', elements: ['speaker', 'listener notes', 'response cue'] },
      { slug: 'discussion-debate', title: 'Discussion, Debate and Delivery', shortTitle: 'Speak with Purpose', elements: ['debate podium', 'evidence cards', 'audience'] },
      { slug: 'reading-strategies', title: 'Read for Meaning and Evidence', shortTitle: 'Reading Evidence', elements: ['feature article', 'key-word lens', 'evidence notes'] },
      { slug: 'grammar-accurate-meaning', title: 'Grammar for Accurate Meaning', shortTitle: 'Grammar in Context', elements: ['speech bubbles', 'punctuation marks', 'tense timeline'] },
      { slug: 'voice-clauses-word-building', title: 'Voice, Clauses and Word Building', shortTitle: 'Sentence Craft', elements: ['clause blocks', 'voice arrows', 'word roots'] }
    ]
  },
  {
    appSubjectId: 'kiswahili', subjectName: 'Kiswahili', quizBankId: 'kiswahili', setting: 'community',
    chapters: [
      { slug: 'usikilizaji-mahojiano', title: 'Usikilizaji, Matamshi na Mahojiano', shortTitle: 'Sikiliza kwa Makini', elements: ['mzungumzaji', 'msikilizaji', 'vidokezo'] },
      { slug: 'hotuba-maoni', title: 'Hotuba, Maoni na Mrejesho', shortTitle: 'Toa Maoni', elements: ['jukwaa', 'hadhira', 'kadi za hoja'] },
      { slug: 'mdahalo-rejesta', title: 'Mdahalo, Rejesta na Toni', shortTitle: 'Lugha ya Mazingira', elements: ['washiriki', 'hoja', 'ishara ya toni'] },
      { slug: 'hoja-ushahidi-uongozi', title: 'Hoja, Ushahidi na Uongozi', shortTitle: 'Hoja zenye Ushahidi', elements: ['madai', 'kadi za ushahidi', 'mwenyekiti'] },
      { slug: 'wasilisho-mjadala-utatuzi', title: 'Wasilisho, Mjadala na Utatuzi', shortTitle: 'Wasiliana kwa Ushawishi', elements: ['mpango wa wasilisho', 'washiriki wa mjadala', 'daraja la suluhu'] }
    ]
  },
  {
    appSubjectId: 'science', subjectName: 'Science', quizBankId: 'general_science', setting: 'computer_lab',
    chapters: [
      { slug: 'scientific-inquiry', title: 'Scientific Inquiry and Evidence', shortTitle: 'Think Like a Scientist', elements: ['investigation plan', 'measurement tools', 'evidence table'] },
      { slug: 'cell-structure', title: 'Cells: Structure and Function', shortTitle: 'Inside the Cell', elements: ['cell model', 'organelle labels', 'microscope'] },
      { slug: 'cells-nutrition', title: 'Cells, Transport and Nutrition', shortTitle: 'Cells at Work', elements: ['cell membrane', 'nutrient particles', 'movement arrows'] },
      { slug: 'nutrition-transport', title: 'Nutrition and Transport in Living Things', shortTitle: 'Food & Transport', elements: ['food-test tray', 'digestive organs', 'plant vessels'] },
      { slug: 'respiration-roots-transpiration', title: 'Respiration, Roots and Transpiration', shortTitle: 'Living Processes', elements: ['root hair model', 'transpiration arrows', 'respiration equation'] }
    ]
  },
  {
    appSubjectId: 'social', subjectName: 'Social Studies', quizBankId: 'history_citizenship', setting: 'community',
    chapters: [
      { slug: 'linguistic-groups', title: 'Kenya’s Linguistic Communities', shortTitle: 'People & Language', elements: ['Kenya map', 'community labels', 'migration arrows'] },
      { slug: 'colonial-rule', title: 'Colonial Rule and African Response', shortTitle: 'Rule & Resistance', elements: ['historical timeline', 'source extracts', 'response map'] },
      { slug: 'citizenship-change', title: 'Historical Change and Citizenship', shortTitle: 'Change & Citizenship', elements: ['cause cards', 'change timeline', 'citizenship badge'] },
      { slug: 'constitution-accountability', title: 'Constitution, Accountability and Nation-Building', shortTitle: 'Responsible Citizenship', elements: ['constitution', 'public resources', 'accountability checklist'] },
      { slug: 'elections-devolution', title: 'Elections, Devolution and Political Change', shortTitle: 'Kenya’s Political Path', elements: ['ballot box', 'county map', 'reform timeline'] }
    ]
  }
];

const grade11Subjects: SeniorSubjectSpec[] = [
  {
    appSubjectId: 'math', subjectName: 'Mathematics', quizBankId: 'mathematics', setting: 'classroom',
    chapters: [
      { slug: 'indices-surds-algebra', title: 'Indices, Surds and Algebraic Forms', shortTitle: 'Algebraic Forms', elements: ['power rules', 'surd cards', 'factor tree'] },
      { slug: 'functions-sequences', title: 'Functions, Equations and Sequences', shortTitle: 'Functions & Sequences', elements: ['function machine', 'equation graph', 'sequence tiles'] },
      { slug: 'finance-inequalities', title: 'Financial Models and Inequalities', shortTitle: 'Models & Limits', elements: ['investment timeline', 'inequality line', 'simultaneous grid'] },
      { slug: 'real-numbers-surds-variation', title: 'Real Numbers, Surds and Variation', shortTitle: 'Numbers & Variation', elements: ['number sets', 'surd rationaliser', 'variation table'] },
      { slug: 'coordinate-circle-geometry', title: 'Coordinate and Circle Geometry', shortTitle: 'Lines & Circles', elements: ['coordinate grid', 'gradient triangle', 'circle equation'] }
    ]
  },
  {
    appSubjectId: 'english', subjectName: 'English', quizBankId: 'english', setting: 'studio',
    chapters: [
      { slug: 'persuasive-listening', title: 'Critical Listening and Persuasive Speech', shortTitle: 'Listen Critically', elements: ['speaker', 'claim cards', 'evidence meter'] },
      { slug: 'tone-inference', title: 'Tone, Inference and Reading Craft', shortTitle: 'Read Between Lines', elements: ['text excerpt', 'tone dial', 'inference notes'] },
      { slug: 'formal-communication', title: 'Formal Writing and Public Communication', shortTitle: 'Communicate Formally', elements: ['speech outline', 'editing marks', 'audience profile'] },
      { slug: 'grammar-clauses-reported-speech', title: 'Grammar, Clauses and Reported Speech', shortTitle: 'Grammar Connections', elements: ['clause blocks', 'reported speech arrows', 'punctuation cards'] },
      { slug: 'critical-reading-relationships', title: 'Critical Reading and Text Relationships', shortTitle: 'Read Critically', elements: ['bias lens', 'inference notes', 'cause-effect chain'] }
    ]
  },
  {
    appSubjectId: 'kiswahili', subjectName: 'Kiswahili', quizBankId: 'kiswahili', setting: 'community',
    chapters: [
      { slug: 'hotuba-ripoti', title: 'Hotuba, Matamshi na Ripoti', shortTitle: 'Wasiliana Rasmi', elements: ['jukwaa', 'ripoti', 'alama za uakifishaji'] },
      { slug: 'sarufi-fasihi', title: 'Sarufi, Semi na Fasihi', shortTitle: 'Sarufi & Fasihi', elements: ['kadi za maneno', 'kitabu cha riwaya', 'ubeti wa shairi'] },
      { slug: 'barua-ufahamu', title: 'Barua, Ngeli na Ufahamu', shortTitle: 'Andika na Uelewe', elements: ['barua rasmi', 'jedwali la ngeli', 'kifungu cha ufahamu'] },
      { slug: 'usikilizaji-hakiki-mahojiano', title: 'Usikilizaji Hakiki, Mahojiano na Madokezo', shortTitle: 'Sikiliza na Changanua', elements: ['madokezo', 'maswali ya mahojiano', 'kipimo cha ushahidi'] },
      { slug: 'uandishi-hoja-sarufi', title: 'Uandishi Rasmi, Hoja na Sarufi', shortTitle: 'Andika kwa Ufasaha', elements: ['barua ya maombi', 'ramani ya hoja', 'kadi za sentensi'] }
    ]
  },
  {
    appSubjectId: 'science', subjectName: 'Science', quizBankId: 'general_science', setting: 'computer_lab',
    chapters: [
      { slug: 'measurement-inquiry', title: 'Measurement and Scientific Inquiry', shortTitle: 'Measure with Purpose', elements: ['measuring cylinder', 'variable cards', 'results table'] },
      { slug: 'fair-tests-data', title: 'Fair Tests, Data and Communication', shortTitle: 'Trust the Evidence', elements: ['fair-test setup', 'data graph', 'peer-review notes'] },
      { slug: 'membranes-transport', title: 'Cell Membranes and Transport', shortTitle: 'Across the Membrane', elements: ['cell membrane', 'concentration particles', 'transport arrows'] },
      { slug: 'enzymes-osmosis-homeostasis', title: 'Enzymes, Osmosis and Homeostasis', shortTitle: 'Keeping Balance', elements: ['enzyme model', 'osmosis cells', 'feedback loop'] },
      { slug: 'nutrition-digestion-respiration', title: 'Nutrition, Digestion and Respiration', shortTitle: 'Fuel for Life', elements: ['balanced plate', 'small intestine model', 'respiration equation'] }
    ]
  },
  {
    appSubjectId: 'social', subjectName: 'Social Studies', quizBankId: 'history_citizenship', setting: 'community',
    chapters: [
      { slug: 'historical-sources', title: 'Historical Sources and Interpretation', shortTitle: 'Question the Source', elements: ['primary source', 'corroboration board', 'bias lens'] },
      { slug: 'chronology-investigation', title: 'Chronology, Maps and Ethical Inquiry', shortTitle: 'Investigate the Past', elements: ['timeline', 'historical map', 'ethics checklist'] },
      { slug: 'african-civilisations', title: 'African Civilisations and Trade Networks', shortTitle: 'Africa Connected', elements: ['trade-route map', 'city-state model', 'exchange goods'] },
      { slug: 'african-trade-agency', title: 'African Trade, Culture and Historical Agency', shortTitle: 'Africa Shapes History', elements: ['trade goods', 'coastal culture map', 'evidence board'] },
      { slug: 'colonialism-responses', title: 'Colonialism and African Responses', shortTitle: 'Rule & Response', elements: ['partition map', 'administration chart', 'resistance timeline'] }
    ]
  }
];

const cognitiveLevel = (
  level: QuizBankQuestion['cognitiveLevel']
): CurriculumQuestionSource['cognitiveLevel'] =>
  level === 'analyze' || level === 'create' ? 'analyse' : level;

function loadQuizBank(grade: SeniorGrade, subject: SeniorSubjectSpec) {
  const fileUrl = new URL(
    `../data/quiz-bank/KEN/CBC/questions/grade-${grade}/${subject.quizBankId}.json`,
    import.meta.url
  );
  const bank = JSON.parse(readFileSync(fileUrl, 'utf8')) as QuizBankFile;
  if (bank.gradeLevel !== `Grade ${grade}` || bank.subjectId !== subject.quizBankId) {
    throw new Error(`Unexpected QuizBank identity for Grade ${grade} ${subject.quizBankId}.`);
  }
  return bank;
}

function teachingHint(subjectId: SeniorSubjectSpec['appSubjectId'], question: QuizBankQuestion) {
  if (subjectId === 'kiswahili') {
    return `Lenga ujuzi huu: ${question.learningOutcome} Chunguza kila chaguo, kisha litofautishe na ushahidi wa swali.`;
  }
  return `Focus on this outcome: ${question.learningOutcome} Compare every option with the evidence in the question before deciding.`;
}

function buildSeniorChapters(grade: SeniorGrade, subjects: SeniorSubjectSpec[]) {
  return subjects.flatMap(subject => {
    const bank = loadQuizBank(grade, subject);
    return subject.chapters.map((metadata, chapterIndex): CurriculumChapterSource => {
      const firstQuestionNumber = chapterIndex * 5 + 1;
      const lastQuestionNumber = firstQuestionNumber + 4;
      const questions = bank.questions.filter(question =>
        question.questionNumber >= firstQuestionNumber && question.questionNumber <= lastQuestionNumber
      );
      if (questions.length !== 5 || questions.some(question => question.type !== 'MCQ' || question.options.length !== 4)) {
        throw new Error(`Grade ${grade} ${subject.quizBankId} questions ${firstQuestionNumber}-${lastQuestionNumber} must be five MCQs.`);
      }
      const outcomes = [...new Set(questions.map(question => question.learningOutcome.trim()))];
      const subStrands = [...new Set(questions.map(question => question.subStrandTitle.trim()))];

      return {
        key: `g${grade}-${subject.appSubjectId}-${metadata.slug}`,
        subjectId: subject.appSubjectId,
        subjectName: subject.subjectName,
        grade: `Grade ${grade}`,
        strand: questions[0].strandTitle,
        subStrand: subStrands.join(' · '),
        title: metadata.title,
        shortTitle: metadata.shortTitle,
        objective: outcomes.join(' '),
        minutes: 10,
        sourceRef: `git:${QUIZ_BANK_COMMIT}:apps/api/data/quiz-bank/KEN/CBC/questions/grade-${grade}/${subject.quizBankId}.json#questions-${firstQuestionNumber}-${lastQuestionNumber}`,
        visual: { setting: subject.setting, elements: metadata.elements },
        questions: questions.map((question, questionIndex) => ({
          prompt: question.prompt,
          options: question.options as [string, string, string, string],
          answer: question.correctAnswer,
          explanation: question.explanation,
          hint: teachingHint(subject.appSubjectId, question),
          misconception: `G${grade}_${subject.appSubjectId.toUpperCase()}_${chapterIndex + 1}_${questionIndex + 1}`,
          cognitiveLevel: cognitiveLevel(question.cognitiveLevel)
        }))
      };
    });
  });
}

export const grade10LessonSeeds = defineCurriculumChapters(buildSeniorChapters(10, grade10Subjects));
export const grade11LessonSeeds = defineCurriculumChapters(buildSeniorChapters(11, grade11Subjects));
