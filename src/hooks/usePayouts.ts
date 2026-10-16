import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  fetchMerchantBalanceApi,
  fetchMyPayoutsApi,
  fetchPayoutAccountApi,
  savePayoutAccountApi,
  PayoutAccountInput,
} from '../api/payouts';

/** What the store is owed. */
export function useMerchantBalanceQuery(enabled = true) {
  return useQuery({
    queryKey: ['payouts', 'balance'],
    queryFn: fetchMerchantBalanceApi,
    enabled,
  });
}

export function useMyPayoutsQuery(enabled = true) {
  return useQuery({
    queryKey: ['payouts', 'list'],
    queryFn: fetchMyPayoutsApi,
    enabled,
  });
}

export function usePayoutAccountQuery(enabled = true) {
  return useQuery({
    queryKey: ['payouts', 'account'],
    queryFn: fetchPayoutAccountApi,
    enabled,
  });
}

export function useSavePayoutAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PayoutAccountInput) => savePayoutAccountApi(input),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['payouts', 'account'] });
      toast.success(`Payout account saved — ${account.bankName} ••••${account.accountNumberLast4}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not save the payout account');
    },
  });
}
