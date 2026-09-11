export type NotificationType =
  | 'study_session_start'
  | 'study_session_reminder'
  | 'study_session_missed'
  | 'assignment_deadline'
  | 'exam_reminder'
  | 'streak'
  | 'study_plan'
  | 'adaptive_plan'
  | 'system';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'expired';

export interface AppNotification {
  _id: string;
  user: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  status: NotificationStatus;
  sentAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  type?: NotificationType;
  unreadOnly?: boolean;
}
