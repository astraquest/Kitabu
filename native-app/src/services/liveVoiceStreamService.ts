import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import { getKitabuApiBaseUrl, getKitabuApiBaseUrls } from './runtimeConfig';
import { loadSecureJson } from './storage';
import { ChatMessage } from '../types/app';

const AUTH_SESSION_STORAGE_KEY = 'auth_session';

interface StoredSession {
  accessToken?: string;
}

type NativePcmRecorder = {
  startPcmStream?: () => Promise<boolean>;
  stopPcmStream?: () => Promise<boolean>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

type LiveVoiceStreamEvent =
  | { type: 'session.ready' }
  | { type: 'transcript.delta'; text: string }
  | { type: 'transcript.done'; text: string }
  | { type: 'response.delta'; text: string }
  | { type: 'response.done' }
  | { type: 'session.closed' }
  | { type: 'error'; message?: string };

export interface LiveVoiceStreamCallbacks {
  onReady?: () => void;
  onTranscriptDelta?: (text: string) => void;
  onTranscriptDone?: (text: string) => void;
  onResponseDelta?: (text: string) => void;
  onResponseDone?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
}

export interface LiveVoiceStreamSession {
  start: () => Promise<void>;
  stopAndCommit: () => Promise<void>;
  close: () => void;
}

const recorderModule = NativeModules.KitabuRecorder as NativePcmRecorder | undefined;
const recorderEvents = recorderModule ? new NativeEventEmitter(recorderModule) : null;
const NativeWebSocket = WebSocket as unknown as {
  new (
    url: string,
    protocols?: string | string[] | null,
    options?: { headers?: Record<string, string> },
  ): WebSocket;
};

function toWebSocketUrl(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  const wsBase = normalized.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  return `${wsBase}/live-audio/stream`;
}

async function getLiveVoiceWebSocketUrl() {
  const session = await loadSecureJson<StoredSession>(AUTH_SESSION_STORAGE_KEY, {});
  if (!session?.accessToken) {
    throw new Error('Sign in again to use live voice.');
  }

  const baseUrl = getKitabuApiBaseUrl() || getKitabuApiBaseUrls()[0];
  if (!baseUrl) {
    throw new Error('Kitabu API is not configured.');
  }

  return {
    token: session.accessToken,
    url: toWebSocketUrl(baseUrl),
  };
}

function parseServerEvent(raw: string): LiveVoiceStreamEvent | null {
  try {
    const event = JSON.parse(raw) as LiveVoiceStreamEvent;
    return event && typeof event.type === 'string' ? event : null;
  } catch {
    return null;
  }
}

export function isLiveVoiceStreamingSupported() {
  return Platform.OS === 'android' && Boolean(recorderModule?.startPcmStream && recorderModule.stopPcmStream);
}

export function createLiveVoiceStreamSession(args: {
  context?: string;
  history?: ChatMessage[];
  callbacks: LiveVoiceStreamCallbacks;
}): LiveVoiceStreamSession {
  let socket: WebSocket | null = null;
  let pcmSubscription: { remove: () => void } | null = null;
  let started = false;

  const send = (payload: Record<string, unknown>) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  };

  const stopNativePcm = () => {
    pcmSubscription?.remove();
    pcmSubscription = null;
    recorderModule?.stopPcmStream?.().catch(() => undefined);
  };

  const close = () => {
    stopNativePcm();
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
      send({ type: 'session.close' });
      socket.close();
    }
    socket = null;
    started = false;
  };

  return {
    async start() {
      if (!isLiveVoiceStreamingSupported()) {
        throw new Error('Realtime voice streaming is not supported on this device yet.');
      }
      if (started) {
        return;
      }

      const { token, url } = await getLiveVoiceWebSocketUrl();
      socket = new NativeWebSocket(url, undefined, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      await new Promise<void>((resolve, reject) => {
        if (!socket) {
          reject(new Error('Realtime voice failed to start.'));
          return;
        }

        socket.onopen = () => {
          send({
            type: 'session.start',
            context: args.context,
            history: args.history?.slice(-8),
          });
          pcmSubscription = recorderEvents?.addListener('KitabuRecorderPcmChunk', (chunk: string) => {
            send({ type: 'audio.append', audio: chunk });
          }) ?? null;
          recorderModule?.startPcmStream?.()
            .then(() => {
              started = true;
              resolve();
            })
            .catch(reject);
        };

        socket.onerror = () => {
          reject(new Error('Realtime voice connection failed.'));
        };

        socket.onmessage = message => {
          const event = parseServerEvent(String(message.data));
          if (!event) {
            return;
          }

          switch (event.type) {
            case 'session.ready':
              args.callbacks.onReady?.();
              break;
            case 'transcript.delta':
              args.callbacks.onTranscriptDelta?.(event.text);
              break;
            case 'transcript.done':
              args.callbacks.onTranscriptDone?.(event.text);
              break;
            case 'response.delta':
              args.callbacks.onResponseDelta?.(event.text);
              break;
            case 'response.done':
              args.callbacks.onResponseDone?.();
              break;
            case 'error':
              args.callbacks.onError?.(event.message || 'Realtime voice failed.');
              break;
            case 'session.closed':
              args.callbacks.onClose?.();
              break;
          }
        };

        socket.onclose = () => {
          stopNativePcm();
          started = false;
          args.callbacks.onClose?.();
        };
      });
    },
    async stopAndCommit() {
      if (!started) {
        return;
      }

      stopNativePcm();
      send({ type: 'audio.commit' });
      started = false;
    },
    close,
  };
}
