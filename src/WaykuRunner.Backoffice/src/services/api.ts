import type {
  FeatureCollection,
  HubAgendaItem,
  HubService,
  Membership,
  OrderSummary,
  RunnerEvent,
  StoreCatalogItem,
  User,
  Zone,
} from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export async function apiFetch<T>(path: string, key: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Wayku-Admin-Key': key,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.detail ?? payload?.message ?? `Error ${response.status}: no se pudo completar la solicitud.`
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export interface DashboardData {
  zones: Zone[]
  events: RunnerEvent[]
  users: User[]
  memberships: Membership[]
  map: FeatureCollection
}

export function fetchZones(key: string): Promise<Zone[]> {
  return apiFetch<Zone[]>('/api/admin/zones', key)
}

export function fetchZoneMap(key: string): Promise<FeatureCollection> {
  return apiFetch<FeatureCollection>('/api/admin/zones/map', key)
}

export async function fetchDashboardData(key: string): Promise<DashboardData> {
  const [zones, events, users, memberships, map] = await Promise.all([
    fetchZones(key),
    apiFetch<RunnerEvent[]>('/api/admin/events', key),
    apiFetch<User[]>('/api/admin/users', key),
    apiFetch<Membership[]>('/api/admin/memberships', key),
    fetchZoneMap(key),
  ])

  return { zones, events, users, memberships, map }
}

export async function createZone(
  key: string,
  data: { code: string; name: string; description?: string | null },
): Promise<Zone> {
  return apiFetch<Zone>('/api/admin/zones', key, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function saveZoneBoundary(
  key: string,
  zoneId: string,
  coordinates: Array<{ longitude: number; latitude: number }>,
): Promise<{ zoneId: string; version: number; status: string }> {
  return apiFetch(`/api/admin/zones/${zoneId}/boundary`, key, {
    method: 'PUT',
    body: JSON.stringify({ coordinates }),
  })
}

export async function publishZone(
  key: string,
  zoneId: string,
): Promise<{ zone: Zone; publishedVersionNumber: number }> {
  return apiFetch(`/api/admin/zones/${zoneId}/publish`, key, {
    method: 'POST',
  })
}

// Hub (Centro Físico)
export async function fetchHubServices(key: string): Promise<HubService[]> {
  return apiFetch<HubService[]>('/api/admin/hub/services', key)
}

export async function fetchHubAgenda(key: string): Promise<HubAgendaItem[]> {
  return apiFetch<HubAgendaItem[]>('/api/admin/hub/agenda', key)
}

// Store & Merchandising
export async function fetchStoreCatalog(key: string): Promise<StoreCatalogItem[]> {
  return apiFetch<StoreCatalogItem[]>('/api/admin/store/catalog', key)
}

export async function updateInventoryStock(
  key: string,
  data: { variantId: string; location: string; newStock: number },
): Promise<{ variantId: string; location: string; stockQuantity: number }> {
  return apiFetch('/api/admin/store/inventory', key, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Órdenes & Checkout Unificado
export async function fetchOrders(key: string): Promise<OrderSummary[]> {
  return apiFetch<OrderSummary[]>('/api/admin/orders', key)
}

export interface CheckoutPayload {
  userId: string
  eventId?: string | null
  items?: Array<{ variantId: string; quantity: number }>
  pickupMethod?: string
  paymentMethod?: string
}

export async function createCheckoutOrder(
  key: string,
  payload: CheckoutPayload,
): Promise<{
  id: string
  userId: string
  status: string
  totalAmount: number
  discountAmount: number
  netAmount: number
  qrClaimCode: string
  isMemberDiscountApplied: boolean
  itemsCount: number
}> {
  return apiFetch('/api/admin/orders/checkout', key, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function claimOrderQr(
  key: string,
  qrCode: string,
): Promise<{ message: string; order: { id: string; status: string; pickupMethod: string } }> {
  return apiFetch('/api/admin/orders/claim', key, {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
  })
}

// Store CRUD
export interface CreateProductPayload {
  code: string
  name: string
  category: string
  description?: string
  basePrice: number
  memberDiscountPercent: number
  variants: Array<{
    sku: string
    size: string
    color: string
    additionalPrice: number
    initialStock: number
  }>
}

export async function createProduct(key: string, payload: CreateProductPayload) {
  return apiFetch('/api/admin/store/products', key, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateProduct(
  key: string,
  id: string,
  payload: { name: string; category: string; description?: string; basePrice: number; memberDiscountPercent: number },
) {
  return apiFetch(`/api/admin/store/products/${id}`, key, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deactivateProduct(key: string, id: string) {
  return apiFetch(`/api/admin/store/products/${id}`, key, {
    method: 'DELETE',
  })
}

// Events CRUD
export interface CreateEventPayload {
  name: string
  description?: string
  eventType: string
  startsAt: string
  endsAt: string
  capacity?: number
  publicPrice?: number
  memberDiscountPercent: number
}

export async function createEvent(key: string, payload: CreateEventPayload) {
  return apiFetch('/api/admin/events', key, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function archiveEvent(key: string, id: string) {
  return apiFetch(`/api/admin/events/${id}`, key, {
    method: 'DELETE',
  })
}

// Hub CRUD
export interface SpecialistItem {
  id: string
  userId: string
  specialty: string
  licenseNumber?: string
  name: string
}

export async function fetchSpecialists(key: string): Promise<SpecialistItem[]> {
  return apiFetch<SpecialistItem[]>('/api/admin/hub/specialists', key)
}

export async function createHubAppointment(
  key: string,
  payload: { userId: string; specialistId: string; serviceId: string; scheduledAt: string; notes?: string },
) {
  return apiFetch('/api/admin/hub/appointments', key, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAppointmentStatus(key: string, id: string, status: string) {
  return apiFetch(`/api/admin/hub/appointments/${id}/status`, key, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

// Users CRUD
export async function updateUserStatus(key: string, id: string, status: string) {
  return apiFetch(`/api/admin/users/${id}/status`, key, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

export async function grantUserMembership(key: string, id: string) {
  return apiFetch(`/api/admin/users/${id}/membership`, key, {
    method: 'POST',
  })
}
