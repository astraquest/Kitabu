import { AppNotification } from '../types/app';
import { apiRequest } from './apiClient';

export async function getNotifications(options: { unreadOnly?: boolean } = {}) {
  const query = new URLSearchParams();
  query.set('limit', '50');
  if (options.unreadOnly) {
    query.set('unreadOnly', 'true');
  }

  const payload = await apiRequest<{ notifications: AppNotification[] }>(
    `/notifications?${query.toString()}`,
  );
  return payload.notifications;
}

export async function markNotificationRead(notificationId: string) {
  await apiRequest<{ updated: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'POST',
  });
}

export async function markAllNotificationsRead() {
  await apiRequest<{ updated: boolean }>('/notifications/read-all', {
    method: 'POST',
  });
}
