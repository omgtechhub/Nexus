import { apiClient, BASE_URL } from './client';

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

/**
 * What Nexus IQ has cost this month. Reporting only — there is no cap on the
 * seller side, so there is nothing here to be "over".
 */
export interface AiUsage {
  periodStart: string;
  periodEnd: string;
  tokensUsed: number;
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

/* ----------------------------------------------------------------- voice */

export interface VoiceEngine {
  name: string;
  model: string;
  /** False when a non-neural fallback produced the profile. */
  isNeural: boolean;
  available: boolean;
  unavailableReason: string | null;
}

export interface VoiceProfileSummary {
  threshold: number;
  consistency: number;
  sampleCount: number;
  isNeural: boolean;
  embedder: string;
  model: string;
  createdAt: string;
  lastVerifiedAt: string | null;
}

export interface VoiceStatus {
  enrolled: boolean;
  profile: VoiceProfileSummary | null;
  engine: VoiceEngine;
  requiredSamples: number;
  minimumSamples: number;
  transcriber: { engine: string; model: string; local: boolean };
}

export interface EnrolProgress {
  collected: number;
  needed: number;
}

export interface EnrolResult {
  threshold: number;
  consistency: number;
  samples: number;
  weakestHeldOut: number | null;
  isNeural: boolean;
  embedder: string;
  model: string;
}

export interface VoiceVerification {
  accepted: boolean;
  similarity: number;
  threshold: number;
  undetermined: string | null;
}

export interface VoiceCommandResult {
  conversationId: string;
  transcript: string;
  answer: string;
  verification: VoiceVerification;
}

export async function getVoiceStatusApi(): Promise<VoiceStatus> {
  const res = await apiClient<{ success: boolean; data: VoiceStatus }>('/iq/voice/status');
  return res.data;
}

/**
 * Send one enrolment clip.
 *
 * `fetch` directly rather than through `apiClient`, because the body is
 * multipart: setting a JSON content type on a FormData body stops the browser
 * writing the multipart boundary and the upload arrives unparseable.
 */
export async function sendEnrolSampleApi(
  wav: Blob,
  condition: string,
  finish: boolean
): Promise<EnrolProgress | EnrolResult> {
  const form = new FormData();
  form.append('audio', wav, 'sample.wav');
  form.append('condition', condition);
  form.append('finish', finish ? 'true' : 'false');

  const response = await fetch(`${BASE_URL}/iq/voice/enrol`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.success) {
    throw new Error(body?.error || 'That recording could not be used.');
  }
  return body.data;
}

export async function deleteVoiceProfileApi(): Promise<void> {
  await apiClient('/iq/voice/enrol', { method: 'DELETE' });
}

export async function sendVoiceCommandApi(
  wav: Blob,
  conversationId?: string
): Promise<VoiceCommandResult> {
  const form = new FormData();
  form.append('audio', wav, 'command.wav');
  if (conversationId) form.append('conversationId', conversationId);

  const response = await fetch(`${BASE_URL}/iq/voice/command`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.success) {
    // A refused voice carries a spoken line of its own, so the console can
    // answer out loud rather than only showing a red box.
    const error: any = new Error(body?.error || 'That command could not be handled.');
    error.spoken = body?.data?.spoken;
    error.verification = body?.data?.verification;
    throw error;
  }
  return body.data;
}
