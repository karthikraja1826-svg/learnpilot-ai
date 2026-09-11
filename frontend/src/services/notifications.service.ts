import { api } from './api';
import type { ApiSuccess, PaginationMeta } from '../types/api';
import type { AppNotification, NotificationListParams } from '../types/notifications';

export interface NotificationListResult {
  notifications: AppNotification[];
  pagination: PaginationMeta;
}

export async function listNotifications(params: NotificationListParams = {}): Promise<NotificationListResult> {
  const response = await api.get<ApiSuccess<NotificationListResult>>('/notifications', {
    params: {
      page: params.page,
      limit: params.limit,
      status: params.status,
      type: params.type,
      unreadOnly: params.unreadOnly ? 'true' : undefined,
    },
  });
  return response.data.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<ApiSuccess<{ count: number }>>('/notifications/unread-count');
  return response.data.data.count;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const response = await api.put<ApiSuccess<{ notification: AppNotification }>>(`/notifications/${id}/read`);
  return response.data.data.notification;
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.put<ApiSuccess<{ modifiedCount: number }>>('/notifications/read-all');
  return response.data.data.modifiedCount;
}

export async function deleteNotification(id: string): Promise<void> {
  await api.delete(`/notifications/${id}`);
}
