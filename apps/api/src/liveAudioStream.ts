import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import WebSocket from 'ws';
import { appConfig } from './config.js';
import { verifyAccessToken } from './auth.js';

type ClientEvent =
  | { type: 'session.start'; context?: string; history?: Array<{ role: 'user' | 'model'; text: string }> }
  | { type: 'audio.append'; audio: string }
  | { type: 'audio.commit' }
  | { type: 'session.close' };

function sendClient(socket: WebSocket, payload: Record<string, unknown>) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function parseClientEvent(message: WebSocket.RawData): ClientEvent | null {
  try {
    const parsed = JSON.parse(message.toString()) as ClientEvent;
    return parsed && typeof parsed.type === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

async function authenticateRealtimeRequest(request: FastifyRequest) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    return null;
  }

  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

function buildVoiceInstructions(context?: string) {
  return [
    'You are KITABU AI in live voice mode.',
    'Reply like a spoken tutor: concise, direct, and easy to read aloud.',
    'Ask at most one short follow-up question when useful.',
    'Avoid markdown, headings, lists, and meta commentary.',
    context?.trim() ? `Student context:\n${context.trim()}` : null
  ]
    .filter(Boolean)
    .join('\n\n');
}

function createOpenAiRealtimeSocket(userId: string) {
  const model = process.env.KITABU_OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-2';
  return new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    headers: {
      Authorization: `Bearer ${appConfig.KITABU_OPENAI_API_KEY}`,
      'OpenAI-Safety-Identifier': userId
    }
  });
}

export function registerLiveAudioStreamRoutes(app: FastifyInstance) {
  app.register(websocket);

  app.get('/live-audio/stream', { websocket: true }, async (socket, request) => {
    const user = await authenticateRealtimeRequest(request);
    if (!user) {
      sendClient(socket, { type: 'error', message: 'Authentication required.' });
      socket.close(1008, 'authentication required');
      return;
    }

    if (!appConfig.KITABU_OPENAI_API_KEY) {
      sendClient(socket, { type: 'error', message: 'Realtime voice is not configured.' });
      socket.close(1011, 'realtime not configured');
      return;
    }

    let openAiSocket: WebSocket | null = null;
    let openAiReady = false;
    const pendingOpenAiEvents: Record<string, unknown>[] = [];

    const sendOpenAi = (event: Record<string, unknown>) => {
      if (openAiSocket?.readyState === WebSocket.OPEN && openAiReady) {
        openAiSocket.send(JSON.stringify(event));
        return;
      }
      pendingOpenAiEvents.push(event);
    };

    const flushOpenAiEvents = () => {
      while (openAiSocket?.readyState === WebSocket.OPEN && openAiReady && pendingOpenAiEvents.length) {
        openAiSocket.send(JSON.stringify(pendingOpenAiEvents.shift()));
      }
    };

    const closeBoth = () => {
      if (openAiSocket?.readyState === WebSocket.OPEN || openAiSocket?.readyState === WebSocket.CONNECTING) {
        openAiSocket.close();
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };

    openAiSocket = createOpenAiRealtimeSocket(user.id);

    openAiSocket.on('open', () => {
      openAiReady = true;
      sendOpenAi({
        type: 'session.update',
        session: {
          type: 'realtime',
          output_modalities: ['text'],
          instructions: buildVoiceInstructions(),
          audio: {
            input: {
              format: {
                type: 'audio/pcm',
                rate: 24000
              },
              transcription: {
                model: 'gpt-realtime-whisper',
                language: 'en',
                delay: 'low'
              },
              turn_detection: null
            }
          }
        }
      });
      flushOpenAiEvents();
      sendClient(socket, { type: 'session.ready' });
    });

    openAiSocket.on('message', message => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(message.toString()) as Record<string, unknown>;
      } catch {
        request.log.warn('Ignoring malformed OpenAI realtime event');
        return;
      }

      switch (event.type) {
        case 'conversation.item.input_audio_transcription.delta':
        case 'conversation.item.input_audio_transcription.completed':
          sendClient(socket, {
            type: event.type === 'conversation.item.input_audio_transcription.delta' ? 'transcript.delta' : 'transcript.done',
            text: event.delta ?? event.transcript ?? ''
          });
          break;
        case 'response.text.delta':
        case 'response.output_text.delta':
          sendClient(socket, { type: 'response.delta', text: event.delta ?? '' });
          break;
        case 'response.text.done':
        case 'response.output_text.done':
        case 'response.done':
          sendClient(socket, { type: 'response.done' });
          break;
        case 'error':
          sendClient(socket, { type: 'error', message: event.error ?? 'Realtime voice failed.' });
          break;
      }
    });

    openAiSocket.on('error', error => {
      request.log.error({ err: error }, 'OpenAI realtime socket failed');
      sendClient(socket, { type: 'error', message: 'Realtime voice connection failed.' });
    });

    openAiSocket.on('close', () => {
      if (socket.readyState === WebSocket.OPEN) {
        sendClient(socket, { type: 'session.closed' });
      }
    });

    socket.on('message', message => {
      const event = parseClientEvent(message);
      if (!event) {
        sendClient(socket, { type: 'error', message: 'Invalid realtime voice event.' });
        return;
      }

      if (event.type === 'session.start') {
        sendOpenAi({
          type: 'session.update',
          session: {
            instructions: buildVoiceInstructions(event.context)
          }
        });
        return;
      }

      if (event.type === 'audio.append') {
        if (event.audio) {
          sendOpenAi({ type: 'input_audio_buffer.append', audio: event.audio });
        }
        return;
      }

      if (event.type === 'audio.commit') {
        sendOpenAi({ type: 'input_audio_buffer.commit' });
        sendOpenAi({
          type: 'response.create',
          response: {
            output_modalities: ['text']
          }
        });
        return;
      }

      closeBoth();
    });

    socket.on('close', closeBoth);
    socket.on('error', closeBoth);
  });
}
