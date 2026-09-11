export interface AnalyticsOverview {
  totalStudyMinutes: number;
  todayStudyMinutes: number;
  weeklyStudyMinutes: number;
  plannedMinutes: number;
  completionPercentage: number;
  sessionsCompleted: number;
  pomodorosCompleted: number;
  averageFocusScore: number;
  averageSessionDuration: number;
  missedSessions: number;
  currentStreak: number;
  longestStreak: number;
}

export interface EntityPerformance {
  studyMinutes: number;
  sessionsCompleted: number;
  averageFocusScore: number;
  performanceScore: number;
  trend: 'improving' | 'declining' | 'stable';
  recentMinutes: number;
  priorMinutes: number;
  lastStudiedAt: string | null;
}

export interface SubjectAnalyticsEntry extends EntityPerformance {
  subjectId: string;
  name: string;
}

export interface SubjectAnalyticsResponse {
  subjects: SubjectAnalyticsEntry[];
  strongestSubjects: SubjectAnalyticsEntry[];
  weakestSubjects: SubjectAnalyticsEntry[];
}

export interface TopicAnalyticsEntry extends EntityPerformance {
  topicId: string;
  name: string;
  subject: string | null;
}

export interface TopicAnalyticsResponse {
  topics: TopicAnalyticsEntry[];
  mostStudiedTopics: TopicAnalyticsEntry[];
}

export interface ProductivityTrendPoint {
  date: string;
  productivityScore: number;
  completionRate: number;
  completedMinutes: number;
}

export interface ProductivityAnalytics {
  averageProductivity: number;
  productivityTrend: ProductivityTrendPoint[];
}

export type AdaptiveRecommendationType =
  | 'increase_study_time'
  | 'reduce_study_time'
  | 'reschedule_missed_work'
  | 'prioritize_exam';

export interface AdaptiveRecommendation {
  type: AdaptiveRecommendationType;
  topicId?: string;
  examId?: string;
  subjectId?: string | null;
  reason: string;
  evidence?: Record<string, unknown>;
}

export interface AdaptiveMissedEntry {
  planId: string;
  entryId: string;
  subject?: string | null;
  topic?: string | null;
  assignment?: string | null;
  task?: string | null;
  durationMinutes: number;
}

export interface AdaptiveUpcomingExam {
  _id: string;
  title: string;
  subject?: string | null;
  examDate: string;
}

export interface AdaptiveAnalysis {
  weakTopics: string[];
  strongTopics: string[];
  missedEntries: AdaptiveMissedEntry[];
  upcomingExams: AdaptiveUpcomingExam[];
  recommendations: AdaptiveRecommendation[];
}
