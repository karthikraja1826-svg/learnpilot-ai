export type PlanEntryStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'missed';

export interface StudyPlanEntry {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  subject?: string | null;
  topic?: string | null;
  subjectName: string;
  topicName: string;
  activityType: string;
  priority: number;
  status: PlanEntryStatus;
  reason?: string;
}

export interface StudyPlanSummary {
  totalSessions: number;
  subjectsCovered: number;
  topicsCovered: number;
  highPriorityCount: number;
  unscheduledCount: number;
  constrained: boolean;
  notes: string;
}

export interface StudyPlan {
  _id: string;
  planType: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'archived';
  totalPlannedMinutes: number;
  entries: StudyPlanEntry[];
  summary: StudyPlanSummary;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  _id: string;
  title: string;
  subject?: string | null;
  topic?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  updatedAt: string;
}

export interface Exam {
  _id: string;
  title: string;
  subject?: string | null;
  examDate: string;
  priority: 'low' | 'medium' | 'high';
}

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Assignment {
  _id: string;
  title: string;
  subject?: string | null;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: AssignmentStatus;
}

export type SessionType = 'pomodoro' | 'focus' | 'revision' | 'assignment' | 'practice' | 'review';
export type SessionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | 'abandoned';

export interface StudySession {
  _id: string;
  studyPlan?: string | null;
  studyPlanEntry?: string | null;
  subject?: string | null;
  topic?: string | null;
  assignment?: string | null;
  task?: string | null;
  sessionType: SessionType;
  status: SessionStatus;
  plannedDurationMinutes: number;
  actualDurationMinutes: number;
  completedDurationMinutes: number;
  startTime?: string | null;
  endTime?: string | null;
  lastResumedAt?: string | null;
  pausedAt?: string | null;
  pauseDurationMinutes: number;
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  cyclesPlanned: number;
  cyclesCompleted: number;
  focusRating?: number | null;
  interruptionCount: number;
  notes: string;
  completionPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  _id: string;
  name: string;
  currentPerformance: number;
  color?: string;
}

export interface Topic {
  _id: string;
  name: string;
}

export interface DailyPerformance {
  date: string;
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  sessionsCancelled: number;
  pomodorosCompleted: number;
  interruptions: number;
  averageFocusScore: number;
  productivityScore: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  studyDays: number;
  lastActiveStudyDate: string | null;
}

export interface WeeklyPerformanceDay {
  date: string;
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  sessionsCancelled: number;
  pomodorosCompleted: number;
  interruptions: number;
  averageFocusScore: number;
  productivityScore: number;
}

export interface WeeklyPerformance {
  startDate: string;
  endDate: string;
  days: WeeklyPerformanceDay[];
  plannedMinutes: number;
  completedMinutes: number;
  completionRate: number;
  sessionsCompleted: number;
  sessionsAbandoned: number;
  sessionsCancelled: number;
  pomodorosCompleted: number;
  interruptions: number;
  averageFocusScore: number;
  productivityScore: number;
}

export type DeadlineType = 'exam' | 'assignment';

export interface DeadlineItem {
  id: string;
  type: DeadlineType;
  title: string;
  subjectName: string;
  date: string;
  priority: string;
}

export type ActivityType = 'session_completed' | 'task_completed';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: string;
}
