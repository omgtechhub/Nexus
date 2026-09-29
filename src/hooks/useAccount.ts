import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAccountProfileApi,
  updateAccountProfileApi,
  getAccountOrdersApi,
  getAccountOrderApi,
  getAccountAddressesApi,
  createAccountAddressApi,
  deleteAccountAddressApi,
  trackOrderApi,
  type NewAccountAddress,
} from '../api/account';

export const accountQueryKeys = {
  profile: ['account', 'profile'] as const,
  orders: ['account', 'orders'] as const,
  order: (id: string) => ['account', 'orders', id] as const,
  addresses: ['account', 'addresses'] as const,
};

export function useAccountProfileQuery(enabled = true) {
  return useQuery({
    queryKey: accountQueryKeys.profile,
    queryFn: getAccountProfileApi,
    enabled,
  });
}

export function useUpdateAccountProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAccountProfileApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountQueryKeys.profile });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

/** Every order this customer has placed, across every store on Nexus. */
export function useAccountOrdersQuery(enabled = true) {
  return useQuery({
    queryKey: accountQueryKeys.orders,
    queryFn: getAccountOrdersApi,
    enabled,
  });
}

export function useAccountOrderQuery(id: string | undefined) {
  return useQuery({
    queryKey: accountQueryKeys.order(id ?? ''),
    queryFn: () => getAccountOrderApi(id!),
    enabled: Boolean(id),
  });
}

export function useAccountAddressesQuery(enabled = true) {
  return useQuery({
    queryKey: accountQueryKeys.addresses,
    queryFn: getAccountAddressesApi,
    enabled,
  });
}

export function useCreateAccountAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (address: NewAccountAddress) => createAccountAddressApi(address),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.addresses }),
  });
}

export function useDeleteAccountAddressMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccountAddressApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.addresses }),
  });
}

/**
 * Tracking is a lookup, not a subscription: it runs when the visitor submits the
 * form, so it is a mutation rather than a query keyed on what they typed.
 */
export function useTrackOrderMutation() {
  return useMutation({
    mutationFn: ({ orderNumber, email }: { orderNumber: string; email: string }) =>
      trackOrderApi(orderNumber, email),
  });
}
