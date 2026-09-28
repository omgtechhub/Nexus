import { apiClient } from './client';
import { Notification } from '../types';

export interface NotificationsResponse {
  data: Notification[];
  unreadCount: number;
}

export async function getNotificationsApi(): Promise<NotificationsResponse> {
  const res = await apiClient<{ success: boolean; data: Notification[]; unreadCount: number }>('/notifications');
  return { data: res.data, unreadCount: res.unreadCount || 0 };
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsReadApi(): Promise<void> {
  await apiClient('/notifications/read-all', { method: 'PATCH' });
}
