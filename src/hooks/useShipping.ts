import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fulfillOrderApi,
  getShipmentsApi,
  getOrderShipmentApi,
  updateShipmentStatusApi,
  FulfillOrderParams,
  ShipmentStatus,
} from '../api/shipping';

/**
 * Fulfilment only.
 *
 * Shipping zones and rate quoting lived here for the seller-facing shipping
 * editor, which assumed each seller sets their own delivery rules. The
 * marketplace sets them centrally, so what a seller needs is the ability to
 * fulfil an order and track the shipment.
 */
export const shippingQueryKeys = {
  shipments: ['shipments'] as const,
  orderShipment: (orderId: string) => ['shipments', 'order', orderId] as const,
};

export function useFulfillOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: FulfillOrderParams }) => fulfillOrderApi(orderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

export function useShipmentsQuery(enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.shipments,
    queryFn: getShipmentsApi,
    enabled,
  });
}

export function useOrderShipmentQuery(orderId: string, enabled = true) {
  return useQuery({
    queryKey: shippingQueryKeys.orderShipment(orderId),
    queryFn: () => getOrderShipmentApi(orderId),
    enabled: Boolean(orderId) && enabled,
  });
}

export function useUpdateShipmentStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, description, location }: {
      id: string;
      status: ShipmentStatus;
      description: string;
      location?: string;
    }) => updateShipmentStatusApi(id, status, description, location),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shippingQueryKeys.shipments });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
