import { apiRequest } from './apiClient';

export type ContentReportReason =
  | 'unsafe_ai_content'
  | 'inaccurate'
  | 'privacy'
  | 'abuse'
  | 'other';

export interface ContentReportInput {
  source: string;
  contentRole?: 'model' | 'user' | 'message' | 'attachment' | 'other';
  reason?: ContentReportReason;
  contentText: string;
  context?: Record<string, unknown>;
}

export async function reportContent(input: ContentReportInput) {
  return apiRequest<{ reportId: string; message: string }>('/content-reports', {
    method: 'POST',
    body: JSON.stringify({
      contentRole: 'model',
      reason: 'unsafe_ai_content',
      ...input,
      contentText: input.contentText.slice(0, 8000),
    }),
  });
}
