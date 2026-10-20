import { apiClient } from './client';

export interface AuditLogData {
  id: string;
  merchantId: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  resource: string;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

export async function getAuditLogsApi(limit = 50): Promise<AuditLogData[]> {
  const res = await apiClient<{ success: boolean; data: AuditLogData[] }>(`/audit-logs?limit=${limit}`);
  return res.data;
}
