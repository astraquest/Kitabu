import { ParentChildSummary } from '../types/app';
import { apiJsonRequest } from './requestHelpers';
import { TeacherParentMessage } from './teacherService';

export async function getParentDashboard() {
  return apiJsonRequest<{ children: ParentChildSummary[] }>('/parent/dashboard');
}

export async function linkParentChild(input: { studentEmail?: string; studentPhone?: string }) {
  return apiJsonRequest<{
    child: {
      id: string;
      name: string;
      email: string;
    };
  }>('/parent/children/link', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unlinkParentChild(studentId: string) {
  return apiJsonRequest<{ removed: boolean }>(`/parent/children/${studentId}`, {
    method: 'DELETE',
  });
}

export async function getParentTeacherMessages() {
  const payload = await apiJsonRequest<{ messages: TeacherParentMessage[] }>('/parent/messages');
  return payload.messages;
}

export async function sendParentTeacherMessage(input: { teacherUserId: string; body: string }) {
  return apiJsonRequest<{ messageId: string }>('/parent/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
