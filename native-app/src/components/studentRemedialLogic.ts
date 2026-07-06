import { DEFAULT_GRADE } from '../constants/grades';
import { generateRemedialAnalysisText } from '../services/aiService';
import { Question, UserProfile } from '../types/app';

export interface RemedialArea {
  subject: string;
  strand: string;
  subStrand: string;
  learningArea: string;
  wrong: number;
  total: number;
  recent: number;
  sourceCount: number;
  accuracy: number;
  severity: number;
}

export interface RemedialAttempt {
  student: string;
  subject: string;
  strand: string;
  subStrand: string;
  learningArea: string;
  source: string;
  correct: boolean;
  recent: boolean;
  daysAgo: number;
  attemptedAt: string;
}

export interface RemedialReport {
  wrongAnswers: number;
  affectedAreas: number;
  sourceCount: number;
  topAreas: RemedialArea[];
  mastery: number;
  priorityGaps: number;
  riskLabel: string;
  riskClass: 'high' | 'medium' | 'low';
  periodLabel: string;
  sourceLabel: string;
  assignmentQuestionCount: number;
  diagnosis: string;
  actionTitle: string;
  actionNote: string;
  recommendation: string;
  assignmentTopic: string;
}

export interface RemedialAssignmentPayload {
  recipientId?: string;
  recipientName: string;
  grade: string;
  subject: string;
  topic: string;
  draft: {
    title: string;
    description: string;
    questions: Question[];
  };
}

function firstNameOf(user: UserProfile) {
  return String(user.name || 'This student').split(' ')[0] || 'This student';
}

function isUuid(value?: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isPastSevenDayAttempt(attempt: RemedialAttempt) {
  if (Number.isFinite(attempt.daysAgo)) {
    return attempt.daysAgo >= 0 && attempt.daysAgo <= 6;
  }
  return attempt.recent || attempt.attemptedAt === 'This week' || attempt.attemptedAt === 'Past 7 days';
}

function sanitizeJsonPayload(text: string) {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJson?.[1]) return fencedJson[1].trim();
  const firstObjectChar = trimmed.indexOf('{');
  const lastObjectChar = trimmed.lastIndexOf('}');
  if (firstObjectChar >= 0 && lastObjectChar > firstObjectChar) {
    return trimmed.slice(firstObjectChar, lastObjectChar + 1);
  }
  return trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
}

export function studentRemedialAttempts(user: UserProfile): RemedialAttempt[] {
  const firstName = firstNameOf(user);
  const studentKey = String(user.name || user.id || '').toLowerCase();
  let seed = String(user.id || user.name || '').length % 3;
  if (studentKey.includes('alice')) seed = 0;
  if (studentKey.includes('kevin')) seed = 1;
  if (studentKey.includes('brian')) seed = 2;
  const banks: Array<Array<[string, string, string, string, string, number]>> = [
    [
      ['Mathematics', 'Numbers', 'Fractions', 'Equivalent fractions', 'Algebra Quiz', 4],
      ['Science', 'Living Things', 'Respiration', 'Gas exchange', 'Biology Reading', 3],
      ['English', 'Reading', 'Inference', 'Evidence from text', 'Comprehension Drill', 4],
      ['Social Studies', 'History', 'Cause and effect', 'Historical causes', 'World War II Essay', 2],
    ],
    [
      ['Mathematics', 'Algebra', 'Linear equations', 'Solving for unknowns', 'Equation Practice', 4],
      ['Kiswahili', 'Sarufi', 'Nyakati', 'Wakati uliopita', 'Kiswahili Quiz', 3],
      ['Science', 'Matter', 'Mixtures', 'Separation methods', 'Science Assignment', 3],
      ['English', 'Writing', 'Paragraph structure', 'Topic sentences', 'Essay Builder', 2],
    ],
    [
      ['Computer Science', 'Programming', 'Conditionals', 'If statements', 'Code Lab', 4],
      ['Mathematics', 'Geometry', 'Angles', 'Angles in triangles', 'Geometry Quiz', 3],
      ['Science', 'Energy', 'Electric circuits', 'Series circuits', 'Lab Reflection', 3],
      ['English', 'Grammar', 'Punctuation', 'Comma usage', 'Grammar Practice', 2],
    ],
  ];

  return banks[seed].flatMap((area, areaIndex) => {
    const [subject, strand, subStrand, learningArea, source, count] = area;
    return Array.from({ length: count }, (_, index) => {
      const daysAgo = index < 2 ? Math.min(6, index + areaIndex) : 8 + index;
      return {
        student: firstName,
        subject,
        strand,
        subStrand,
        learningArea,
        source,
        correct: index === count - 1 && areaIndex > 1,
        recent: daysAgo <= 6,
        daysAgo,
        attemptedAt: daysAgo <= 6 ? 'Past 7 days' : 'Older',
      };
    });
  });
}

export function weeklyRemedialAttempts(user: UserProfile) {
  const attempts = studentRemedialAttempts(user);
  const recentAttempts = attempts.filter(isPastSevenDayAttempt);
  return recentAttempts.length ? recentAttempts : attempts;
}

export function buildRemedialReport(user: UserProfile): RemedialReport {
  const attempts = weeklyRemedialAttempts(user);
  const grouped = attempts.reduce<Record<string, Omit<RemedialArea, 'sourceCount' | 'accuracy' | 'severity'> & { sources: Set<string> }>>((items, attempt) => {
    const key = [attempt.subject, attempt.strand, attempt.subStrand, attempt.learningArea].join('|');
    if (!items[key]) {
      items[key] = {
        subject: attempt.subject,
        strand: attempt.strand,
        subStrand: attempt.subStrand,
        learningArea: attempt.learningArea,
        wrong: 0,
        total: 0,
        recent: 0,
        sources: new Set(),
      };
    }
    items[key].total += 1;
    items[key].sources.add(attempt.source);
    if (!attempt.correct) {
      items[key].wrong += 1;
      if (attempt.recent) items[key].recent += 1;
    }
    return items;
  }, {});

  const areas = Object.values(grouped)
    .map(area => ({
      subject: area.subject,
      strand: area.strand,
      subStrand: area.subStrand,
      learningArea: area.learningArea,
      wrong: area.wrong,
      total: area.total,
      recent: area.recent,
      sourceCount: area.sources.size,
      accuracy: ((area.total - area.wrong) / Math.max(1, area.total)) * 100,
      severity: area.wrong * 2 + area.recent + area.sources.size,
    }))
    .sort((a, b) => b.severity - a.severity);
  const topAreas = areas.slice(0, 3);
  const wrongAnswers = attempts.filter(attempt => !attempt.correct).length;
  const sourceCount = new Set(attempts.map(attempt => attempt.source)).size;
  const riskLabel = wrongAnswers >= 10 ? 'Needs Attention' : wrongAnswers >= 6 ? 'Watch Closely' : 'Improving';
  const riskClass = wrongAnswers >= 10 ? 'high' : wrongAnswers >= 6 ? 'medium' : 'low';
  const areaList = topAreas.map(area => area.subStrand).join(', ');
  const firstName = firstNameOf(user);
  const primaryArea = topAreas[0];
  const primarySkill = primaryArea?.learningArea || primaryArea?.subStrand || 'the weakest skill';
  const diagnosis = `${firstName} has repeatedly missed questions in ${areaList} during the past 7 days. The pattern suggests ${firstName} understands the basics but needs guided practice applying them in unfamiliar question formats.`;
  const mastery = Math.max(42, Math.min(88, Math.round(100 - wrongAnswers * 3.8)));

  return {
    wrongAnswers,
    affectedAreas: areas.length,
    sourceCount,
    topAreas,
    mastery,
    priorityGaps: topAreas.length,
    riskLabel,
    riskClass,
    periodLabel: 'Past 7 days',
    sourceLabel: 'Weekly analysis',
    assignmentQuestionCount: Math.max(8, Math.min(16, topAreas.reduce((sum, area) => sum + area.wrong, 0) + 4)),
    diagnosis,
    actionTitle: 'Best next step: Weekend Assignment + 1:1 coaching. ',
    actionNote: `Use worked examples on ${primarySkill}, guided revision, then a short re-test this week.`,
    recommendation: `Weekend work should target ${areaList}. Re-test before the next assessment.`,
    assignmentTopic: topAreas.map(area => `${area.subStrand} (${area.learningArea})`).join('; '),
  };
}

function remedialAnalysisPrompt(user: UserProfile, attempts: RemedialAttempt[], fallback: RemedialReport) {
  return `Analyze this student's wrong-answer records from the past 7 days only.
Student: ${user.name}
Grade: ${user.grade || 'Student'}
Weekly summary: ${fallback.wrongAnswers} wrong answers, ${fallback.priorityGaps} priority gaps, ${fallback.mastery}% mastery.
Wrong-answer records:
${JSON.stringify(attempts.filter(attempt => !attempt.correct).map(attempt => ({
  subject: attempt.subject,
  strand: attempt.strand,
  subStrand: attempt.subStrand,
  learningArea: attempt.learningArea,
  source: attempt.source,
  daysAgo: attempt.daysAgo,
})), null, 2)}

Return pure JSON only:
{
  "diagnosis": "A concise teacher/parent-facing explanation of the week's pattern.",
  "actionTitle": "Best next step: ... ",
  "actionNote": "Specific revision/coaching action for the weakest areas.",
  "riskLabel": "Needs Attention | Watch Closely | Improving",
  "riskClass": "high | medium | low"
}`;
}

function parseRemedialAiReport(value: string, fallback: RemedialReport): RemedialReport {
  const parsed = JSON.parse(sanitizeJsonPayload(value)) as Partial<Pick<RemedialReport, 'diagnosis' | 'actionTitle' | 'actionNote' | 'riskLabel' | 'riskClass'>>;
  const riskClass = parsed.riskClass && ['high', 'medium', 'low'].includes(parsed.riskClass) ? parsed.riskClass : fallback.riskClass;
  return {
    ...fallback,
    diagnosis: String(parsed.diagnosis || fallback.diagnosis).trim(),
    actionTitle: `${String(parsed.actionTitle || fallback.actionTitle).trim()} `,
    actionNote: String(parsed.actionNote || fallback.actionNote).trim(),
    riskLabel: String(parsed.riskLabel || fallback.riskLabel).trim(),
    riskClass,
    sourceLabel: 'AI analysis',
  };
}

export async function generateRemedialReport(user: UserProfile): Promise<RemedialReport> {
  const fallback = buildRemedialReport(user);
  const attempts = weeklyRemedialAttempts(user);
  try {
    const response = await generateRemedialAnalysisText(remedialAnalysisPrompt(user, attempts, fallback));
    return response ? parseRemedialAiReport(response, fallback) : { ...fallback, sourceLabel: 'Local fallback' };
  } catch {
    return { ...fallback, sourceLabel: 'Local fallback' };
  }
}

export function remedialAssignmentDraft(user: UserProfile, report: RemedialReport): RemedialAssignmentPayload {
  const areas = report.topAreas.length
    ? report.topAreas
    : [{ subject: 'Mathematics', subStrand: 'Revision', learningArea: 'Core skills' }];
  const questions: Question[] = Array.from({ length: report.assignmentQuestionCount }, (_, index) => {
    const area = areas[index % areas.length];
    const isMcq = index % 2 === 1;
    return isMcq
      ? {
          id: index + 1,
          type: 'MCQ',
          text: `Which option best supports ${area.subStrand}?`,
          options: ['Correct method', 'Unrelated fact', 'Guesswork', 'Incomplete answer'],
          correctAnswer: 'Correct method',
          explanation: `Checks whether ${user.name} can identify the right approach.`,
        }
      : {
          id: index + 1,
          type: 'SHORT_ANSWER',
          text: `Explain the key idea behind ${area.learningArea}.`,
          correctAnswer: 'Student should show the core method or concept clearly.',
          explanation: `Targets ${area.subStrand}.`,
        };
  });

  return {
    recipientName: user.name,
    recipientId: isUuid(user.id) ? user.id : '',
    grade: user.grade || DEFAULT_GRADE,
    subject: report.topAreas[0]?.subject || 'Mathematics',
    topic: `Weekend Assignment for ${user.name}. Focus only on: ${report.assignmentTopic}. Generate ${report.assignmentQuestionCount} questions and include a short revision note.`,
    draft: {
      title: `${firstNameOf(user)} Weekend Remedial`,
      description: `Focused remedial assignment for ${areas.map(area => area.subStrand).join(', ')}.`,
      questions,
    },
  };
}
