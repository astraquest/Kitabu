import { DEFAULT_GRADE } from '../constants/grades';
import { Attachment, ChatMessage, Question } from '../types/app';
import { fetchKitabuApi } from './runtimeConfig';
import { buildKitabuRequestHeaders, readJsonResponse } from './requestHelpers';

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
  voice?: string;
}

export interface SpeechSynthesisPayload {
  base64Audio: string;
  mimeType: string;
  model: string;
  voice: string;
}

function sanitizeJsonPayload(text: string) {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function generateText({
  prompt,
  systemInstruction,
  attachment,
  history = [],
  responseMimeType,
  feature,
}: {
  prompt: string;
  systemInstruction?: string;
  attachment?: Attachment;
  history?: ChatMessage[];
  responseMimeType?: 'application/json';
  feature: string;
}) {
  const response = await fetchKitabuApi('/generate-text', {
    method: 'POST',
    headers: await buildKitabuRequestHeaders(),
    body: JSON.stringify({
      prompt,
      systemInstruction,
      attachment,
      history,
      responseMimeType,
      feature,
    } satisfies AiProxyRequest),
  });

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
): Promise<string> {
  const systemInstruction =
    mode === 'chat'
      ? `You are KITABU AI, a concise and direct tutor.

Protocol:
1. Remove disclaimers, long introductions, or excessive praise.
2. When a student asks a new question, briefly acknowledge it and ask a probing question to gauge knowledge.
3. Ask at most two probing questions total. After the second question, give the full answer.
4. Keep the final answer clear and direct.
5. End the final answer with: "Is there anything else you'd like to know about this topic?"

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
    });

    return response || 'AI assistance is currently unavailable. Please try again later.';
  } catch (error) {
    console.error('Error calling AI proxy:', error);
    if (error instanceof Error) {
      return error.message;
    }
    return 'Something went wrong. Please check your connection or try again later.';
  }
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
      feature: 'homework_helper_chat',
    });

    return response || 'I could not answer that just now. Please try again.';
  } catch (error) {
    console.error('Error calling voice tutor:', error);
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
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio.');
  }
}

export async function synthesizeSpeech(text: string): Promise<SpeechSynthesisPayload> {
  const normalizedText = text.trim().slice(0, 200);
  if (!normalizedText) {
    throw new Error('Nothing to speak.');
  }

  const response = await fetchKitabuApi('/synthesize-speech', {
    method: 'POST',
    headers: await buildKitabuRequestHeaders(),
    body: JSON.stringify({
      text: normalizedText,
    } satisfies SpeechSynthesisRequest),
  });

  if (!response.ok) {
    throw new Error('Speech synthesis request failed.');
  }

  return readJsonResponse<SpeechSynthesisPayload>(response, 'Invalid speech synthesis response');
}

export async function generateQuizData(
  subject: string,
  topic: string,
  subTopic: string,
  count: number,
  type: 'flashcards' | 'quiz',
): Promise<GeneratedQuizPayload | null> {
  const prompt =
    type === 'flashcards'
      ? `Generate ${count} flashcards for a ${DEFAULT_GRADE} student about Subject: ${subject}, Topic: ${topic}, Sub-topic: ${subTopic}.

Return JSON with this shape:
{
  "flashcards": [
    { "id": "string", "question": "string", "answer": "string" }
  ]
}`
      : `Generate ${count} quiz questions for a ${DEFAULT_GRADE} student about Subject: ${subject}, Topic: ${topic}, Sub-topic: ${subTopic}.
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
    const response = await generateText({
      prompt,
      responseMimeType: 'application/json',
      feature: type === 'flashcards' ? 'flashcard_generation' : 'quiz_generation',
    });

    if (!response) {
      return null;
    }

    return JSON.parse(sanitizeJsonPayload(response)) as GeneratedQuizPayload;
  } catch (error) {
    console.error('Error generating quiz data:', error);
    return null;
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
      outcomes?: Array<{ id?: string; text: string } | string>;
      inquiryQuestions?: Array<{ id?: string; text: string } | string>;
    }>;
  }> | null
> {
  const prompt = `Analyze the attached curriculum PDF and extract strands and sub-strands.

Return JSON with this shape:
[
  {
    "number": "1.0",
    "title": "STRAND",
    "subStrands": [
      {
        "number": "1.1",
        "title": "Sub-strand",
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
