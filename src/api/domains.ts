import { apiClient } from './client';

export interface CustomDomainData {
  id: string;
  storeId: string;
  domain: string;
  isPrimary: boolean;
  status: 'PENDING' | 'VERIFIED' | 'FAILED';
  verificationToken: string;
  txtRecordName: string;
  txtRecordValue: string;
  cnameRecordName: string;
  cnameRecordValue: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getDomainsApi(): Promise<CustomDomainData[]> {
  const res = await apiClient<{ success: boolean; data: CustomDomainData[] }>('/domains');
  return res.data;
}

export async function addDomainApi(domain: string): Promise<CustomDomainData> {
  const res = await apiClient<{ success: boolean; data: CustomDomainData }>('/domains', {
    method: 'POST',
    body: JSON.stringify({ domain }),
  });
  return res.data;
}

export async function verifyDomainApi(id: string): Promise<{ domain: CustomDomainData; verified: boolean; message: string }> {
  const res = await apiClient<{ success: boolean; data: { domain: CustomDomainData; verified: boolean; message: string } }>(`/domains/${id}/verify`, {
    method: 'POST',
  });
  return res.data;
}

export async function setPrimaryDomainApi(id: string): Promise<CustomDomainData> {
  const res = await apiClient<{ success: boolean; data: CustomDomainData }>(`/domains/${id}/primary`, {
    method: 'POST',
  });
  return res.data;
}

export async function deleteDomainApi(id: string): Promise<void> {
  await apiClient(`/domains/${id}`, {
    method: 'DELETE',
  });
}
