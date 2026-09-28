import { apiClient } from './client';
import { AnalyticsData } from '../types';

export async function getAnalyticsApi(range?: string, startDate?: string, endDate?: string): Promise<AnalyticsData> {
  const params = new URLSearchParams();
  if (range) params.append('range', range);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient<{ success: boolean; data: AnalyticsData }>(`/analytics${queryString}`);
  return res.data;
}
