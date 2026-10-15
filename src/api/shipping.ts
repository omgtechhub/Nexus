import { apiClient } from './client';

export interface FulfillOrderParams {
  carrier: string;
  trackingNumber: string;
  notes?: string;
}

export type ShipmentStatus = 'LABEL_CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION';

export interface ShipmentRecord {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  /** Included by the shipments list so a row can name its order. */
  order?: { id: string; orderNumber: string; customerName: string } | null;
  trackingEvents?: Array<{
    id: string;
    status: string;
    location?: string | null;
    description: string;
    timestamp: string;
  }>;
}

export async function fulfillOrderApi(orderId: string, data: FulfillOrderParams): Promise<ShipmentRecord> {
  const res = await apiClient<{ success: boolean; data: ShipmentRecord }>(`/shipments/orders/${orderId}/fulfill`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getShipmentsApi(): Promise<ShipmentRecord[]> {
  const res = await apiClient<{ success: boolean; data: ShipmentRecord[] }>('/shipments');
  return res.data;
}

export async function getOrderShipmentApi(orderId: string): Promise<ShipmentRecord> {
  const res = await apiClient<{ success: boolean; data: ShipmentRecord }>(`/shipments/orders/${orderId}`);
  return res.data;
}

export async function updateShipmentStatusApi(
  id: string,
  status: ShipmentStatus,
  /** Written to the shipment's tracking history, so it is required. */
  description: string,
  location?: string
): Promise<ShipmentRecord> {
  const res = await apiClient<{ success: boolean; data: ShipmentRecord }>(`/shipments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, location, description }),
  });
  return res.data;
}
