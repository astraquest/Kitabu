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
}

export interface AudioTranscriptionInput {
  base64Audio: string;
  mimeType: string;
  fileName?: string;
  language?: string;
  prompt?: string;
}

export type AiProvider = 'openai' | 'google';

export interface AiExecutionPlan {
  provider: AiProvider;
  model: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

function isCurriculumReasoningFeature(feature: string) {
  const normalizedFeature = feature.trim().toLowerCase();
  return [
    'curriculum_extraction',
    'curriculum_document_processing',
    'curriculum_import_processing'
  ].includes(normalizedFeature);
}

export function resolveAiExecutionPlan(feature: string): AiExecutionPlan {
  if (appConfig.KITABU_OPENAI_API_KEY) {
    if (isCurriculumReasoningFeature(feature)) {
      return {
        provider: 'openai',
        model: appConfig.KITABU_OPENAI_REASONING_MODEL,
        reasoningEffort: appConfig.KITABU_OPENAI_REASONING_EFFORT
      };
    }

    return {
      provider: 'openai',
      model: appConfig.KITABU_OPENAI_STUDENT_MODEL
    };
  }

  if (appConfig.KITABU_GEMINI_API_KEY) {
    return {
      provider: 'google',
      model: appConfig.KITABU_GEMINI_MODEL
    };
  }

  throw new Error('No AI provider is configured');
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

export async function generateText(input: GenerateTextInput, plan: AiExecutionPlan): Promise<AiProviderResult> {
  if (plan.provider === 'openai') {
    return generateTextWithOpenAi(input, plan);
  }

  return generateTextWithGemini(input, plan);
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
