import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import { extractCurriculumFromPdfData, transcribeAudio } from './aiService';
import { Attachment, LearningStrand } from '../types/app';

export type NativeBridgeState = 'simulated' | 'android_native';

export interface AudioRecordingBridge {
  state: NativeBridgeState;
  startRecording: () => Promise<string | null>;
  stopRecording: () => Promise<string | null>;
  transcribeClip: (audioPath?: string | null) => Promise<string | null>;
  transcribeAnswer: (questionIndex: number, audioPath?: string | null) => Promise<string>;
}

export interface LiveAudioBridge {
  state: NativeBridgeState;
  getPromptRotation: () => string[];
  createSession: () => LiveAudioSession;
}

export interface LiveAudioSnapshot {
  status: 'connecting' | 'connected' | 'error' | 'disconnected';
  isMicOn: boolean;
  volumeLevel: number;
  prompt: string;
}

export interface LiveAudioSession {
  getSnapshot: () => LiveAudioSnapshot;
  subscribe: (listener: (snapshot: LiveAudioSnapshot) => void) => () => void;
  toggleMic: () => void;
  reconnect: () => void;
  close: () => void;
}

export interface SpeechPlaybackBridge {
  state: NativeBridgeState;
  speak: (text: string) => Promise<void>;
  stop: () => Promise<void>;
  getNarrationPulseSeed: () => number;
}

export interface CurriculumImportBridge {
  state: NativeBridgeState;
  pickPdf: () => Promise<{ uri: string; name: string; base64Data?: string; mimeType?: string } | null>;
  extractCurriculum: (
    grade: string,
    subjectId: string,
    subjectName: string,
    fileMeta?: { uri: string; name: string; base64Data?: string; mimeType?: string } | null,
  ) => Promise<LearningStrand[]>;
}

export interface ChatAttachmentBridge {
  state: NativeBridgeState;
  takePhoto: () => Promise<Attachment | null>;
  pickImage: () => Promise<Attachment | null>;
  pickFile: () => Promise<Attachment | null>;
}

const transcriptionFallbacks = [
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
];

const livePrompts = [
  'What have you already tried so far?',
  'Which part of the topic feels confusing right now?',
  'Can you explain the idea in your own words first?',
  'What clue do you notice in the question?',
];

function createSimulatedLiveAudioSession(): LiveAudioSession {
  let snapshot: LiveAudioSnapshot = {
    status: 'connecting',
    isMicOn: true,
    volumeLevel: 0,
    prompt: livePrompts[0],
  };
  const listeners = new Set<(value: LiveAudioSnapshot) => void>();
  let pulseTimer: ReturnType<typeof setInterval> | null = null;
  let promptTimer: ReturnType<typeof setInterval> | null = null;
  let speakingCooldown: ReturnType<typeof setTimeout> | null = null;
  let promptIndex = 0;

  const emit = () => {
    listeners.forEach(listener => listener(snapshot));
  };

  const setSnapshot = (next: Partial<LiveAudioSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    emit();
  };

  const clearTimers = () => {
    if (pulseTimer) {
      clearInterval(pulseTimer);
      pulseTimer = null;
    }
    if (promptTimer) {
      clearInterval(promptTimer);
      promptTimer = null;
    }
    if (speakingCooldown) {
      clearTimeout(speakingCooldown);
      speakingCooldown = null;
    }
  };

  const startConnectedLoop = () => {
    clearTimers();
    setSnapshot({ status: 'connected', prompt: livePrompts[promptIndex], volumeLevel: 0.08 });

    pulseTimer = setInterval(() => {
      setSnapshot({
        volumeLevel: snapshot.isMicOn
          ? Math.max(0.04, Math.min(0.86, snapshot.volumeLevel + (Math.random() - 0.42) * 0.22))
          : 0,
      });
    }, 120);

    promptTimer = setInterval(() => {
      promptIndex = (promptIndex + 1) % livePrompts.length;
      setSnapshot({
        prompt: livePrompts[promptIndex],
        volumeLevel: snapshot.isMicOn ? 0.62 : 0,
      });

      speakingCooldown = setTimeout(() => {
        setSnapshot({ volumeLevel: snapshot.isMicOn ? 0.12 : 0 });
      }, 1400);
    }, 5200);
  };

  const connect = () => {
    clearTimers();
    setSnapshot({ status: 'connecting', volumeLevel: 0.04 });
    speakingCooldown = setTimeout(() => {
      startConnectedLoop();
    }, 900);
  };

  connect();

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot);
      return () => {
        listeners.delete(listener);
      };
    },
    toggleMic() {
      setSnapshot({
        isMicOn: !snapshot.isMicOn,
        volumeLevel: snapshot.isMicOn ? 0 : 0.16,
      });
    },
    reconnect() {
      promptIndex = 0;
      connect();
    },
    close() {
      clearTimers();
      setSnapshot({ status: 'disconnected', volumeLevel: 0 });
    },
  };
}

const speechModule = NativeModules.KitabuSpeech as
  | {
      speak: (text: string) => Promise<boolean>;
      stop: () => Promise<boolean>;
    }
  | undefined;

const recorderModule = NativeModules.KitabuRecorder as
  | {
      startRecording: () => Promise<string>;
      stopRecording: () => Promise<string>;
      readAudioAsBase64?: (audioPath: string) => Promise<string>;
      transcribeAudio?: (audioPath: string, questionIndex: number) => Promise<string>;
    }
  | undefined;

const documentPickerModule = NativeModules.KitabuDocumentPicker as
  | {
      pickPdf: () => Promise<{
        uri: string;
        name: string;
        base64Data?: string;
        mimeType?: string;
      }>;
      pickImage?: () => Promise<{
        uri: string;
        name: string;
        base64Data?: string;
        mimeType?: string;
      }>;
      pickFile?: () => Promise<{
        uri: string;
        name: string;
        base64Data?: string;
        mimeType?: string;
      }>;
      takePhoto?: () => Promise<{
        uri: string;
        name: string;
        base64Data?: string;
        mimeType?: string;
      }>;
    }
  | undefined;

function mapFileMetaToAttachment(
  fileMeta?: { name?: string; base64Data?: string; mimeType?: string } | null,
  fallbackType: Attachment['type'] = 'file',
): Attachment | null {
  if (!fileMeta?.base64Data || !fileMeta.mimeType) {
    return null;
  }

  return {
    data: fileMeta.base64Data,
    mimeType: fileMeta.mimeType,
    name: fileMeta.name,
    type: fileMeta.mimeType.startsWith('image/') ? 'image' : fallbackType,
  };
}

function parseBase64Audio(audioPath?: string | null) {
  if (!audioPath) {
    return null;
  }

  const dataUriMatch = audioPath.match(/^data:(.+);base64,(.+)$/);
  if (dataUriMatch) {
    return {
      mimeType: dataUriMatch[1],
      data: dataUriMatch[2],
    };
  }

  if (/^[A-Za-z0-9+/=]+$/.test(audioPath) && audioPath.length > 128) {
    return {
      mimeType: 'audio/mp4',
      data: audioPath,
    };
  }

  return null;
}

function normalizeImportedCurriculum(
  payload: Awaited<ReturnType<typeof extractCurriculumFromPdfData>>,
  seed: string,
  subjectName: string,
) {
  if (!payload || payload.length === 0) {
    return null;
  }

  return payload.map((strand, strandIndex) => ({
    id: `${seed}-strand-${strandIndex + 1}`,
    number: strand.number || `${strandIndex + 1}.0`,
    title: strand.title,
    subTitle: `${subjectName} imported curriculum`,
    subStrands: (strand.subStrands || []).map((sub, subIndex) => ({
      id: `${seed}-sub-${strandIndex + 1}-${subIndex + 1}`,
      number: sub.number || `${strandIndex + 1}.${subIndex + 1}`,
      title: sub.title,
      type: 'knowledge' as const,
      isLocked: subIndex > 0,
      isCompleted: false,
      pages: [],
      outcomes: (sub.outcomes || []).map((outcome, outcomeIndex) => ({
        id: `${seed}-outcome-${strandIndex + 1}-${subIndex + 1}-${outcomeIndex + 1}`,
        text: typeof outcome === 'string' ? outcome : outcome.text,
      })),
      inquiryQuestions: (sub.inquiryQuestions || []).map((question, questionIndex) => ({
        id: `${seed}-question-${strandIndex + 1}-${subIndex + 1}-${questionIndex + 1}`,
        text: typeof question === 'string' ? question : question.text,
      })),
    })),
  }));
}

async function ensureRecordPermission() {
  if (Platform.OS !== 'android') {
    return false;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export const audioRecordingBridge: AudioRecordingBridge = {
  state: Platform.OS === 'android' && recorderModule ? 'android_native' : 'simulated',
  async startRecording() {
    if (Platform.OS === 'android' && recorderModule) {
      const granted = await ensureRecordPermission();
      if (!granted) {
        return null;
      }

      return recorderModule.startRecording();
    }

    return null;
  },
  async stopRecording() {
    if (Platform.OS === 'android' && recorderModule) {
      return recorderModule.stopRecording();
    }

    return null;
  },
  async transcribeClip(_audioPath) {
    if (_audioPath && Platform.OS === 'android' && recorderModule?.transcribeAudio) {
      try {
        const transcript = await recorderModule.transcribeAudio(_audioPath, 0);
        if (transcript?.trim()) {
          return transcript.trim();
        }
      } catch {
        // Fall through to the next available path.
      }
    }

    const parsedAudio = parseBase64Audio(_audioPath);
    if (parsedAudio) {
      try {
        const transcript = await transcribeAudio(parsedAudio.data, parsedAudio.mimeType);
        if (transcript.trim()) {
          return transcript.trim();
        }
      } catch {
        // Fall back to deterministic local copy below.
      }
    }

    if (_audioPath && Platform.OS === 'android' && recorderModule?.readAudioAsBase64) {
      try {
        const base64Audio = await recorderModule.readAudioAsBase64(_audioPath);
        if (base64Audio?.trim()) {
          const transcript = await transcribeAudio(base64Audio, 'audio/mp4');
          if (transcript.trim()) {
            return transcript.trim();
          }
        }
      } catch {
        // Fall back to deterministic local copy below.
      }
    }

    return null;
  },
  async transcribeAnswer(questionIndex, _audioPath) {
    const transcript = await this.transcribeClip(_audioPath);
    if (transcript?.trim()) {
      return transcript.trim();
    }

    return transcriptionFallbacks[questionIndex % transcriptionFallbacks.length];
  },
};

export const liveAudioBridge: LiveAudioBridge = {
  state: 'simulated',
  getPromptRotation() {
    return livePrompts;
  },
  createSession() {
    return createSimulatedLiveAudioSession();
  },
};

export const speechPlaybackBridge: SpeechPlaybackBridge = {
  state: Platform.OS === 'android' && speechModule ? 'android_native' : 'simulated',
  async speak(text) {
    if (Platform.OS === 'android' && speechModule) {
      await speechModule.speak(text);
    }
  },
  async stop() {
    if (Platform.OS === 'android' && speechModule) {
      await speechModule.stop();
    }
  },
  getNarrationPulseSeed() {
    return 0.12;
  },
};

export const curriculumImportBridge: CurriculumImportBridge = {
  state:
    Platform.OS === 'android' && documentPickerModule ? 'android_native' : 'simulated',
  async pickPdf() {
    if (Platform.OS === 'android' && documentPickerModule) {
      return documentPickerModule.pickPdf();
    }

    return null;
  },
  async extractCurriculum(grade, subjectId, subjectName, fileMeta) {
    const seed = `${grade}-${subjectId}`;
    if (fileMeta?.base64Data) {
      try {
        const extracted = await extractCurriculumFromPdfData(
          fileMeta.base64Data,
          fileMeta.mimeType || 'application/pdf',
        );
        const normalized = normalizeImportedCurriculum(extracted, seed, subjectName);
        if (normalized && normalized.length > 0) {
          return normalized;
        }
      } catch {
        return [];
      }
    }

    return [];
  },
};

export const chatAttachmentBridge: ChatAttachmentBridge = {
  state:
    Platform.OS === 'android' && documentPickerModule ? 'android_native' : 'simulated',
  async takePhoto() {
    if (Platform.OS === 'android' && documentPickerModule?.takePhoto) {
      return mapFileMetaToAttachment(await documentPickerModule.takePhoto(), 'image');
    }

    return null;
  },
  async pickImage() {
    if (Platform.OS === 'android' && documentPickerModule?.pickImage) {
      return mapFileMetaToAttachment(await documentPickerModule.pickImage(), 'image');
    }

    return null;
  },
  async pickFile() {
    if (Platform.OS === 'android' && documentPickerModule?.pickFile) {
      return mapFileMetaToAttachment(await documentPickerModule.pickFile(), 'file');
    }

    return null;
  },
};

export function getNativeCapabilityStatus() {
  return {
    audioRecording: audioRecordingBridge.state,
    liveStreaming: liveAudioBridge.state,
    speechPlayback: speechPlaybackBridge.state,
    pdfImport: curriculumImportBridge.state,
    chatAttachments: chatAttachmentBridge.state,
  } as const;
}
