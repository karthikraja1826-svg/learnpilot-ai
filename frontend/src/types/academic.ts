export interface Subject {
  _id: string;
  name: string;
  description?: string;
  difficulty: number;
  importance: number;
  targetPerformance: number;
  currentPerformance: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type TopicStatus = 'not_started' | 'in_progress' | 'completed' | 'needs_revision';

export interface Topic {
  _id: string;
  subject: string;
  name: string;
  description?: string;
  difficulty: number;
  estimatedHours: number;
  currentMastery: number;
  targetMastery: number;
  status: TopicStatus;
  lastStudiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PriorityLevel = 'low' | 'medium' | 'high';

export interface Exam {
  _id: string;
  title: string;
  subject?: string | null;
  examDate: string;
  description?: string;
  priority: PriorityLevel;
  createdAt: string;
  updatedAt: string;
}

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Assignment {
  _id: string;
  title: string;
  subject?: string | null;
  description?: string;
  deadline: string;
  estimatedHours: number;
  priority: PriorityLevel;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  subject?: string | null;
  topic?: string | null;
  assignment?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const AVAILABILITY_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type AvailabilityDay = (typeof AVAILABILITY_DAYS)[number];

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export type WeeklySchedule = Partial<Record<AvailabilityDay, DaySchedule>>;

export type StudyPeriod = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

export interface StudyAvailability {
  weeklySchedule: WeeklySchedule;
  timezone: string;
  dailyStudyLimit: number;
  preferredSessionDuration: number;
  preferredBreakDuration: number;
  preferredStudyPeriods: StudyPeriod[];
}

export type PlanEntryStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'missed';
export type ActivityType = 'study' | 'revision' | 'assignment' | 'practice' | 'review';

export interface StudyPlanEntry {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  subject?: string | null;
  topic?: string | null;
  assignment?: string | null;
  task?: string | null;
  subjectName: string;
  topicName: string;
  activityType: ActivityType;
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

export interface StudyPlanGenerationMetadata {
  aiUsed: boolean;
  aiModel?: string | null;
  aiFallbackReason?: string | null;
  generationDurationMs?: number | null;
}

export type PlanStatus = 'active' | 'completed' | 'archived';

export interface StudyPlan {
  _id: string;
  planType: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  generatedAt: string;
  version: number;
  previousPlan?: string | null;
  status: PlanStatus;
  // Set only for a Part 2 "AI Daily Roadmap" plan — the id of the subject
  // the roadmap was generated for (the user's active optimization subject).
  // Absent/null for the general, all-subjects daily/weekly plans.
  optimizationSubject?: string | null;
  source: 'ai' | 'algorithm';
  totalPlannedMinutes: number;
  entries: StudyPlanEntry[];
  summary: StudyPlanSummary;
  generationMetadata: StudyPlanGenerationMetadata;
}
