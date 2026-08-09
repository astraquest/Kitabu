import { appConfig } from './config.js';
import { getFeatureModelProfile } from './aiFeatures.js';

const CHAT_PROVIDER_TIMEOUT_MS = 15_000;
const JSON_PROVIDER_TIMEOUT_MS = 75_000;
const DEFAULT_PROVIDER_TIMEOUT_MS = 20_000;
const CHAT_MAX_TOKENS = 192;
const PRACTICE_JSON_MAX_TOKENS = 2500;

export interface GenerateTextInput {
  prompt: string;
  systemInstruction?: string;
  responseMimeType?: string;
  feature?: string;
  context?: Record<string, unknown>;
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
  attempts?: AiProviderAttempt[];
}

export interface AiProviderAttempt {
  provider: AiProvider;
  model: string;
  status: 'completed' | 'failed';
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  errorMessage?: string;
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

export type AiProvider = 'openai' | 'deepseek' | 'google' | 'groq' | 'nvidia';
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

function isPdfAttachment(attachment: GenerateTextInput['attachment']) {
  return Boolean(
    attachment &&
      attachment.type === 'file' &&
      attachment.mimeType.toLowerCase().includes('pdf') &&
      attachment.data.trim().length > 0
  );
}

function isCurriculumReasoningFeature(feature: string) {
  if (getFeatureModelProfile(feature) === 'reasoning_document') {
    return true;
  }

  const normalizedFeature = feature.trim().toLowerCase();
  return [
    'curriculum_extraction',
    'curriculum_document_processing',
    'curriculum_import_processing'
  ].includes(normalizedFeature);
}

function isKitabuChatFeature(feature: string) {
  return ['homework_helper_chat', 'voice_tutor_text'].includes(feature.trim().toLowerCase());
}

function isLowLatencyTextFeature(feature: string) {
  const profile = getFeatureModelProfile(feature);
  if (profile === 'instant_tutor' || profile === 'structured_fast') {
    return true;
  }

  return ['homework_helper_chat', 'quiz_generation', 'flashcard_generation'].includes(
    feature.trim().toLowerCase()
  );
}

function isPracticeGenerationFeature(feature: string) {
  const profile = getFeatureModelProfile(feature);
  if (profile === 'structured_fast') {
    return true;
  }

  return ['quiz_generation', 'flashcard_generation'].includes(feature.trim().toLowerCase());
}

function resolveProviderTimeoutMs(input: GenerateTextInput) {
  if (isKitabuChatFeature(input.feature ?? 'general')) {
    return CHAT_PROVIDER_TIMEOUT_MS;
  }

  if (input.responseMimeType === 'application/json') {
    return JSON_PROVIDER_TIMEOUT_MS;
  }

  return DEFAULT_PROVIDER_TIMEOUT_MS;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function resolveAiExecutionPlans(input: Pick<GenerateTextInput, 'feature' | 'attachment'>): AiExecutionPlan[] {
  const feature = input.feature ?? 'general';
  const isReasoningFeature = isCurriculumReasoningFeature(feature);
  const isLowLatencyFeature = isLowLatencyTextFeature(feature);
  const supportsTextFallbacks = !input.attachment || isPdfAttachment(input.attachment);
  const plans: AiExecutionPlan[] = [];

  if (supportsTextFallbacks && !isReasoningFeature && appConfig.KITABU_NVIDIA_API_KEY) {
    plans.push({
      provider: 'nvidia',
      model: appConfig.KITABU_NVIDIA_TEXT_FAST_MODEL
    });
  }

  if (supportsTextFallbacks && !isReasoningFeature && isLowLatencyFeature && appConfig.KITABU_GROQ_API_KEY) {
    plans.push({
      provider: 'groq',
      model: appConfig.KITABU_GROQ_TEXT_FAST_MODEL
    });
  }

  const hasFastLowLatencyPlan = isLowLatencyFeature && plans.length > 0;

  if (appConfig.KITABU_OPENAI_API_KEY) {
    if (isReasoningFeature) {
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

  if (supportsTextFallbacks && appConfig.KITABU_DEEPSEEK_API_KEY && !hasFastLowLatencyPlan) {
    plans.push({
      provider: 'deepseek',
      model: appConfig.KITABU_DEEPSEEK_TEXT_FALLBACK_MODEL
    });
  }

  if (supportsTextFallbacks && isReasoningFeature) {
    if (appConfig.KITABU_NVIDIA_API_KEY) {
      plans.push(
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
  } else if (supportsTextFallbacks) {
    if (!isLowLatencyFeature && appConfig.KITABU_GROQ_API_KEY) {
      plans.push({
        provider: 'groq',
        model: appConfig.KITABU_GROQ_TEXT_FAST_MODEL
      });
    }

  }

  if (appConfig.KITABU_GEMINI_API_KEY && !hasFastLowLatencyPlan) {
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

  if (normalizedModel.includes('gpt-5.4-mini')) {
    return {
      input: 0.75,
      output: 4.5
    };
  }

  if (normalizedModel.includes('gpt-5-mini')) {
    return {
      input: 0.25,
      output: 2
    };
  }

  if (normalizedModel.includes('gpt-5.5')) {
    return {
      input: 5,
      output: 30
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

  if (plan.provider === 'deepseek') {
    const inputCostUsd = (promptTokens / 1_000_000) * 0.14;
    const outputCostUsd = (completionTokens / 1_000_000) * 0.28;
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

  const response = await fetchWithTimeout(
    'https://api.openai.com/v1/responses',
    {
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
    },
    resolveProviderTimeoutMs(input)
  );

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

  const response = await fetchWithTimeout(
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
    },
    resolveProviderTimeoutMs(input)
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

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const escapes: Record<string, string> = {
        n: '\n',
        r: '\r',
        t: '\t',
        b: '\b',
        f: '\f',
        '(': '(',
        ')': ')',
        '\\': '\\'
      };
      return escapes[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function decodePdfHex(value: string) {
  const hex = value.replace(/\s+/g, '');
  const bytes: number[] = [];
  for (let index = 0; index + 1 < hex.length; index += 2) {
    bytes.push(Number.parseInt(hex.slice(index, index + 2), 16));
  }
  return Buffer.from(bytes).toString('utf8');
}

function extractPdfTextFromBase64(data: string) {
  const raw = Buffer.from(data, 'base64').toString('latin1');
  const chunks: string[] = [];

  for (const match of raw.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
    chunks.push(decodePdfLiteral(match[1]));
  }

  for (const match of raw.matchAll(/<([0-9a-fA-F\s]+)>\s*Tj/g)) {
    chunks.push(decodePdfHex(match[1]));
  }

  for (const match of raw.matchAll(/\[((?:\s*(?:\((?:\\.|[^\\)])*\)|<[0-9a-fA-F\s]+>|-?\d+)\s*)+)\]\s*TJ/g)) {
    const arrayBody = match[1];
    for (const literal of arrayBody.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
      chunks.push(decodePdfLiteral(literal[1]));
    }
    for (const hex of arrayBody.matchAll(/<([0-9a-fA-F\s]+)>/g)) {
      chunks.push(decodePdfHex(hex[1]));
    }
  }

  return chunks
    .join(' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTextFallbackInput(input: GenerateTextInput, providerName: string): GenerateTextInput {
  if (!input.attachment) {
    return input;
  }

  if (!isPdfAttachment(input.attachment)) {
    throw new Error(`${providerName} text fallback does not support this attachment type`);
  }

  const extractedText = extractPdfTextFromBase64(input.attachment.data);
  if (extractedText.length < 40) {
    throw new Error(`${providerName} text fallback could not extract readable PDF text`);
  }

  return {
    ...input,
    attachment: undefined,
    prompt: [
      input.prompt,
      `Attached PDF (${input.attachment.name ?? 'attachment.pdf'}) extracted text:`,
      extractedText.slice(0, 60_000)
    ].join('\n\n')
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
  requestOptions?: Record<string, unknown>;
  useJsonResponseFormat?: boolean;
}): Promise<AiProviderResult> {
  if (!args.apiKey) {
    throw new Error(`${args.providerName} API key is not configured`);
  }

  const input = buildTextFallbackInput(args.input, args.providerName);
  const useJsonResponseFormat = args.useJsonResponseFormat ?? true;

  const response = await fetchWithTimeout(
    `${args.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${args.apiKey}`
      },
      body: JSON.stringify({
        model: args.plan.model,
        messages: buildChatCompletionMessages(input),
        ...args.requestOptions,
        response_format:
          useJsonResponseFormat && input.responseMimeType === 'application/json'
            ? {
                type: 'json_object'
              }
            : undefined
      })
    },
    resolveProviderTimeoutMs(input)
  );

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

async function generateTextWithDeepSeek(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  return generateTextWithOpenAiCompatibleChat({
    input,
    plan,
    apiKey: appConfig.KITABU_DEEPSEEK_API_KEY,
    baseUrl: appConfig.KITABU_DEEPSEEK_BASE_URL,
    providerName: 'DeepSeek'
  });
}

async function generateTextWithNvidia(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  const isChatRequest = isKitabuChatFeature(input.feature ?? 'general');
  const isPracticeRequest = isPracticeGenerationFeature(input.feature ?? 'general');
  const isDeepSeekModel = plan.model.startsWith('deepseek-ai/');

  return generateTextWithOpenAiCompatibleChat({
    input,
    plan,
    apiKey: appConfig.KITABU_NVIDIA_API_KEY,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    providerName: 'NVIDIA',
    useJsonResponseFormat: false,
    requestOptions: {
      temperature: isChatRequest ? 0.2 : isPracticeRequest ? 0.4 : 0.7,
      top_p: 0.9,
      max_tokens: isChatRequest
        ? CHAT_MAX_TOKENS
        : isPracticeRequest
          ? PRACTICE_JSON_MAX_TOKENS
          : 4096,
      stream: false,
      ...(isDeepSeekModel
        ? {
            chat_template_kwargs: {
              thinking: false
            }
          }
        : {})
    }
  });
}

export async function generateText(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  if (plan.provider === 'openai') {
    return generateTextWithOpenAi(input, plan);
  }

  if (plan.provider === 'groq') {
    return generateTextWithGroq(input, plan);
  }

  if (plan.provider === 'deepseek') {
    return generateTextWithDeepSeek(input, plan);
  }

  if (plan.provider === 'nvidia') {
    return generateTextWithNvidia(input, plan);
  }

  return generateTextWithGemini(input, plan);
}

export function needsTutorResponseRetry(input: GenerateTextInput, text: string) {
  return input.feature === 'homework_helper_chat' && text.trim().length < 24;
}

function buildTutorResponseRetryInput(input: GenerateTextInput): GenerateTextInput {
  return {
    ...input,
    prompt: `${input.prompt}

FINAL CHECK: Return a learner-facing hint or explanation, not a bare answer. Use no labels or internal analysis.`
  };
}

export async function generateTextWithFallback(
  input: GenerateTextInput,
  plans = resolveAiExecutionPlans(input)
): Promise<AiProviderResult> {
  const errors: Error[] = [];
  const attempts: AiProviderAttempt[] = [];

  for (const plan of plans) {
    const startedAt = Date.now();
    try {
      let result = await generateText(input, plan);
      if (needsTutorResponseRetry(input, result.text) && Date.now() - startedAt < 4_000) {
        const firstResult = result;
        const retriedResult = await generateText(buildTutorResponseRetryInput(input), plan);
        result = {
          ...retriedResult,
          promptTokens: firstResult.promptTokens + retriedResult.promptTokens,
          completionTokens: firstResult.completionTokens + retriedResult.completionTokens,
          totalTokens: firstResult.totalTokens + retriedResult.totalTokens
        };
      }
      if (!result.text.trim()) {
        throw new Error(`${plan.provider} returned an empty response`);
      }
      if (needsTutorResponseRetry(input, result.text)) {
        throw new Error(`${plan.provider} returned an incomplete tutor response`);
      }

      attempts.push({
        provider: plan.provider,
        model: plan.model,
        status: 'completed',
        latencyMs: Date.now() - startedAt,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens
      });

      return {
        ...result,
        plan,
        attempts
      };
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      attempts.push({
        provider: plan.provider,
        model: plan.model,
        status: 'failed',
        latencyMs: Date.now() - startedAt,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        errorMessage: normalizedError.message.slice(0, 500)
      });
      errors.push(normalizedError);
    }
  }

  const failure = new Error(`All AI providers failed: ${errors.map(error => error.message).join(' | ')}`);
  (failure as Error & { attempts?: AiProviderAttempt[] }).attempts = attempts;
  throw failure;
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

/** Avatar names are product-facing; Gemini requires its prebuilt voice names. */
export const GEMINI_TTS_VOICE_BY_AVATAR: Record<string, string> = {
  Samora: 'Puck',
  Barake: 'Charon',
  Bella: 'Kore',
  Judith: 'Aoede'
};

function pcm16ToWav(pcm: Buffer, sampleRate = 24_000, channels = 1) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function synthesizeSpeechWithGemini(input: TextToSpeechInput): Promise<TextToSpeechResult> {
  if (!appConfig.KITABU_GEMINI_API_KEY) {
    throw new Error('KITABU_GEMINI_API_KEY is not configured');
  }

  const avatarVoice = input.voice?.trim();
  if (!avatarVoice) {
    throw new Error('A selected avatar voice is required for speech synthesis');
  }

  const geminiVoice = GEMINI_TTS_VOICE_BY_AVATAR[avatarVoice];
  if (!geminiVoice) {
    throw new Error(`Unsupported avatar voice: ${avatarVoice}`);
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${appConfig.KITABU_GEMINI_TTS_MODEL}:generateContent?key=${appConfig.KITABU_GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: input.text }]}],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: geminiVoice }
            }
          }
        }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini speech synthesis failed: ${response.status} ${body}`);
  }

  const payload = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          inlineData?: { data?: string; mimeType?: string };
        }>;
      };
    }>;
  };
  const inlineData = payload.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData;
  if (!inlineData?.data) {
    throw new Error('Gemini speech synthesis returned no audio');
  }

  const audio = inlineData.mimeType?.toLowerCase().startsWith('audio/wav')
    ? Buffer.from(inlineData.data, 'base64')
    : pcm16ToWav(Buffer.from(inlineData.data, 'base64'));

  return {
    base64Audio: audio.toString('base64'),
    mimeType: 'audio/wav',
    model: appConfig.KITABU_GEMINI_TTS_MODEL,
    voice: geminiVoice
  };
}
