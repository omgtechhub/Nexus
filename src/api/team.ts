import { apiClient } from './client';

/** Flattened by the controller, which does not nest the user relation. */
export interface TeamMemberData {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
  avatar?: string;
  joinedAt: string;
}

export interface TeamInvitationData {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
  token: string;
  /** Lowercased by the controller. */
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
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
