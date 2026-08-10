import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioRecorder,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Linking, NativeModules, Platform } from 'react-native';

import { extractCurriculumFromPdfData, synthesizeLandingSpeech, synthesizeSpeech, transcribeAudio } from './aiService';
import { playAudioPlayerWhenAllowed } from './audioPlayback';
import { getStudentWelcomeSpeech } from './studentWelcomeService';
import { Attachment, LearningStrand, OnboardingVoiceName } from '../types/app';

export type NativeBridgeState = 'simulated' | 'expo_native';

export interface AudioRecordingBridge {
  state: NativeBridgeState;
  startRecording: () => Promise<boolean>;
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
  speak: (text: string, options?: SpeechPlaybackOptions) => Promise<void>;
  speakQueued: (text: string, options?: SpeechPlaybackOptions) => Promise<void>;
  playWelcome: () => Promise<boolean>;
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

export interface FocusModeBridge {
  state: NativeBridgeState;
  startScreenPinning: () => Promise<void>;
  stopScreenPinning: () => Promise<void>;
  isScreenPinningSupported: () => Promise<boolean>;
  openScreenPinningSettings: () => Promise<void>;
  confirmDeviceCredential: (title: string, description: string) => Promise<void>;
}

interface NativeFocusModeModule {
  startScreenPinning?: () => Promise<boolean>;
  stopScreenPinning?: () => Promise<boolean>;
  isScreenPinningSupported?: () => Promise<boolean>;
  openScreenPinningSettings?: () => Promise<boolean>;
  confirmDeviceCredential?: (title: string, description: string) => Promise<boolean>;
}

const MAX_CHAT_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const nativeFocusModeModule =
  NativeModules.KitabuFocusMode as NativeFocusModeModule | undefined;

const transcriptionFallbacks = [
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
  'Audio transcription is unavailable on this device.',
];

const speechRecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 24000,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    maxFileSize: 650_000,
  },
  web: {
    ...RecordingPresets.HIGH_QUALITY.web,
    bitsPerSecond: 24000,
  },
};

let speechAudioPlayer: AudioPlayer | null = null;
let cancelPendingSpeechPlay: (() => void) | null = null;
let speechQueue: Promise<void> = Promise.resolve();
let speechQueueGeneration = 0;

async function playServerSpeech(
  text: string,
  options: SpeechPlaybackOptions | undefined,
  isCurrent: () => boolean,
): Promise<boolean> {
  const speech = options?.welcomeCue
    ? (await getStudentWelcomeSpeech()).audio
    : options?.landingCueId
    ? await synthesizeLandingSpeech(options.landingCueId, options.voiceName!, options.language)
    : await synthesizeSpeech(text, options?.voiceName, options?.language);
  if (!speech) return false;
  if (!isCurrent()) {
    return false;
  }
  const extension = speech.mimeType === 'audio/wav' ? 'wav' : 'audio';
  const uri = `${FileSystem.cacheDirectory}kitabu-tts-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(uri, speech.base64Audio, {
    encoding: FileSystem.EncodingType.Base64,
  });
  speechAudioPlayer = createAudioPlayer(uri, { downloadFirst: true });
  cancelPendingSpeechPlay?.();
  cancelPendingSpeechPlay = playAudioPlayerWhenAllowed(speechAudioPlayer);
  return true;
}

interface SpeechPlaybackOptions {
  voiceName?: OnboardingVoiceName;
  language?: string;
  landingCueId?: string;
  welcomeCue?: boolean;
}

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

let activeRecording: AudioRecorder | null = null;

type WebFileLike = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name?: string;
  size?: number;
  type?: string;
};

function isWebFileLike(value: unknown): value is WebFileLike {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function',
  );
}

function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const globalWithBase64 = globalThis as unknown as {
    Buffer?: { from: (input: Uint8Array) => { toString: (encoding: 'base64') => string } };
    btoa?: (value: string) => string;
  };

  if (globalWithBase64.Buffer) {
    return globalWithBase64.Buffer.from(bytes).toString('base64');
  }

  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (globalWithBase64.btoa) {
    return globalWithBase64.btoa(binary);
  }

  throw new Error('This device cannot read attachments.');
}

function readDataUriAsBase64(uri: string) {
  const dataUriMatch = uri.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/);
  return dataUriMatch?.[2] ?? null;
}

async function readWebFileAsBase64(file: WebFileLike) {
  assertChatAttachmentSize(file.size);
  const base64Data = arrayBufferToBase64(await file.arrayBuffer());
  assertChatAttachmentSize(estimateBase64DecodedBytes(base64Data));
  return base64Data;
}

async function readFetchableUriAsBase64(uri: string) {
  const webFetch = (globalThis as unknown as { fetch?: typeof fetch }).fetch;
  if (Platform.OS !== 'web' || !webFetch || !/^(blob:|https?:)/i.test(uri)) {
    return null;
  }

  const response = await webFetch(uri);
  if (!response.ok) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  assertChatAttachmentSize(arrayBuffer.byteLength);
  return arrayBufferToBase64(arrayBuffer);
}

async function readFileAsBase64(uri?: string | null, webFile?: unknown) {
  if (isWebFileLike(webFile)) {
    return readWebFileAsBase64(webFile);
  }

  if (!uri) {
    return null;
  }

  const dataUriBase64 = readDataUriAsBase64(uri);
  if (dataUriBase64) {
    assertChatAttachmentSize(estimateBase64DecodedBytes(dataUriBase64));
    return dataUriBase64;
  }

  const fetchedBase64 = await readFetchableUriAsBase64(uri);
  if (fetchedBase64) {
    return fetchedBase64;
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function estimateBase64DecodedBytes(base64Data: string) {
  const trimmed = base64Data.trim();
  const padding = trimmed.endsWith('==') ? 2 : trimmed.endsWith('=') ? 1 : 0;
  return Math.floor((trimmed.length * 3) / 4) - padding;
}

async function getLocalFileSize(uri?: string | null) {
  if (!uri) {
    return null;
  }

  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
}

function assertChatAttachmentSize(size?: number | null) {
  if (typeof size === 'number' && size > MAX_CHAT_ATTACHMENT_BYTES) {
    throw new Error(
      `Attachment is too large. Please choose a file under ${formatFileSize(MAX_CHAT_ATTACHMENT_BYTES)}.`,
    );
  }
}

async function mapDocumentAssetToFileMeta(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<{ uri: string; name: string; base64Data?: string; mimeType?: string; size?: number }> {
  const webFile = (asset as unknown as { file?: unknown }).file;
  const webFileMeta = isWebFileLike(webFile) ? webFile : null;
  const size = asset.size ?? webFileMeta?.size ?? await getLocalFileSize(asset.uri);
  assertChatAttachmentSize(size);
  const base64Data = await readFileAsBase64(asset.uri, webFile) ?? undefined;
  assertChatAttachmentSize(base64Data ? estimateBase64DecodedBytes(base64Data) : size);

  return {
    uri: asset.uri,
    name: asset.name || webFileMeta?.name || 'attachment',
    mimeType: asset.mimeType || webFileMeta?.type || 'application/octet-stream',
    base64Data,
    size: size ?? undefined,
  };
}

async function mapImageAssetToFileMeta(
  asset: ImagePicker.ImagePickerAsset,
): Promise<{ uri: string; name: string; base64Data?: string; mimeType?: string; size?: number }> {
  const webFile = (asset as unknown as { file?: unknown }).file;
  const webFileMeta = isWebFileLike(webFile) ? webFile : null;
  const extension = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
  const size = asset.fileSize ?? webFileMeta?.size ?? await getLocalFileSize(asset.uri);
  assertChatAttachmentSize(size);
  const base64Data = asset.base64 ?? await readFileAsBase64(asset.uri, webFile) ?? undefined;
  assertChatAttachmentSize(base64Data ? estimateBase64DecodedBytes(base64Data) : size);

  return {
    uri: asset.uri,
    name: asset.fileName || webFileMeta?.name || `kitabu-image.${extension}`,
    mimeType: asset.mimeType || webFileMeta?.type || 'image/jpeg',
    base64Data,
    size: size ?? undefined,
  };
}

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

function inferAudioMimeType(uri?: string | null) {
  const extension = uri?.split('?')[0]?.split('.').pop()?.toLowerCase();

  switch (extension) {
    case '3gp':
      return 'audio/3gpp';
    case 'aac':
      return 'audio/aac';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    default:
      return 'audio/mp4';
  }
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
      topics: (sub.topics || []).map((topic, topicIndex) => ({
        id: `${seed}-topic-${strandIndex + 1}-${subIndex + 1}-${topicIndex + 1}`,
        code: topic.code,
        title: topic.title,
        description: topic.description,
        position: topicIndex,
      })),
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

export const audioRecordingBridge: AudioRecordingBridge = {
  state: 'expo_native',
  async startRecording() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      return false;
    }

    if (activeRecording) {
      await activeRecording.stop().catch(() => undefined);
      activeRecording = null;
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const recording = new AudioModule.AudioRecorder(speechRecordingOptions);
    await recording.prepareToRecordAsync();
    recording.record();
    activeRecording = recording;
    // Android may not expose a usable file URI until stop() completes. The UI
    // previously treated that pre-stop URI as the success signal, so recording
    // started natively but immediately appeared to fail after permission grant.
    return true;
  },
  async stopRecording() {
    if (!activeRecording) {
      return null;
    }

    const recording = activeRecording;
    activeRecording = null;
    try {
      await recording.stop();
      return recording.uri;
    } finally {
      await setAudioModeAsync({
        allowsRecording: false,
      }).catch(() => undefined);
    }
  },
  async transcribeClip(_audioPath) {
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

    if (_audioPath) {
      try {
        const base64Audio = await readFileAsBase64(_audioPath);
        if (base64Audio?.trim()) {
          const transcript = await transcribeAudio(base64Audio, inferAudioMimeType(_audioPath));
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
  state: 'expo_native',
  async speak(text, options) {
    speechQueueGeneration += 1;
    speechQueue = Promise.resolve();
    await this.stop();
    const generation = speechQueueGeneration;
    await playServerSpeech(text, options, () => speechQueueGeneration === generation);
  },
  speakQueued(text, options) {
    if (!text.trim()) {
      return Promise.resolve();
    }

    const generation = speechQueueGeneration;
    speechQueue = speechQueue.then(async () => {
      if (generation !== speechQueueGeneration) {
        return;
      }
      await playServerSpeech(text, options, () => speechQueueGeneration === generation);
    });
    return speechQueue;
  },
  async playWelcome() {
    speechQueueGeneration += 1;
    speechQueue = Promise.resolve();
    await this.stop();
    const generation = speechQueueGeneration;
    return playServerSpeech('', { welcomeCue: true }, () => speechQueueGeneration === generation);
  },
  async stop() {
    speechQueueGeneration += 1;
    speechQueue = Promise.resolve();
    cancelPendingSpeechPlay?.();
    cancelPendingSpeechPlay = null;
    if (speechAudioPlayer) {
      speechAudioPlayer.pause();
      speechAudioPlayer.remove();
      speechAudioPlayer = null;
    }
  },
  getNarrationPulseSeed() {
    return 0.12;
  },
};

export const curriculumImportBridge: CurriculumImportBridge = {
  state: 'expo_native',
  async pickPdf() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: 'application/pdf',
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return mapDocumentAssetToFileMeta(result.assets[0]);
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
  state: 'expo_native',
  async takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    return mapFileMetaToAttachment(await mapImageAssetToFileMeta(result.assets[0]), 'image');
  },
  async pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    return mapFileMetaToAttachment(await mapImageAssetToFileMeta(result.assets[0]), 'image');
  },
  async pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    return mapFileMetaToAttachment(await mapDocumentAssetToFileMeta(result.assets[0]), 'file');
  },
};

function createFocusModeUnavailableError() {
  return new Error('Focus Mode is available on Android phones with App Pinning support.');
}

export const focusModeBridge: FocusModeBridge = {
  state: Platform.OS === 'android' && nativeFocusModeModule ? 'expo_native' : 'simulated',
  async startScreenPinning() {
    if (Platform.OS !== 'android' || !nativeFocusModeModule?.startScreenPinning) {
      throw createFocusModeUnavailableError();
    }

    await nativeFocusModeModule.startScreenPinning();
  },
  async stopScreenPinning() {
    if (Platform.OS !== 'android' || !nativeFocusModeModule?.stopScreenPinning) {
      return;
    }

    await nativeFocusModeModule.stopScreenPinning();
  },
  async isScreenPinningSupported() {
    if (Platform.OS !== 'android' || !nativeFocusModeModule?.isScreenPinningSupported) {
      return false;
    }

    return nativeFocusModeModule.isScreenPinningSupported();
  },
  async openScreenPinningSettings() {
    if (Platform.OS === 'android' && nativeFocusModeModule?.openScreenPinningSettings) {
      await nativeFocusModeModule.openScreenPinningSettings();
      return;
    }

    await Linking.openSettings();
  },
  async confirmDeviceCredential(title, description) {
    if (Platform.OS !== 'android' || !nativeFocusModeModule?.confirmDeviceCredential) {
      throw createFocusModeUnavailableError();
    }

    await nativeFocusModeModule.confirmDeviceCredential(title, description);
  },
};

export function getNativeCapabilityStatus() {
  return {
    audioRecording: audioRecordingBridge.state,
    liveStreaming: liveAudioBridge.state,
    speechPlayback: speechPlaybackBridge.state,
    pdfImport: curriculumImportBridge.state,
    chatAttachments: chatAttachmentBridge.state,
    focusMode: focusModeBridge.state,
  } as const;
}
