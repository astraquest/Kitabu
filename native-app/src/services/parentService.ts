import { ParentChildSummary } from '../types/app';
import { apiJsonRequest } from './requestHelpers';

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
