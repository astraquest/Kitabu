import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocket from '@fastify/websocket';
import WebSocket from 'ws';
import { createHash } from 'node:crypto';
import { appConfig } from './config.js';
import { verifyAccessToken } from './auth.js';
import {
  buildFeatureSystemInstruction,
  getFeatureSchemaVersion,
  resolveAiPromptVersion
} from './aiFeatures.js';
import {
  createAiGenerationRun,
  createAiUsageEvent,
  recordAiGenerationAttempt,
  withTransaction
} from './repositories.js';

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

function sha256Text(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function stableJsonStringify(value: unknown): string {
  if (value === undefined) {
    return '"__undefined__"';
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => stableJsonStringify(item)).join(',')}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJsonStringify(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashStableJson(value: unknown) {
  return sha256Text(stableJsonStringify(value));
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readRealtimeUsage(event: Record<string, unknown>) {
  const response = event.response && typeof event.response === 'object'
    ? (event.response as Record<string, unknown>)
    : {};
  const usage = response.usage && typeof response.usage === 'object'
    ? (response.usage as Record<string, unknown>)
    : {};

  return {
    promptTokens: readNumber(usage.input_tokens),
    completionTokens: readNumber(usage.output_tokens),
    totalTokens: readNumber(usage.total_tokens)
  };
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

function buildVoiceInstructions(context?: string, grade?: string | null) {
  const registryInstruction =
    buildFeatureSystemInstruction('live_voice_tutor', { grade: grade ?? undefined }) ??
    [
      'You are KITABU AI in live voice mode.',
      'Reply like a spoken tutor: concise, direct, and easy to read aloud.',
      'Ask at most one short follow-up question when useful.',
      'Avoid markdown, headings, lists, and meta commentary.'
    ].join('\n');

  return [
    registryInstruction,
    context?.trim() ? `Additional live session context:\n${context.trim()}` : null
  ]
    .filter(Boolean)
    .join('\n\n');
}

function createOpenAiRealtimeSocket(userId: string, model: string) {
  return new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
    headers: {
      Authorization: `Bearer ${appConfig.KITABU_OPENAI_API_KEY}`,
      'OpenAI-Safety-Identifier': userId
    }
  });
}

export function registerLiveAudioStreamRoutes(app: FastifyInstance) {
  app.register(websocket);

  app.get(
    '/live-audio/stream',
    {
      websocket: true,
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute'
        }
      }
    },
    async (socket, request) => {
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
    const feature = 'live_voice_tutor';
    const promptVersion = resolveAiPromptVersion(feature);
    const schemaVersion = getFeatureSchemaVersion(feature);
    const model = process.env.KITABU_OPENAI_REALTIME_MODEL?.trim() || 'gpt-realtime-2';
    let liveContext = '';
    let responseCounter = 0;
    let responseStartedAt: number | null = null;
    const pendingOpenAiEvents: Record<string, unknown>[] = [];

    const recordRealtimeGeneration = async (
      status: 'completed' | 'failed',
      event: Record<string, unknown>,
      errorSummary?: string
    ) => {
      const usage = status === 'completed' ? readRealtimeUsage(event) : {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      };
      const latencyMs = responseStartedAt ? Date.now() - responseStartedAt : 0;
      const promptHash = hashStableJson({
        feature,
        promptVersion,
        schemaVersion,
        instructions: buildVoiceInstructions(liveContext, user.grade)
      });
      const inputHash = hashStableJson({
        userId: user.id,
        responseCounter,
        contextHash: sha256Text(liveContext),
        model
      });
      const outputHash =
        status === 'completed'
          ? hashStableJson({
              responseId:
                event.response &&
                typeof event.response === 'object' &&
                'id' in event.response
                  ? (event.response as { id?: unknown }).id
                  : responseCounter,
              usage
            })
          : undefined;

      await withTransaction(async client => {
        const generationRun = await createAiGenerationRun(client, {
          userId: user.id,
          schoolId: user.schoolId,
          subscriptionId: null,
          feature,
          promptVersion,
          provider: 'openai',
          model,
          status,
          latencyMs,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          cacheStatus: 'bypassed',
          cacheKey: null,
          promptHash,
          inputHash,
          outputHash
        });
        await recordAiGenerationAttempt(client, {
          runId: generationRun.id,
          attemptNumber: 1,
          provider: 'openai',
          model,
          status,
          latencyMs,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsdMicros: 0,
          estimatedCostKshCents: 0,
          errorSummary: errorSummary?.slice(0, 500) ?? null
        });
        await createAiUsageEvent(client, {
          userId: user.id,
          schoolId: user.schoolId,
          subscriptionId: null,
          feature,
          provider: 'openai',
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCostUsdMicros: 0,
          fxRateKshPerUsd: appConfig.KITABU_KSH_PER_USD,
          estimatedCostKshCents: 0,
          promptVersion,
          status
        });
      });
    };

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

    openAiSocket = createOpenAiRealtimeSocket(user.id, model);

    openAiSocket.on('open', () => {
      openAiReady = true;
      sendOpenAi({
        type: 'session.update',
        session: {
          type: 'realtime',
          output_modalities: ['text'],
          instructions: buildVoiceInstructions('', user.grade),
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
          if (event.type === 'response.done') {
            void recordRealtimeGeneration('completed', event).catch(error => {
              request.log.warn({ err: error }, 'Failed to record realtime AI generation');
            });
          }
          break;
        case 'error':
          sendClient(socket, { type: 'error', message: event.error ?? 'Realtime voice failed.' });
          void recordRealtimeGeneration('failed', event, String(event.error ?? 'Realtime voice failed.')).catch(error => {
            request.log.warn({ err: error }, 'Failed to record realtime AI failure');
          });
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
        liveContext = event.context?.trim() ?? '';
        sendOpenAi({
          type: 'session.update',
          session: {
            instructions: buildVoiceInstructions(event.context, user.grade)
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
        responseCounter += 1;
        responseStartedAt = Date.now();
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
