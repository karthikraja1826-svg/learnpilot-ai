export type EodTestStatus = 'not_started' | 'started' | 'submitted';
export type EodQuestionType = 'multiple_choice' | 'short_answer';
export type EodTestSource = 'ai' | 'algorithm';

export interface EodQuestion {
  _id: string;
  questionText: string;
  questionType: EodQuestionType;
  topic: string | null;
  topicName: string;
  options: string[];
  // Only present once the test has been submitted.
  correctAnswer?: string;
  explanation?: string;
}

export interface EodAnswer {
  question: string;
  answerText: string;
  isCorrect: boolean | null;
}

export interface EodTopicPerformance {
  topic: string | null;
  topicName: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface EodResult {
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  percentage: number;
  topicPerformance: EodTopicPerformance[];
  completionStatus: 'completed' | 'partial' | null;
}

export interface EodTest {
  _id: string;
  user: string;
  subject: string;
  studyPlan: string | null;
  studyDate: string;
  topicsCovered: string[];
  status: EodTestStatus;
  questions: EodQuestion[];
  answers: EodAnswer[];
  source: EodTestSource;
  startedAt: string | null;
  submittedAt: string | null;
  result: EodResult | null;
  createdAt: string;
  updatedAt: string;
}

export interface EodTestPreview {
  subject: { _id: string; name: string };
  testDate: string;
  topics: { topicName: string; actualMinutes: number }[];
  totalActualMinutes: number;
  questionCount: number;
  estimatedTestDurationMinutes: number;
  testStatus: EodTestStatus;
}

export interface SubmitAnswerInput {
  questionId: string;
  answerText: string;
}
