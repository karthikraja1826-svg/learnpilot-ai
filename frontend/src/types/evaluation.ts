export type EvaluationSource = 'ai' | 'algorithm';
export type EvaluationUnderstandingLevel = 'weak' | 'developing' | 'proficient' | 'strong';

export interface EvaluationTopicInsight {
  topic: string | null;
  topicName: string;
  performance: number | null;
  understandingLevel: EvaluationUnderstandingLevel;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface EvaluationStudyConsistency {
  consistencyScore: number;
  assessment: string;
}

export interface EvaluationGenerationMetadata {
  aiUsed: boolean;
  aiModel: string | null;
  aiFallbackReason: string | null;
}

export interface Evaluation {
  _id: string;
  user: string;
  subject: string;
  studyDate: string;
  endOfDayTest: string;
  version: number;
  source: EvaluationSource;
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  topicInsights: EvaluationTopicInsight[];
  studyConsistency: EvaluationStudyConsistency;
  plannedVsActualInsight: string;
  recommendedFocusAreas: string[];
  learningSummary: string;
  generationMetadata: EvaluationGenerationMetadata;
  createdAt: string;
  updatedAt: string;
}
