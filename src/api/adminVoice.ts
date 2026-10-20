import { apiClient, BASE_URL } from './client';
import type { VoiceStatus, EnrolProgress, EnrolResult, VoiceVerification } from './nexusIq';

/**
 * The platform console's voice API.
 *
 * Enrolment is the same implementation as the other two portals, keyed to the
 * ADMIN profile. Everything here reads; there is no spoken route that changes
 * a merchant's standing.
 */

export type PolicySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface PolicyFinding {
  kind: string;
  severity: PolicySeverity;
  summary: string;
  subject: { type: 'merchant' | 'order' | 'product' | 'review' | 'platform'; id: string; label: string };
  evidence: Record<string, string | number | boolean | null>;
}

export interface PolicyReport {
  generatedAt: string;
  findings: PolicyFinding[];
  counts: { critical: number; warning: number; info: number; total: number };
  /** What was examined, so "no violations" is checkable rather than a claim. */
  scanned: { merchants: number; orders: number; products: number; reviews: number; checks: number };
}

export interface ActivitySummary {
  windowHours: number;
  newMerchants: number;
  newCustomers: number;
  orders: number;
  paidOrders: number;
  revenue: number;
  newProducts: number;
  newReviews: number;
  refunds: number;
  auditEvents: number;
}

export interface AdminTurn {
  transcript: string;
  intent: string;
  reply: string;
  verification: VoiceVerification;
  report: PolicyReport | null;
  activity: ActivitySummary | null;
}

export async function getAdminVoiceStatusApi(): Promise<VoiceStatus> {
  const res = await apiClient<{ success: boolean; data: VoiceStatus }>('/admin/voice/status');
  return res.data;
}

export async function sendAdminEnrolSampleApi(
  wav: Blob,
  condition: string,
  finish: boolean
): Promise<EnrolProgress | EnrolResult> {
  const form = new FormData();
  form.append('audio', wav, 'sample.wav');
  form.append('condition', condition);
  form.append('finish', finish ? 'true' : 'false');

  const response = await fetch(`${BASE_URL}/admin/voice/enrol`, {
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

export async function deleteAdminVoiceProfileApi(): Promise<void> {
  await apiClient('/admin/voice/enrol', { method: 'DELETE' });
}

export async function getPolicyReportApi(
  hours = 24
): Promise<{ report: PolicyReport; activity: ActivitySummary; spoken: string }> {
  const res = await apiClient<{
    success: boolean;
    data: { report: PolicyReport; activity: ActivitySummary; spoken: string };
  }>(`/admin/voice/report?hours=${hours}`);
  return res.data;
}

export async function sendAdminCommandApi(wav: Blob): Promise<AdminTurn> {
  const form = new FormData();
  form.append('audio', wav, 'command.wav');

  const response = await fetch(`${BASE_URL}/admin/voice/command`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.success) {
    const error: any = new Error(body?.error || 'That command could not be handled.');
    error.spoken = body?.data?.spoken;
    error.verification = body?.data?.verification;
    throw error;
  }
  return body.data;
}
