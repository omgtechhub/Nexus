import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  initializePaymentApi,
  verifyPaymentApi,
  refundOrderApi,
  getPaymentsApi,
  InitializePaymentParams,
  RefundParams,
} from '../api/payments';

export const paymentQueryKeys = {
  payments: ['payments'] as const,
  verify: (reference: string) => ['payments', 'verify', reference] as const,
};

export function usePaymentsQuery(enabled = true) {
  return useQuery({
    queryKey: paymentQueryKeys.payments,
    queryFn: getPaymentsApi,
    enabled,
  });
}

export function useInitializePaymentMutation() {
  return useMutation({
    mutationFn: (data: InitializePaymentParams) => initializePaymentApi(data),
  });
}

export function useVerifyPaymentQuery(reference: string, enabled = true) {
  return useQuery({
    queryKey: paymentQueryKeys.verify(reference),
    queryFn: () => verifyPaymentApi(reference),
    enabled: Boolean(reference) && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.data?.paymentStatus === 'SUCCESS' || data?.data?.paymentStatus === 'PAID' || data?.data?.paymentStatus === 'FAILED') {
        return false;
      }
      return 2500; // Poll every 2.5s while pending
    },
  });
}

export function useRefundOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: RefundParams }) => refundOrderApi(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
