export type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }> } }>;
};

type GeminiBatchDestination = {
  responsesFile?: string;
  responses_file?: string;
  inlinedResponses?: GeminiInlineResponse[];
  inlined_responses?: GeminiInlineResponse[];
};

type GeminiInlineResponse = {
  metadata?: Record<string, unknown>;
  response?: GeminiResponse;
  error?: { message?: string };
};

export type GeminiBatch = {
  name?: string;
  state?: string;
  metadata?: { state?: string };
  // The REST operation returns results in response; SDK responses expose dest.
  response?: GeminiBatchDestination;
  dest?: GeminiBatchDestination;
  error?: { message?: string; code?: number };
  batchStats?: Record<string, string>;
};

function audioMimeType(audio: { mimeType?: string; mime_type?: string }) {
  return audio.mimeType ?? audio.mime_type ?? 'audio/pcm';
}

export function getGeminiBatchState(batch: GeminiBatch) {
  return batch.metadata?.state ?? batch.state;
}

export function getGeminiBatchLifecycle(batch: GeminiBatch) {
  const state = getGeminiBatchState(batch);
  if (!state || state === 'JOB_STATE_PENDING' || state === 'JOB_STATE_RUNNING') return 'pending';
  return state === 'JOB_STATE_SUCCEEDED' ? 'succeeded' : 'failed';
}

function getGeminiBatchDestination(batch: GeminiBatch) {
  return batch.dest ?? batch.response;
}

function getInlineResponse(batch: GeminiBatch, identitySha256?: string) {
  const destination = getGeminiBatchDestination(batch);
  const responses = destination?.inlinedResponses ?? destination?.inlined_responses;
  if (!responses?.length) return undefined;
  if (!identitySha256) return responses[0];
  const matching = responses.find(response =>
    response.metadata?.identitySha256 === identitySha256 || response.metadata?.identity_sha256 === identitySha256
  );
  if (matching) return matching;
  return responses.length === 1 ? responses[0] : undefined;
}

export function extractGeminiPcm(response: GeminiResponse) {
  const part = response.candidates?.[0]?.content?.parts?.find(item => item.inlineData || item.inline_data);
  const audio = part?.inlineData ?? part?.inline_data;
  if (!audio?.data) return null;
  return { pcm: Buffer.from(audio.data, 'base64'), metadata: { mimeType: audioMimeType(audio) } };
}

export function extractGeminiPcmFromBatch(batch: GeminiBatch, identitySha256?: string) {
  const inline = getInlineResponse(batch, identitySha256);
  if (inline?.error) throw new Error(inline.error.message ?? 'Gemini request failed inside batch');
  return inline?.response ? extractGeminiPcm(inline.response) : null;
}

export function extractGeminiPcmFromJsonl(content: string, identitySha256?: string) {
  const entries = content.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as GeminiInlineResponse);
  const entry = identitySha256
    ? entries.find(item => item.metadata?.identitySha256 === identitySha256 || item.metadata?.identity_sha256 === identitySha256) ?? (entries.length === 1 ? entries[0] : undefined)
    : entries[0];
  if (entry?.error) throw new Error(entry.error.message ?? 'Gemini request failed inside batch');
  return entry?.response ? extractGeminiPcm(entry.response) : null;
}

export function getGeminiResponsesFile(batch: GeminiBatch) {
  const destination = getGeminiBatchDestination(batch);
  return destination?.responsesFile ?? destination?.responses_file;
}
