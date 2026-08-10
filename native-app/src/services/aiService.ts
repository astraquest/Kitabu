import { DEFAULT_GRADE } from '../constants/grades';
import {
  Attachment,
  ChatMessage,
  LearningStrand,
  OnboardingVoiceName,
  Question,
  QuizGenerationProgress,
} from '../types/app';
import { fetchKitabuApi } from './runtimeConfig';
import { buildKitabuRequestHeaders, readJsonResponse } from './requestHelpers';
import { sanitizeTutorResponseForDisplay } from './tutorResponseFormatting';

interface GeneratedAssignment {
  title: string;
  description: string;
  questions: Question[];
}

interface GeneratedQuizPayload {
  flashcards?: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
  questions?: Question[];
}

interface AiProxyRequest {
  prompt: string;
  systemInstruction?: string;
  attachment?: Attachment;
  history?: ChatMessage[];
  responseMimeType?: 'application/json';
  feature: string;
  context?: Record<string, unknown>;
}

interface AudioTranscriptionRequest {
  base64Audio: string;
  mimeType: string;
  fileName?: string;
  language?: string;
  prompt?: string;
}

interface SpeechSynthesisRequest {
  text: string;
  voice: OnboardingVoiceName;
  language?: string;
}

interface LandingSpeechSynthesisRequest {
  cueId: string;
  voice: OnboardingVoiceName;
  language: string;
}

interface ChatLearningContext {
  grade: string;
  studentName?: string | null;
  subjectName?: string | null;
  strandTitle?: string | null;
  subStrandTitle?: string | null;
  curriculumStrands?: LearningStrand[];
}

const CHAT_AI_TIMEOUT_MS = 20_000;
const QUIZ_AI_TIMEOUT_MS = 80_000;
const DEFAULT_AI_TIMEOUT_MS = 25_000;

const GREETING_RESPONSE_BUILDERS = [
  (name: string) => `Hi, ${name}! What can I help you with today?`,
  (name: string) => `Hello, ${name}! What would you like help with?`,
  (name: string) => `Hey, ${name}! What are we working on today?`,
  (name: string) => `Hi there, ${name}! What do you need a hand with?`,
  (name: string) => `Good to see you, ${name}! What can we tackle together?`,
];
const SUBJECT_SELECTIONS = new Map([
  ['social studies', 'Social Studies'],
  ['english', 'English'],
  ['mathematics', 'Mathematics'],
  ['science', 'Science'],
  ['kiswahili', 'Kiswahili'],
]);
let greetingResponseIndex = 0;

export interface SpeechSynthesisPayload {
  base64Audio: string;
  mimeType: string;
  model: string;
  voice: string;
}

function sanitizeJsonPayload(text: string) {
  const trimmed = text.trim();
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedJson?.[1]) {
    return fencedJson[1].trim();
  }

  const firstObjectChar = trimmed.indexOf('{');
  const lastObjectChar = trimmed.lastIndexOf('}');
  if (firstObjectChar >= 0 && lastObjectChar > firstObjectChar) {
    return trimmed.slice(firstObjectChar, lastObjectChar + 1);
  }

  return trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function buildChatLearningContext(context?: ChatLearningContext) {
  if (!context) {
    return `Student level: ${DEFAULT_GRADE}.`;
  }

  const lines = [`Student level: ${context.grade || DEFAULT_GRADE}.`];

  if (context.studentName) {
    lines.push(`Student name: ${getStudentFirstName(context.studentName)}.`);
  }

  if (context.subjectName) {
    lines.push(`Active subject: ${context.subjectName}.`);
  }

  if (context.strandTitle) {
    lines.push(`Active strand: ${context.strandTitle}.`);
  }

  if (context.subStrandTitle) {
    lines.push(`Active sub-strand: ${context.subStrandTitle}.`);
  }

  const curriculumLines = (context.curriculumStrands ?? [])
    .slice(0, 5)
    .map(strand => {
      const subStrands = strand.subStrands
        .slice(0, 4)
        .map(subStrand => subStrand.title)
        .join(', ');
      return subStrands ? `${strand.title}: ${subStrands}` : strand.title;
    });

  if (curriculumLines.length > 0) {
    lines.push(`Curriculum scope: ${curriculumLines.join(' | ')}.`);
  }

  return lines.join('\n');
}

function getStudentFirstName(name?: string | null) {
  const nameParts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const preferredPart =
    nameParts[0]?.toLowerCase() === 'kitabu' &&
    nameParts.some(part => part.toLowerCase() === 'demo')
      ? nameParts[nameParts.length - 1]
      : nameParts[0];
  const firstName = preferredPart?.replace(/[^A-Za-zÀ-ÿ'-]/g, '');
  return firstName || 'Learner';
}

function buildImmediateChatReply(prompt: string, context?: ChatLearningContext) {
  const normalizedPrompt = prompt.trim().replace(/\s+/g, ' ');
  const firstName = getStudentFirstName(context?.studentName);
  const greetingOnly = /^(hi|hello|hey|howdy|hi there|good morning|good afternoon|good evening)[!,.? ]*$/i;

  if (greetingOnly.test(normalizedPrompt)) {
    const responseBuilder =
      GREETING_RESPONSE_BUILDERS[greetingResponseIndex % GREETING_RESPONSE_BUILDERS.length];
    greetingResponseIndex += 1;
    return responseBuilder(firstName);
  }

  const subjectMatch = normalizedPrompt.match(/^i need help with (.+?)[!,.? ]*$/i);
  const selectedSubject = subjectMatch
    ? SUBJECT_SELECTIONS.get(subjectMatch[1].trim().toLowerCase())
    : undefined;
  if (selectedSubject) {
    return `Sure, ${firstName}—what do you need help with in ${selectedSubject}?`;
  }

  return null;
}

async function fetchAiWithTimeout(path: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchKitabuApi(path, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

async function generateText({
  prompt,
  systemInstruction,
  attachment,
  history = [],
  responseMimeType,
  feature,
  context,
  timeoutMs = DEFAULT_AI_TIMEOUT_MS,
}: {
  prompt: string;
  systemInstruction?: string;
  attachment?: Attachment;
  history?: ChatMessage[];
  responseMimeType?: 'application/json';
  feature: string;
  context?: Record<string, unknown>;
  timeoutMs?: number;
}) {
  const response = await fetchAiWithTimeout('/generate-text', {
    method: 'POST',
    headers: await buildKitabuRequestHeaders(),
    body: JSON.stringify({
      prompt,
      systemInstruction,
      attachment,
      history,
      responseMimeType,
      feature,
      context,
    } satisfies AiProxyRequest),
  }, timeoutMs);

  if (!response.ok) {
    let message = 'AI assistance is currently unavailable. Please try again later.';

    try {
      const payload = await readJsonResponse<{ message?: string }>(response, message);
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Ignore JSON parsing errors and fall back to the default message.
    }

    throw new Error(message);
  }

  const payload = await readJsonResponse<{
    text?: string;
  }>(response, 'Invalid AI response');

  return payload.text ?? null;
}

export async function askHomeworkHelper(
  prompt: string,
  history: ChatMessage[] = [],
  mode: 'chat' | 'explanation' = 'chat',
  attachment?: Attachment,
  learningContext?: ChatLearningContext,
): Promise<string> {
  const contextBlock = buildChatLearningContext(learningContext);
  const immediateReply =
    mode === 'chat' && !attachment
      ? buildImmediateChatReply(prompt, learningContext)
      : null;
  if (immediateReply) {
    return immediateReply;
  }
  const systemInstruction =
    mode === 'chat'
      ? `You are Kitabu, a warm and concise AI tutor inside a student chat.

Learning context:
${contextBlock}

Conversation style:
1. Start with the answer, not labels or metadata.
2. Never write headings such as "Question Acknowledged", "Subject", or "Grade Level".
3. Do not use markdown headings, markdown bolding, tables, or code fences.
4. Default to 1-3 short, conversational sentences. Expand only after the student gives an actual question or asks for a detailed explanation.
5. Ground answers in the student's grade, active subject, and curriculum scope when available.
6. Use age-appropriate wording and a simple example for the student's grade level.
7. Ask one short follow-up question only when it helps the student continue.

Silent reasoning rule:
- Use the learning context, learner history, hints, misconception checks, and next-step planning internally to reason about the best response.
- Never expose instructional scaffolding or internal-analysis labels in the response, including "Starter", "Hint", "Your Turn", "Clarifying Your Choice & Next Step", "Your Choice Analysis", "Focused Question to Strengthen Understanding", or instructions such as "Respond with your choice and brief reasoning".
- Do not narrate how you analysed the student's choice. Respond naturally with the helpful explanation or question itself.
- When the student asks to explain a topic, explain it directly instead of turning the response into an unsolicited quiz.

Greeting rule:
- When the message is only a greeting, reply with exactly one friendly sentence and do not start teaching, suggest a topic, give a hint, or ask an academic question.
- Address the student by first name and naturally vary among these patterns:
  1. "Hi, [name]! What can I help you with today?"
  2. "Hello, [name]! What would you like help with?"
  3. "Hey, [name]! What are we working on today?"
  4. "Hi there, [name]! What do you need a hand with?"
  5. "Good to see you, [name]! What can we tackle together?"

Subject shortcut rule:
- When the student selects a subject card or says only "I need help with [subject]", reply with exactly one sentence that includes the student's first name and invites them to say what they need help with in that subject.
- Example: "Sure, Amina—what do you need help with in Mathematics?"
- Do not choose a topic or begin a lesson until the student states what they need.

If an attachment is provided:
- Treat photos, images, PDFs, and documents as the student's homework context.
- First identify the visible question, instructions, marks, tables, diagrams, or handwritten work.
- If the file is unclear, say exactly what is missing and ask for a clearer photo or page.
- Help the student solve or understand the attached work; do not merely summarize the file.
- For documents with multiple questions, answer the specific question the student asks and offer to continue question by question.`
      : `You are KITABU AI, an expert tutor. Provide a clear, step-by-step explanation of the concept.

Methodology:
1. Be direct and concise.
2. Break the concept down into logical steps.
3. Explain why the correct answer is right.
4. Use simple, friendly language.
5. Do not repeat the question.
6. Do not use markdown bolding.`;

  try {
    const response = await generateText({
      prompt,
      systemInstruction,
      attachment,
      history,
      feature: mode === 'chat' ? 'homework_helper_chat' : 'homework_helper_explanation',
      context: learningContext ? { ...learningContext } : { grade: DEFAULT_GRADE },
      timeoutMs: mode === 'chat' ? CHAT_AI_TIMEOUT_MS : DEFAULT_AI_TIMEOUT_MS,
    });

    return response
      ? sanitizeTutorResponseForDisplay(response) || 'AI assistance is currently unavailable. Please try again later.'
      : 'AI assistance is currently unavailable. Please try again later.';
  } catch (error) {
    console.error('Error calling AI proxy:', error);
    if (isAbortError(error)) {
      return 'The tutor is taking too long to respond. Please try again, or ask a shorter question.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong. Please check your connection or try again later.';
  }
}

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

export async function askParentAssistant(
  prompt: string,
  history: ChatMessage[] = [],
  context?: ParentAssistantContext,
): Promise<string> {
  try {
    const response = await generateText({
      prompt,
      history,
      feature: 'parent_progress_assistant',
      context: context ? { ...context } : undefined,
      timeoutMs: CHAT_AI_TIMEOUT_MS,
    });

    return response
      ? sanitizeTutorResponseForDisplay(response) || 'Rafiki is unavailable right now. Please try again shortly.'
      : 'Rafiki is unavailable right now. Please try again shortly.';
  } catch (error) {
    console.error('Error calling parent assistant:', error);
    if (isAbortError(error)) {
      return 'Rafiki is taking too long to respond. Please try again with a shorter question.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong. Please check your connection and try again.';
  }
}

export async function generateRemedialAnalysisText(prompt: string): Promise<string | null> {
  return generateText({
    prompt,
    responseMimeType: 'application/json',
    feature: 'remedial_analysis',
    timeoutMs: DEFAULT_AI_TIMEOUT_MS,
  });
}

export async function generateLessonPlanIdeas(input: {
  gradeLevel: string;
  subject: string;
  topic: string;
  outcome: string;
  durationMinutes: number;
  style: string;
}): Promise<string> {
  const prompt = `Create a practical teacher-facing lesson plan and presentation ideas.
Grade: ${input.gradeLevel}
Subject: ${input.subject}
Topic: ${input.topic}
Learning outcome: ${input.outcome}
Duration: ${input.durationMinutes} minutes
Style: ${input.style}

Return concise plain text with:
1. Hook
2. Teaching approach
3. Learner activity
4. Questions to ask
5. Common misconception and correction
6. Exit ticket`;

  const response = await generateText({
    prompt,
    feature: 'lesson_plan_generation',
    timeoutMs: DEFAULT_AI_TIMEOUT_MS,
  });

  return response?.trim() || 'Could not generate lesson ideas right now.';
}

export async function askVoiceTutor(
  prompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const systemInstruction = `You are KITABU AI in voice mode, helping a student in a spoken tutoring session.

Rules:
1. Sound natural when read aloud.
2. Keep each reply concise, direct, and useful.
3. Ask at most one short follow-up question when needed.
4. Prefer short explanations over long lists.
5. Avoid markdown, bullet points, headings, or meta commentary.
6. If the student is stuck, give the next step first before expanding.
7. End with one brief prompt that helps the student continue the conversation.`;

  try {
    const response = await generateText({
      prompt,
      systemInstruction,
      history,
      feature: 'voice_tutor_text',
      context: { grade: DEFAULT_GRADE },
      timeoutMs: CHAT_AI_TIMEOUT_MS,
    });

    return response || 'I could not answer that just now. Please try again.';
  } catch (error) {
    console.error('Error calling voice tutor:', error);
    if (isAbortError(error)) {
      return 'I am taking too long to answer. Please try again.';
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }
}

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
): Promise<string> {
  try {
    const response = await fetchKitabuApi('/transcribe-audio', {
      method: 'POST',
      headers: await buildKitabuRequestHeaders(),
      body: JSON.stringify({
        base64Audio,
        mimeType,
        fileName: 'voice-answer.m4a',
        prompt:
          'Transcribe the student response exactly as spoken. Ignore silence and obvious background noise. Return only the spoken words.',
      } satisfies AudioTranscriptionRequest),
    });

    if (!response.ok) {
      throw new Error('Audio transcription request failed.');
    }

    const payload = await readJsonResponse<{ text?: string }>(response, 'Invalid transcription response');
    return payload.text?.trim() ?? '';
  } catch (error) {
    throw new Error('Failed to transcribe audio.', { cause: error });
  }
}

export async function synthesizeSpeech(
  text: string,
  voiceName?: OnboardingVoiceName,
  language = 'en',
): Promise<SpeechSynthesisPayload> {
  const normalizedText = text.trim();
  if (!normalizedText) {
    throw new Error('Nothing to speak.');
  }
  if (!voiceName) {
    throw new Error('No tutor voice selected.');
  }

  const response = await fetchKitabuApi('/synthesize-speech', {
    method: 'POST',
    headers: await buildKitabuRequestHeaders(),
    body: JSON.stringify({
      text: normalizedText,
      voice: voiceName,
      language,
    } satisfies SpeechSynthesisRequest),
  });

  if (!response.ok) {
    throw new Error('Speech synthesis request failed.');
  }

  return readJsonResponse<SpeechSynthesisPayload>(response, 'Invalid speech synthesis response');
}

export async function synthesizeLandingSpeech(
  cueId: string,
  voiceName: OnboardingVoiceName,
  language = 'en',
): Promise<SpeechSynthesisPayload> {
  const response = await fetchKitabuApi('/landing/synthesize-speech', {
    method: 'POST',
    headers: await buildKitabuRequestHeaders(undefined, false),
    body: JSON.stringify({ cueId, voice: voiceName, language } satisfies LandingSpeechSynthesisRequest),
  });

  if (!response.ok) {
    throw new Error('Landing speech synthesis request failed.');
  }

  return readJsonResponse<SpeechSynthesisPayload>(response, 'Invalid landing speech response');
}

export async function generateQuizData(
  subject: string,
  topic: string,
  subTopic: string,
  count: number,
  type: 'flashcards' | 'quiz',
  grade = DEFAULT_GRADE,
  onProgress?: (progress: QuizGenerationProgress) => void,
): Promise<GeneratedQuizPayload> {
  onProgress?.({ percentage: 10, stage: 'Preparing your quiz request' });
  const prompt =
    type === 'flashcards'
      ? `Generate ${count} flashcards for a ${grade} student about Subject: ${subject}, Topic: ${topic}, Sub-topic: ${subTopic}.

Return JSON with this shape:
{
  "flashcards": [
    { "id": "string", "question": "string", "answer": "string" }
  ]
}`
      : `Generate ${count} quiz questions for a ${grade} student about Subject: ${subject}, Topic: ${topic}, Sub-topic: ${subTopic}.
Mix question types between MCQ, TRUE_FALSE, SHORT_ANSWER, and ESSAY when appropriate.

Return JSON with this shape:
{
  "questions": [
    {
      "id": 1,
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY",
      "text": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;

  try {
    onProgress?.({ percentage: 25, stage: 'Kitabu AI is creating your questions' });
    const response = await generateText({
      prompt,
      responseMimeType: 'application/json',
      feature: type === 'flashcards' ? 'flashcard_generation' : 'quiz_generation',
      context: {
        grade,
        subjectName: subject,
        topic,
        subTopic,
        count,
        generationType: type,
      },
      timeoutMs: QUIZ_AI_TIMEOUT_MS,
    });

    if (!response) {
      throw new Error('AI service returned an empty response.');
    }

    onProgress?.({ percentage: 75, stage: 'Checking the generated questions' });
    const parsed = JSON.parse(sanitizeJsonPayload(response)) as GeneratedQuizPayload;
    onProgress?.({ percentage: 90, stage: 'Finalizing your practice set' });
    return parsed;
  } catch (error) {
    console.error('Error generating quiz data:', error);
    throw error;
  }
}

export async function generateAssignmentJson(
  grade: string,
  subject: string,
  strand: string,
  subStrand: string,
  topic: string,
): Promise<GeneratedAssignment | null> {
  const prompt = `Create a homework assignment for ${grade} ${subject}.
Strand: ${strand || 'General'}
Sub-strand: ${subStrand || 'General'}
Additional Topic/Details: ${topic || 'Comprehensive Review'}

The assignment must include:
1. A creative title.
2. A short description.
3. Questions mixed between MCQ (Multiple Choice), TRUE_FALSE, and SHORT_ANSWER types.
   IMPORTANT: If the 'Additional Topic/Details' text specifies a number of questions (e.g. "5 questions", "10 qs"), YOU MUST GENERATE EXACTLY THAT MANY.
   If no number is specified, generate default 8 questions.

Return pure JSON data matching this shape:
{
  "title": "string",
  "description": "string",
  "questions": [
    {
      "id": 1,
      "type": "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER",
      "text": "string",
      "options": ["string"],
      "correctAnswer": "string",
      "explanation": "string"
    }
  ]
}`;

  try {
    const response = await generateText({
      prompt,
      responseMimeType: 'application/json',
      feature: 'assignment_generation',
      context: {
        grade,
        subjectName: subject,
        strandTitle: strand || 'General',
        subStrandTitle: subStrand || 'General',
        topic: topic || 'Comprehensive Review',
      },
    });

    if (!response) {
      return null;
    }

    const parsed = JSON.parse(sanitizeJsonPayload(response)) as GeneratedAssignment;

    if (!parsed.title || !parsed.description || !Array.isArray(parsed.questions)) {
      return null;
    }

    return {
      ...parsed,
      questions: parsed.questions.map((question, index) => ({
        ...question,
        id: question.id ?? index + 1,
      })),
    };
  } catch (error) {
    console.error('Error generating assignment:', error);
    return null;
  }
}

export async function extractCurriculumFromPdfData(
  base64Data: string,
  mimeType: string,
): Promise<
  Array<{
    number?: string;
    title: string;
    subStrands: Array<{
      number?: string;
      title: string;
      topics?: Array<{ code?: string; title: string; description?: string }>;
      outcomes?: Array<{ id?: string; text: string } | string>;
      inquiryQuestions?: Array<{ id?: string; text: string } | string>;
    }>;
  }> | null
> {
  const prompt = `Analyze the attached curriculum PDF and extract strands, sub-strands, and explicitly listed child topics.

Keep strand and sub-strand titles canonical and concise. Do not append outcomes,
activities, content bullets, or child topics to a title. Preserve the source language.

Return JSON with this shape:
[
  {
    "number": "1.0",
    "title": "STRAND",
    "subStrands": [
      {
        "number": "1.1",
        "title": "Sub-strand",
        "topics": [{ "code": "1.1.1", "title": "Child topic" }],
        "outcomes": ["Outcome"],
        "inquiryQuestions": ["Question"]
      }
    ]
  }
]`;

  try {
    const response = await generateText({
      prompt,
      attachment: {
        mimeType,
        data: base64Data,
        type: 'file',
      },
      responseMimeType: 'application/json',
      feature: 'curriculum_extraction',
    });

    if (!response) {
      return null;
    }

    return JSON.parse(sanitizeJsonPayload(response));
  } catch (error) {
    console.error('Error extracting curriculum from PDF:', error);
    return null;
  }
}
