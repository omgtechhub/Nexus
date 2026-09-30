import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInsightsApi,
  refreshInsightsApi,
  dismissInsightApi,
  getConversationsApi,
  createConversationApi,
  getConversationApi,
  deleteConversationApi,
  sendMessageApi,
  getIqUsageApi,
} from '../api/nexusIq';

export const iqQueryKeys = {
  insights: ['iq', 'insights'] as const,
  conversations: ['iq', 'conversations'] as const,
  conversation: (id: string) => ['iq', 'conversations', id] as const,
  usage: ['iq', 'usage'] as const,
};

export function useIqInsightsQuery(enabled = true) {
  return useQuery({
    queryKey: iqQueryKeys.insights,
    queryFn: getInsightsApi,
    enabled,
  });
}

export function useRefreshInsightsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshInsightsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: iqQueryKeys.insights });
      // Generating insights spends tokens, so the meter is stale now.
      queryClient.invalidateQueries({ queryKey: iqQueryKeys.usage });
    },
  });
}

export function useDismissInsightMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dismissInsightApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iqQueryKeys.insights }),
  });
}

export function useIqConversationsQuery(enabled = true) {
  return useQuery({
    queryKey: iqQueryKeys.conversations,
    queryFn: getConversationsApi,
    enabled,
  });
}

export function useIqConversationQuery(id: string | null) {
  return useQuery({
    queryKey: iqQueryKeys.conversation(id ?? ''),
    queryFn: () => getConversationApi(id!),
    enabled: Boolean(id),
  });
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createConversationApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iqQueryKeys.conversations }),
  });
}

export function useDeleteConversationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversationApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: iqQueryKeys.conversations }),
  });
}

export function useSendIqMessageMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      sendMessageApi(conversationId, content),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: iqQueryKeys.conversation(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: iqQueryKeys.conversations });
      queryClient.invalidateQueries({ queryKey: iqQueryKeys.usage });
    },
  });
}

export function useIqUsageQuery(enabled = true) {
  return useQuery({
    queryKey: iqQueryKeys.usage,
    queryFn: getIqUsageApi,
    enabled,
  });
}
