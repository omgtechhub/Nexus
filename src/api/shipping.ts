import { apiClient } from './client';

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  rateType: string;
  price: number;
  freeThreshold?: number;
  estimatedDays?: string;
}

export interface ShippingZone {
  id: string;
  storeId: string;
  name: string;
  countries: string[];
  methods: ShippingMethod[];
  createdAt: string;
}

export interface CalculatedRate {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: string;
  isFree: boolean;
}

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

export async function getShippingZonesApi(): Promise<ShippingZone[]> {
  const res = await apiClient<{ success: boolean; data: ShippingZone[] }>('/shipping/zones');
  return res.data;
}

export async function createShippingZoneApi(zone: Partial<ShippingZone>): Promise<ShippingZone> {
  const res = await apiClient<{ success: boolean; data: ShippingZone }>('/shipping/zones', {
    method: 'POST',
    body: JSON.stringify(zone),
  });
  return res.data;
}

export async function deleteShippingZoneApi(id: string): Promise<void> {
  await apiClient(`/shipping/zones/${id}`, { method: 'DELETE' });
}

export async function calculateShippingRatesApi(
  storeSlug: string,
  country: string,
  subtotal: number
): Promise<{ zoneName: string; rates: CalculatedRate[] }> {
  const res = await apiClient<{ success: boolean; data: { zoneName: string; rates: CalculatedRate[] } }>(
    `/shipping/rates/${storeSlug}`,
    {
      method: 'POST',
      body: JSON.stringify({ country, subtotal }),
    }
  );
  return res.data;
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
