import { apiClient } from './client';

/**
 * Nexus IQ.
 *
 * Every response carries `meta`, which says which provider answered. The UI uses
 * `isLive` to label stub output rather than implying a language model is running.
 */

export type InsightKind =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'UNFULFILLED_ORDERS'
  | 'REVENUE_TREND'
  | 'TOP_PRODUCTS'
  | 'NO_PRODUCTS';

export type InsightSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AiInsight {
  id: string;
  kind: InsightKind;
  severity: InsightSeverity;
  title: string;
  body: string;
  /** The store figures this was computed from, so a merchant can check the claim. */
  evidence: Record<string, unknown>;
  provider: string;
  model: string;
  generatedAt: string;
}

export interface ProviderMeta {
  provider: string;
  model: string;
  /** False while Nexus IQ runs without a language model configured. */
  isLive: boolean;
}

export interface AiMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  provider: string | null;
  model: string | null;
  createdAt: string;
}

export interface AiConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface AiConversation extends AiConversationSummary {
  messages: AiMessage[];
}

export interface AiUsage {
  periodStart: string;
  periodEnd: string;
  tokensUsed: number;
  /** Null means unlimited. */
  tokensAllowed: number | null;
  remaining: number | null;
  exceeded: boolean;
  planName: string | null;
}

export interface InsightsResponse {
  insights: AiInsight[];
  meta: ProviderMeta;
}

export async function getInsightsApi(): Promise<InsightsResponse> {
  const res = await apiClient<{ data: AiInsight[]; meta: ProviderMeta }>('/iq/insights');
  return { insights: res.data, meta: res.meta };
}

export async function refreshInsightsApi(): Promise<InsightsResponse> {
  const res = await apiClient<{ data: AiInsight[]; meta: ProviderMeta }>('/iq/insights/refresh', {
    method: 'POST',
  });
  return { insights: res.data, meta: res.meta };
}

export async function dismissInsightApi(id: string): Promise<void> {
  await apiClient(`/iq/insights/${id}/dismiss`, { method: 'PATCH' });
}

export async function getConversationsApi(): Promise<AiConversationSummary[]> {
  const res = await apiClient<{ data: AiConversationSummary[] }>('/iq/conversations');
  return res.data;
}

export async function createConversationApi(): Promise<AiConversation> {
  const res = await apiClient<{ data: AiConversation }>('/iq/conversations', { method: 'POST' });
  return res.data;
}

export async function getConversationApi(id: string): Promise<AiConversation> {
  const res = await apiClient<{ data: AiConversation }>(`/iq/conversations/${id}`);
  return res.data;
}

export async function deleteConversationApi(id: string): Promise<void> {
  await apiClient(`/iq/conversations/${id}`, { method: 'DELETE' });
}

export async function sendMessageApi(
  conversationId: string,
  content: string
): Promise<{ userMessage: AiMessage; assistantMessage: AiMessage }> {
  const res = await apiClient<{
    data: { userMessage: AiMessage; assistantMessage: AiMessage };
  }>(`/iq/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return res.data;
}

export async function getIqUsageApi(): Promise<AiUsage> {
  const res = await apiClient<{ data: AiUsage }>('/iq/usage');
  return res.data;
}
