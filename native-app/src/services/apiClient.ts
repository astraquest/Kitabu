import { apiJsonRequest } from './requestHelpers';

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiJsonRequest<T>(path, options);
}
