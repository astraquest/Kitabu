import { apiJsonRequest } from './requestHelpers';

export async function updatePresence(status: 'online' | 'offline', reason?: string) {
  return apiJsonRequest<{ status: 'online' | 'offline' }>('/me/presence', {
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  });
}

export function markPresenceOnline() {
  return updatePresence('online').catch(() => undefined);
}

export function markPresenceOffline(reason = 'background') {
  return updatePresence('offline', reason).catch(() => undefined);
}
