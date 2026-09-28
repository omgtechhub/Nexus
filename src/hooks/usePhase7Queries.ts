import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStorefrontConfigApi,
  updateStorefrontDraftConfigApi,
  publishStorefrontConfigApi,
  StorefrontConfigData,
} from '../api/storefrontConfig';
import { getPagesApi, createPageApi, updatePageApi, deletePageApi, StorePageData } from '../api/pages';
import { getNavigationMenusApi, saveNavigationMenuApi, deleteNavigationMenuApi, NavigationItem } from '../api/navigation';
import {
  getTeamApi,
  inviteTeamMemberApi,
  resendInvitationApi,
  revokeInvitationApi,
  acceptInvitationApi,
  updateMemberRoleApi,
  removeTeamMemberApi,
} from '../api/team';
import {
  getDomainsApi,
  addDomainApi,
  verifyDomainApi,
  setPrimaryDomainApi,
  deleteDomainApi,
} from '../api/domains';
import { getAuditLogsApi } from '../api/auditLogs';

export const phase7QueryKeys = {
  storefrontConfig: ['storefrontConfig'] as const,
  pages: ['pages'] as const,
  navigation: ['navigation'] as const,
  team: ['team'] as const,
  domains: ['domains'] as const,
  auditLogs: (limit?: number) => ['auditLogs', limit] as const,
};

// Storefront Config Hooks
export function useStorefrontConfigQuery(enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.storefrontConfig,
    queryFn: getStorefrontConfigApi,
    enabled,
  });
}

export function useUpdateStorefrontDraftConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftConfig: Partial<StorefrontConfigData>) => updateStorefrontDraftConfigApi(draftConfig),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.storefrontConfig });
    },
  });
}

export function usePublishStorefrontConfigMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishStorefrontConfigApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.storefrontConfig });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Pages Hooks
export function usePagesQuery(enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.pages,
    queryFn: getPagesApi,
    enabled,
  });
}

export function useCreatePageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (page: { title: string; slug?: string; content?: string; isPublished?: boolean; metaTitle?: string; metaDescription?: string }) =>
      createPageApi(page),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.pages });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useUpdatePageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, page }: { id: string; page: Partial<StorePageData> }) => updatePageApi(id, page),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.pages });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useDeletePageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePageApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.pages });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Navigation Hooks
export function useNavigationMenusQuery(enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.navigation,
    queryFn: getNavigationMenusApi,
    enabled,
  });
}

export function useSaveNavigationMenuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ handle, title, items }: { handle: string; title: string; items: NavigationItem[] }) =>
      saveNavigationMenuApi(handle, title, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.navigation });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useDeleteNavigationMenuMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handle: string) => deleteNavigationMenuApi(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.navigation });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Team Hooks
export function useTeamQuery(enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.team,
    queryFn: getTeamApi,
    enabled,
  });
}

export function useInviteTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER' }) =>
      inviteTeamMemberApi(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useResendInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendInvitationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
    },
  });
}

export function useRevokeInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeInvitationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useAcceptInvitationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => acceptInvitationApi(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUpdateMemberRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER' }) =>
      updateMemberRoleApi(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useRemoveTeamMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeTeamMemberApi(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.team });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Domains Hooks
export function useDomainsQuery(enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.domains,
    queryFn: getDomainsApi,
    enabled,
  });
}

export function useAddDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => addDomainApi(domain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.domains });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useVerifyDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => verifyDomainApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.domains });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useSetPrimaryDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setPrimaryDomainApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.domains });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

export function useDeleteDomainMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDomainApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phase7QueryKeys.domains });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
    },
  });
}

// Audit Logs Hook
export function useAuditLogsQuery(limit = 50, enabled = true) {
  return useQuery({
    queryKey: phase7QueryKeys.auditLogs(limit),
    queryFn: () => getAuditLogsApi(limit),
    enabled,
  });
}
