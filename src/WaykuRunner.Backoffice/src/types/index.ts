import type { FeatureCollection as GeoFeatureCollection } from 'geojson'
import type { Layers3 } from 'lucide-react'

export type Section =
  | 'resumen'
  | 'zonas'
  | 'mapa'
  | 'eventos'
  | 'hub'
  | 'tienda'
  | 'ordenes'
  | 'usuarios'
  | 'suscripciones'

export type Point = [number, number]
export type FeatureCollection = GeoFeatureCollection

export interface Zone {
  id: string
  code: string
  name: string
  description?: string | null
  status: 'draft' | 'published' | 'archived'
  currentPublishedVersionId?: string | null
}

export interface RunnerEvent {
  id: string
  name: string
  eventType: string
  startsAt: string
  endsAt?: string
  status: string
  publicPrice?: number | null
  memberDiscountPercent?: number
}

export interface User {
  id: string
  email: string
  displayName?: string | null
  accountStatus: string
  membershipState: string
}

export interface Membership {
  id: string
  status: string
  startsAt: string
  endsAt: string
}

export interface NavigationItem {
  id: Section
  label: string
  icon: typeof Layers3
}

export interface HubService {
  id: string
  code: string
  name: string
  serviceType: string
  description?: string | null
  durationMinutes: number
  price: number
  memberDiscountPercent: number
  isActive: boolean
}

export interface HubAgendaItem {
  appointmentId: string
  scheduledAt: string
  durationMinutes: number
  status: string
  serviceName: string
  serviceType: string
  userId: string
  email: string
  athleteName?: string | null
  specialistSpecialty: string
  createdAt: string
}

export interface StoreCatalogItem {
  productId: string
  code: string
  name: string
  category: string
  basePrice: number
  memberDiscountPercent: number
  variantId: string
  sku: string
  size: string
  color: string
  finalPrice: number
  stockAvailable: number
}

export interface OrderItemSummary {
  id: string
  itemType: string
  quantity: number
  unitPrice: number
  subtotal: number
  variantSku?: string | null
  variantSize?: string | null
}

export interface OrderSummary {
  id: string
  userId: string
  userEmail: string
  athleteName: string
  eventName?: string | null
  status: string
  totalAmount: number
  discountAmount: number
  netAmount: number
  pickupMethod: string
  qrClaimCode: string
  createdAt: string
  itemsCount: number
  items: OrderItemSummary[]
}
