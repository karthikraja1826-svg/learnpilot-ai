import { api } from './api';
import type { ApiSuccess } from '../types/api';
import type {
  AdaptiveAnalysis,
  AnalyticsOverview,
  ProductivityAnalytics,
  SubjectAnalyticsResponse,
  TopicAnalyticsResponse,
} from '../types/analytics';

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await api.get<ApiSuccess<{ overview: AnalyticsOverview }>>('/analytics/overview');
  return response.data.data.overview;
}

export async function getSubjectsAnalytics(): Promise<SubjectAnalyticsResponse> {
  const response = await api.get<ApiSuccess<{ subjects: SubjectAnalyticsResponse }>>('/analytics/subjects');
  return response.data.data.subjects;
}

export async function getTopicsAnalytics(): Promise<TopicAnalyticsResponse> {
  const response = await api.get<ApiSuccess<{ topics: TopicAnalyticsResponse }>>('/analytics/topics');
  return response.data.data.topics;
}

export async function getProductivityAnalytics(): Promise<ProductivityAnalytics> {
  const response = await api.get<ApiSuccess<{ productivity: ProductivityAnalytics }>>('/analytics/productivity');
  return response.data.data.productivity;
}

export async function getAdaptiveRecommendations(): Promise<AdaptiveAnalysis> {
  const response = await api.get<ApiSuccess<{ analysis: AdaptiveAnalysis }>>('/adaptive/recommendations');
  return response.data.data.analysis;
}
