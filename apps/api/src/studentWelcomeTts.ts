import { appConfig } from './config.js';
import {
  enqueueTtsJob,
  findUserById,
  getUserNarrationPreference,
  type UserNarrationPreferenceRecord,
  withTransaction
} from './repositories.js';
import {
  buildTtsArtifactKey,
  getOrCreateDurableSpeech,
  TTS_AVATAR_VOICES
} from './speechQueue.js';
import { GEMINI_TTS_VOICE_BY_AVATAR } from './ai.js';
import type { TextToSpeechResult } from './ai.js';
import {
  buildStudentWelcomeTtsText,
  canServeStudentWelcomeTts
} from './studentWelcomeCue.js';

export const STUDENT_WELCOME_TTS_SOURCE = 'student_welcome';

function selectedVoice(preference: UserNarrationPreferenceRecord | null) {
  const voice = preference?.selected_profile ?? 'Samora';
  return TTS_AVATAR_VOICES.includes(voice) ? voice : 'Samora';
}

export async function enqueueStudentWelcomeTts(userId: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user || !user.roles.includes('student')) return false;

  const text = buildStudentWelcomeTtsText(user.fullName);
  if (!text) return false;

  const preference = await getUserNarrationPreference(user.id);
  const voice = selectedVoice(preference);
  const identity = buildTtsArtifactKey({ text, language: 'en', voice });
  await withTransaction(client => enqueueTtsJob(client, {
    cacheKey: identity.cacheKey,
    identityKey: identity.identityKey,
    normalizedText: identity.normalizedText,
    avatarVoice: identity.avatarVoice,
    geminiVoice: GEMINI_TTS_VOICE_BY_AVATAR[voice] ?? voice,
    geminiModel: appConfig.KITABU_GEMINI_TTS_MODEL,
    language: identity.language,
    provider: 'cartesia',
    model: appConfig.KITABU_CARTESIA_MODEL,
    voice,
    learnerNeeded: true,
    priority: 20,
    metadata: { source: STUDENT_WELCOME_TTS_SOURCE }
  }));
  return true;
}

export type StudentWelcomeTtsResolution =
  | { status: 'ready'; audio: TextToSpeechResult; text: string }
  | { status: 'pending'; text: string }
  | { status: 'unavailable'; reason: string };

export async function resolveStudentWelcomeTts(userId: string): Promise<StudentWelcomeTtsResolution> {
  const user = await findUserById(userId);
  if (!user || !user.roles.includes('student')) {
    return { status: 'unavailable', reason: 'student_only' };
  }

  const preference = await getUserNarrationPreference(user.id);
  if (!canServeStudentWelcomeTts({ roles: user.roles, preference })) {
    return { status: 'unavailable', reason: 'narration_disabled' };
  }

  const text = buildStudentWelcomeTtsText(user.fullName);
  if (!text) return { status: 'unavailable', reason: 'name_unavailable' };

  const durableSpeech = await getOrCreateDurableSpeech({
    text,
    avatarVoice: selectedVoice(preference),
    language: 'en'
  });
  if (durableSpeech.audio) return { status: 'ready', audio: durableSpeech.audio, text };
  return { status: 'pending', text };
}
