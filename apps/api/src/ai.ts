import { appConfig } from './config.js';

export interface GenerateTextInput {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  feature?: string;
  attachment?: {
    mimeType: string;
    data: string;
    name?: string;
    type: 'image' | 'file';
  };
  history?: Array<{
    role: 'user' | 'model';
    text: string;
  }>;
}

export interface AiProviderResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  plan?: AiExecutionPlan;
}

export interface AudioTranscriptionInput {
  base64Audio: string;
  mimeType: string;
  fileName?: string;
  language?: string;
  prompt?: string;
}

export interface TextToSpeechInput {
  text: string;
  voice?: string;
  responseFormat?: 'wav';
}

export interface TextToSpeechResult {
  base64Audio: string;
  mimeType: string;
  model: string;
  voice: string;
}

export type AiProvider = 'openai' | 'google' | 'groq' | 'nvidia';
export type AudioTranscriptionProvider = 'openai' | 'groq';

export interface AiExecutionPlan {
  provider: AiProvider;
  model: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface AudioTranscriptionPlan {
  provider: AudioTranscriptionProvider;
  model: string;
}

function isCurriculumReasoningFeature(feature: string) {
  const normalizedFeature = feature.trim().toLowerCase();
  return [
    'curriculum_extraction',
    'curriculum_document_processing',
    'curriculum_import_processing'
  ].includes(normalizedFeature);
}

export function resolveAiExecutionPlans(input: Pick<GenerateTextInput, 'feature' | 'attachment'>): AiExecutionPlan[] {
  const feature = input.feature ?? 'general';
  const supportsTextOnlyFallbacks = !input.attachment;
  const plans: AiExecutionPlan[] = [];

  if (appConfig.KITABU_OPENAI_API_KEY) {
    if (isCurriculumReasoningFeature(feature)) {
      plans.push({
        provider: 'openai',
        model: appConfig.KITABU_OPENAI_REASONING_MODEL,
        reasoningEffort: appConfig.KITABU_OPENAI_REASONING_EFFORT
      });
    } else {
      plans.push({
        provider: 'openai',
        model: appConfig.KITABU_OPENAI_STUDENT_MODEL
      });
    }
  }

  if (supportsTextOnlyFallbacks && isCurriculumReasoningFeature(feature)) {
    if (appConfig.KITABU_NVIDIA_API_KEY) {
      plans.push(
        {
          provider: 'nvidia',
          model: appConfig.KITABU_NVIDIA_NEMOTRON_ULTRA_MODEL
        },
        {
          provider: 'nvidia',
          model: appConfig.KITABU_NVIDIA_DEEPSEEK_PRO_MODEL
        }
      );
    }

    if (appConfig.KITABU_GROQ_API_KEY) {
      plans.push({
        provider: 'groq',
        model: appConfig.KITABU_GROQ_TEXT_SMART_MODEL
      });
    }
  } else if (supportsTextOnlyFallbacks) {
    if (appConfig.KITABU_GROQ_API_KEY) {
      plans.push({
        provider: 'groq',
        model: appConfig.KITABU_GROQ_TEXT_FAST_MODEL
      });
    }

    if (appConfig.KITABU_NVIDIA_API_KEY) {
      plans.push({
        provider: 'nvidia',
        model: appConfig.KITABU_NVIDIA_DEEPSEEK_FLASH_MODEL
      });
    }
  }

  if (appConfig.KITABU_GEMINI_API_KEY) {
    plans.push({
      provider: 'google',
      model: appConfig.KITABU_GEMINI_MODEL
    });
  }

  if (plans.length === 0) {
    throw new Error('No AI provider is configured');
  }

  return plans;
}

export function resolveAiExecutionPlan(feature: string): AiExecutionPlan {
  return resolveAiExecutionPlans({ feature })[0];
}

export function resolveAudioTranscriptionPlans(): AudioTranscriptionPlan[] {
  const plans: AudioTranscriptionPlan[] = [];

  if (appConfig.KITABU_OPENAI_API_KEY) {
    plans.push({
      provider: 'openai',
      model: appConfig.KITABU_OPENAI_TRANSCRIPTION_MODEL
    });
  }

  if (appConfig.KITABU_GROQ_API_KEY) {
    plans.push(
      {
        provider: 'groq',
        model: appConfig.KITABU_GROQ_STT_FAST_MODEL
      },
      {
        provider: 'groq',
        model: appConfig.KITABU_GROQ_STT_ACCURATE_MODEL
      }
    );
  }

  if (plans.length === 0) {
    throw new Error('No audio transcription provider is configured');
  }

  return plans;
}

function getOpenAiTokenPricingUsdPerMillion(model: string) {
  const normalizedModel = model.trim().toLowerCase();

  if (normalizedModel.includes('gpt-5.4-nano') || normalizedModel.includes('gpt-5-nano')) {
    return {
      input: 0.05,
      output: 0.4
    };
  }

  if (normalizedModel.includes('gpt-5-mini')) {
    return {
      input: 0.25,
      output: 2
    };
  }

  if (normalizedModel.includes('gpt-5.1') || normalizedModel === 'gpt-5') {
    return {
      input: 1.25,
      output: 10
    };
  }

  return {
    input: 1.25,
    output: 10
  };
}

export function estimateCostUsdMicros(
  plan: AiExecutionPlan,
  promptTokens: number,
  completionTokens: number
): number {
  if (plan.provider === 'openai') {
    const pricing = getOpenAiTokenPricingUsdPerMillion(plan.model);
    const inputCostUsd = (promptTokens / 1_000_000) * pricing.input;
    const outputCostUsd = (completionTokens / 1_000_000) * pricing.output;
    return Math.round((inputCostUsd + outputCostUsd) * 1_000_000);
  }

  if (plan.provider === 'groq' || plan.provider === 'nvidia') {
    return 0;
  }

  const totalTokens = promptTokens + completionTokens;
  const ratePerThousandTokens = plan.model.includes('flash') ? 0.00035 : 0.0015;
  return Math.round((totalTokens / 1000) * ratePerThousandTokens * 1_000_000);
}

export function usdMicrosToKshCents(usdMicros: number, fxRateKshPerUsd: number): number {
  const usd = usdMicros / 1_000_000;
  return Math.round(usd * fxRateKshPerUsd * 100);
}

function extractOpenAiText(payload: {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
}) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap(item => item.content ?? [])
      .filter(content => content.type === 'output_text' && typeof content.text === 'string')
      .map(content => content.text ?? '')
      .join('') ?? ''
  );
}

async function generateTextWithOpenAi(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  if (!appConfig.KITABU_OPENAI_API_KEY) {
    throw new Error('KITABU_OPENAI_API_KEY is not configured');
  }

  const requiresJsonOutput = input.responseMimeType === 'application/json';
  const instructions = requiresJsonOutput
    ? [input.systemInstruction, 'Return valid JSON only.']
        .filter(Boolean)
        .join('\n\n')
    : input.systemInstruction;
  const historyTranscript = (input.history ?? [])
    .map(message => `${message.role === 'model' ? 'Tutor' : 'Student'}: ${message.text}`)
    .join('\n');
  const promptSegments = [
    historyTranscript ? `Conversation so far:\n${historyTranscript}` : '',
    input.prompt
  ].filter(Boolean);
  const prompt = requiresJsonOutput
    ? `${promptSegments.join('\n\n')}\n\nRespond in JSON.`
    : promptSegments.join('\n\n');
  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: prompt }];

  if (input.attachment) {
    if (input.attachment.type === 'image') {
      content.push({
        type: 'input_image',
        image_url: `data:${input.attachment.mimeType};base64,${input.attachment.data}`
      });
    } else {
      content.push({
        type: 'input_file',
        filename: input.attachment.name ?? 'attachment',
        file_data: `data:${input.attachment.mimeType};base64,${input.attachment.data}`
      });
    }
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appConfig.KITABU_OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: plan.model,
      instructions,
      input: [
        {
          role: 'user',
          content
        }
      ],
      reasoning: plan.reasoningEffort ? { effort: plan.reasoningEffort } : undefined,
      text:
        requiresJsonOutput
          ? {
              format: {
                type: 'json_object'
              }
            }
          : undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };

  const promptTokens = payload.usage?.input_tokens ?? 0;
  const completionTokens = payload.usage?.output_tokens ?? 0;
  const totalTokens = payload.usage?.total_tokens ?? promptTokens + completionTokens;

  return {
    text: extractOpenAiText(payload),
    promptTokens,
    completionTokens,
    totalTokens
  };
}

async function generateTextWithGemini(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  if (!appConfig.KITABU_GEMINI_API_KEY) {
    throw new Error('KITABU_GEMINI_API_KEY is not configured');
  }

  const historyTranscript = (input.history ?? [])
    .map(message => `${message.role === 'model' ? 'Tutor' : 'Student'}: ${message.text}`)
    .join('\n');
  const promptSegments = [
    historyTranscript ? `Conversation so far:\n${historyTranscript}` : '',
    input.prompt
  ].filter(Boolean);
  const parts: Array<Record<string, unknown>> = [{ text: promptSegments.join('\n\n') }];

  if (input.attachment) {
    parts.push({
      inline_data: {
        mime_type: input.attachment.mimeType,
        data: input.attachment.data
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${plan.model}:generateContent?key=${appConfig.KITABU_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: input.systemInstruction
          ? {
              parts: [{ text: input.systemInstruction }]
            }
          : undefined,
        contents: [
          {
            role: 'user',
            parts
          }
        ],
        generationConfig: input.responseMimeType
          ? { responseMimeType: input.responseMimeType }
          : undefined
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };

  const text = payload.candidates?.[0]?.content?.parts?.map(part => part.text ?? '').join('') ?? '';
  const promptTokens = payload.usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = payload.usageMetadata?.candidatesTokenCount ?? 0;

  return {
    text,
    promptTokens,
    completionTokens,
    totalTokens: payload.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens
  };
}

function buildChatCompletionMessages(input: GenerateTextInput) {
  const requiresJsonOutput = input.responseMimeType === 'application/json';
  const systemInstruction = requiresJsonOutput
    ? [input.systemInstruction, 'Return valid JSON only. Do not include markdown fences.']
        .filter(Boolean)
        .join('\n\n')
    : input.systemInstruction;
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction
    });
  }

  for (const message of input.history ?? []) {
    messages.push({
      role: message.role === 'model' ? 'assistant' : 'user',
      content: message.text
    });
  }

  messages.push({
    role: 'user',
    content: requiresJsonOutput ? `${input.prompt}\n\nRespond in JSON.` : input.prompt
  });

  return messages;
}

function extractChatCompletionText(payload: {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(part => part.text ?? '').join('');
  }

  return '';
}

async function generateTextWithOpenAiCompatibleChat(args: {
  input: GenerateTextInput;
  plan: AiExecutionPlan;
  apiKey: string | undefined;
  baseUrl: string;
  providerName: string;
}): Promise<AiProviderResult> {
  if (!args.apiKey) {
    throw new Error(`${args.providerName} API key is not configured`);
  }

  if (args.input.attachment) {
    throw new Error(`${args.providerName} text fallback does not support attachments`);
  }

  const response = await fetch(`${args.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.apiKey}`
    },
    body: JSON.stringify({
      model: args.plan.model,
      messages: buildChatCompletionMessages(args.input),
      response_format:
        args.input.responseMimeType === 'application/json'
          ? {
              type: 'json_object'
            }
          : undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${args.providerName} request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const promptTokens = payload.usage?.prompt_tokens ?? 0;
  const completionTokens = payload.usage?.completion_tokens ?? 0;

  return {
    text: extractChatCompletionText(payload),
    promptTokens,
    completionTokens,
    totalTokens: payload.usage?.total_tokens ?? promptTokens + completionTokens
  };
}

async function generateTextWithGroq(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  return generateTextWithOpenAiCompatibleChat({
    input,
    plan,
    apiKey: appConfig.KITABU_GROQ_API_KEY,
    baseUrl: 'https://api.groq.com/openai/v1',
    providerName: 'Groq'
  });
}

async function generateTextWithNvidia(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  return generateTextWithOpenAiCompatibleChat({
    input,
    plan,
    apiKey: appConfig.KITABU_NVIDIA_API_KEY,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    providerName: 'NVIDIA'
  });
}

export async function generateText(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  if (plan.provider === 'openai') {
    return generateTextWithOpenAi(input, plan);
  }

  if (plan.provider === 'groq') {
    return generateTextWithGroq(input, plan);
  }

  if (plan.provider === 'nvidia') {
    return generateTextWithNvidia(input, plan);
  }

  return generateTextWithGemini(input, plan);
}

export async function generateTextWithFallback(
  input: GenerateTextInput,
  plans = resolveAiExecutionPlans(input)
): Promise<AiProviderResult> {
  const errors: Error[] = [];

  for (const plan of plans) {
    try {
      const result = await generateText(input, plan);
      return {
        ...result,
        plan
      };
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  throw new Error(`All AI providers failed: ${errors.map(error => error.message).join(' | ')}`);
}

export async function transcribeAudioWithOpenAi(
  input: AudioTranscriptionInput
): Promise<{ text: string }> {
  if (!appConfig.KITABU_OPENAI_API_KEY) {
    throw new Error('KITABU_OPENAI_API_KEY is not configured');
  }

  const audioBuffer = Buffer.from(input.base64Audio, 'base64');
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([audioBuffer], { type: input.mimeType }),
    input.fileName ?? 'audio.m4a'
  );
  formData.append('model', appConfig.KITABU_OPENAI_TRANSCRIPTION_MODEL);
  formData.append('response_format', 'json');

  if (input.language?.trim()) {
    formData.append('language', input.language.trim());
  }

  if (input.prompt?.trim()) {
    formData.append('prompt', input.prompt.trim());
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appConfig.KITABU_OPENAI_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { text?: string };
  return {
    text: payload.text?.trim() ?? ''
  };
}

async function transcribeAudioWithPlan(
  input: AudioTranscriptionInput,
  plan: AudioTranscriptionPlan
): Promise<{ text: string; plan: AudioTranscriptionPlan }> {
  const apiKey = plan.provider === 'openai'
    ? appConfig.KITABU_OPENAI_API_KEY
    : appConfig.KITABU_GROQ_API_KEY;
  const baseUrl = plan.provider === 'openai'
    ? 'https://api.openai.com/v1'
    : 'https://api.groq.com/openai/v1';

  if (!apiKey) {
    throw new Error(`${plan.provider} transcription API key is not configured`);
  }

  const audioBuffer = Buffer.from(input.base64Audio, 'base64');
  const formData = new FormData();
  formData.append(
    'file',
    new Blob([audioBuffer], { type: input.mimeType }),
    input.fileName ?? 'audio.m4a'
  );
  formData.append('model', plan.model);
  formData.append('response_format', 'json');

  if (input.language?.trim()) {
    formData.append('language', input.language.trim());
  }

  if (input.prompt?.trim()) {
    formData.append('prompt', input.prompt.trim());
  }

  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${plan.provider} transcription failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as { text?: string };
  return {
    text: payload.text?.trim() ?? '',
    plan
  };
}

export async function transcribeAudio(
  input: AudioTranscriptionInput,
  plans = resolveAudioTranscriptionPlans()
): Promise<{ text: string; plan: AudioTranscriptionPlan }> {
  const errors: Error[] = [];

  for (const plan of plans) {
    try {
      return await transcribeAudioWithPlan(input, plan);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  throw new Error(`All transcription providers failed: ${errors.map(error => error.message).join(' | ')}`);
}

export async function synthesizeSpeechWithGroq(input: TextToSpeechInput): Promise<TextToSpeechResult> {
  if (!appConfig.KITABU_GROQ_API_KEY) {
    throw new Error('KITABU_GROQ_API_KEY is not configured');
  }

  const voice = input.voice?.trim() || appConfig.KITABU_GROQ_TTS_ENGLISH_VOICE;
  const responseFormat = input.responseFormat ?? 'wav';
  const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appConfig.KITABU_GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: appConfig.KITABU_GROQ_TTS_ENGLISH_MODEL,
      input: input.text,
      voice,
      response_format: responseFormat
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq speech synthesis failed: ${response.status} ${body}`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  return {
    base64Audio: audio.toString('base64'),
    mimeType: 'audio/wav',
    model: appConfig.KITABU_GROQ_TTS_ENGLISH_MODEL,
    voice
  };
}
