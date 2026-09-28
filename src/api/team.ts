import { apiClient } from './client';

export interface TeamMemberData {
  id: string;
  userId: string;
  storeId: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface TeamInvitationData {
  id: string;
  storeId: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface TeamResponse {
  members: TeamMemberData[];
  invitations: TeamInvitationData[];
}

export async function getTeamApi(): Promise<TeamResponse> {
  const res = await apiClient<{ success: boolean; data: TeamResponse }>('/team');
  return res.data;
}

export async function inviteTeamMemberApi(email: string, role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER'): Promise<{ invitation: TeamInvitationData; inviteLink?: string }> {
  const res = await apiClient<{ success: boolean; data: { invitation: TeamInvitationData; inviteLink?: string } }>('/team/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
  return res.data;
}

export async function resendInvitationApi(id: string): Promise<{ invitation: TeamInvitationData; inviteLink?: string }> {
  const res = await apiClient<{ success: boolean; data: { invitation: TeamInvitationData; inviteLink?: string } }>(`/team/invitations/${id}/resend`, {
    method: 'POST',
  });
  return res.data;
}

export async function revokeInvitationApi(id: string): Promise<void> {
  await apiClient(`/team/invitations/${id}`, {
    method: 'DELETE',
  });
}

export async function acceptInvitationApi(token: string): Promise<{ member: TeamMemberData }> {
  const res = await apiClient<{ success: boolean; data: { member: TeamMemberData } }>('/team/accept-invite', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  return res.data;
}

export async function updateMemberRoleApi(memberId: string, role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER'): Promise<TeamMemberData> {
  const res = await apiClient<{ success: boolean; data: TeamMemberData }>(`/team/members/${memberId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  return res.data;
}

export async function removeTeamMemberApi(memberId: string): Promise<void> {
  await apiClient(`/team/members/${memberId}`, {
    method: 'DELETE',
  });
}
