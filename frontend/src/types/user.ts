export type AuthProvider = 'password' | 'google.com';

export type EducationLevel = 'high_school' | 'undergraduate' | 'graduate' | 'postgraduate' | 'other';

export interface PreferredStudyTime {
  day: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
  startTime: string;
  endTime: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  studyReminders: boolean;
  assignmentReminders: boolean;
  examReminders: boolean;
  streakNotifications: boolean;
  studyReminderMinutesBefore: number;
}

export interface UserProfile {
  id: string;
  firebaseUid: string;
  name?: string;
  email: string;
  profileImage?: string;
  authProvider: AuthProvider;
  educationLevel?: EducationLevel;
  course?: string;
  studyGoal?: string;
  timezone?: string;
  preferredStudyTimes?: PreferredStudyTime[];
  availableHours?: number;
  onboardingCompleted: boolean;
  notificationPreferences?: NotificationPreferences;
  phone?: string;
  dateOfBirth?: string;
  bio?: string;
  institution?: string;
  degreeCourse?: string;
  department?: string;
  yearSemester?: string;
  studentId?: string;
  subjects?: string[];
  academicGoals?: string;
  shortTermGoals?: string;
  longTermGoals?: string;
  improvementAreas?: string;
  learningInterests?: string;
  dailyStudyTarget?: string;
  preferredStudyPeriods?: string[];
  preferredSessionDuration?: string;
  breakDuration?: string;
  additionalInformation?: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdateProfileInput = Partial<{
  name: string;
  phone: string;
  dateOfBirth: string;
  bio: string;
  institution: string;
  degreeCourse: string;
  department: string;
  yearSemester: string;
  studentId: string;
  subjects: string[];
  academicGoals: string;
  shortTermGoals: string;
  longTermGoals: string;
  improvementAreas: string;
  learningInterests: string;
  dailyStudyTarget: string;
  preferredStudyPeriods: string[];
  preferredSessionDuration: string;
  breakDuration: string;
  timezone: string;
  additionalInformation: string;
  onboardingCompleted: boolean;
  notificationPreferences: Partial<NotificationPreferences>;
}>;
