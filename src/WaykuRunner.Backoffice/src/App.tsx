import { Button } from '@heroui/react'
import type { FeatureCollection as GeoFeatureCollection } from 'geojson'
import { useCallback, useEffect, useState } from 'react'
import { DashboardOverview } from './components/dashboard/DashboardOverview'
import { EventsView } from './components/events/EventsView'
import { HubAgendaView } from './components/hub/HubAgendaView'
import { Header, NAVIGATION_ITEMS, Sidebar } from './components/layout/Navigation'
import { OrdersView } from './components/orders/OrdersView'
import { StoreCatalogView } from './components/store/StoreCatalogView'
import { UsersView } from './components/users/UsersView'
import { ZoneEditor } from './components/zones/ZoneEditor'
import { ZoneInventory } from './components/zones/ZoneInventory'
import {
  archiveEvent,
  claimOrderQr,
  createCheckoutOrder,
  createEvent,
  createHubAppointment,
  createProduct,
  createZone,
  deactivateProduct,
  fetchDashboardData,
  fetchHubAgenda,
  fetchHubServices,
  fetchOrders,
  fetchSpecialists,
  fetchStoreCatalog,
  grantUserMembership,
  publishZone,
  saveZoneBoundary,
  updateAppointmentStatus,
  updateInventoryStock,
  updateUserStatus,
} from './services/api'
import type {
  CreateEventPayload,
  CreateProductPayload,
  SpecialistItem,
} from './services/api'
import type {
  FeatureCollection,
  HubAgendaItem,
  HubService,
  Membership,
  OrderSummary,
  Point,
  RunnerEvent,
  Section,
  StoreCatalogItem,
  User,
  Zone,
} from './types'

function emptyFeatures(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

export default function App() {
  const [section, setSection] = useState<Section>('resumen')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('wayku-admin-key') ?? '')
  const [keyInput, setKeyInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Datos principales
  const [zones, setZones] = useState<Zone[]>([])
  const [events, setEvents] = useState<RunnerEvent[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [zoneFeatures, setZoneFeatures] = useState<FeatureCollection>(emptyFeatures())

  // Datos del Centro Físico (Hub), Tienda y Órdenes
  const [hubAgenda, setHubAgenda] = useState<HubAgendaItem[]>([])
  const [hubServices, setHubServices] = useState<HubService[]>([])
  const [specialists, setSpecialists] = useState<SpecialistItem[]>([])
  const [storeCatalog, setStoreCatalog] = useState<StoreCatalogItem[]>([])
  const [orders, setOrders] = useState<OrderSummary[]>([])

  // Estados de acción interactiva
  const [draftPoints, setDraftPoints] = useState<Point[]>([])
  const [savingZone, setSavingZone] = useState(false)
  const [publishingZoneId, setPublishingZoneId] = useState<string | null>(null)
  const [claimingQr, setClaimingQr] = useState(false)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [updatingStock, setUpdatingStock] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  const [updatingUser, setUpdatingUser] = useState(false)
  const [registeringEvent, setRegisteringEvent] = useState(false)

  const loadData = useCallback(async (key: string) => {
    setLoading(true)
    setError('')
    try {
      const [coreData, agendaData, servicesData, specialistsData, catalogData, ordersData] =
        await Promise.all([
          fetchDashboardData(key),
          fetchHubAgenda(key).catch(() => []),
          fetchHubServices(key).catch(() => []),
          fetchSpecialists(key).catch(() => []),
          fetchStoreCatalog(key).catch(() => []),
          fetchOrders(key).catch(() => []),
        ])

      setZones(coreData.zones)
      setEvents(coreData.events)
      setUsers(coreData.users)
      setMemberships(coreData.memberships)
      setZoneFeatures(coreData.map as GeoFeatureCollection)

      setHubAgenda(agendaData)
      setHubServices(servicesData)
      setSpecialists(specialistsData)
      setStoreCatalog(catalogData)
      setOrders(ordersData)
      setConnected(true)
    } catch (loadError) {
      setConnected(false)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudo conectar con el Backoffice. Verifica que la API local esté en ejecución.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (adminKey) {
      void loadData(adminKey)
    }
  }, [adminKey, loadData])

  const handleConnect = () => {
    const nextKey = keyInput.trim()
    if (!nextKey) {
      setError('Ingresa la clave administrativa local para conectar el panel.')
      return
    }
    localStorage.setItem('wayku-admin-key', nextKey)
    setAdminKey(nextKey)
  }

  // --- Zonas ---
  const handleAddPoint = useCallback((point: Point) => {
    setDraftPoints((current) => [...current, point])
  }, [])

  const handleClearPoints = useCallback(() => {
    setDraftPoints([])
  }, [])

  const handleSaveZone = async ({
    code,
    name,
    description,
  }: {
    code: string
    name: string
    description: string
  }) => {
    if (!adminKey) return
    setSavingZone(true)
    setError('')
    try {
      const created = await createZone(adminKey, {
        code,
        name,
        description: description || null,
      })
      await saveZoneBoundary(
        adminKey,
        created.id,
        draftPoints.map(([longitude, latitude]) => ({ longitude, latitude })),
      )
      setDraftPoints([])
      await loadData(adminKey)
      setSection('mapa')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el territorio.')
    } finally {
      setSavingZone(false)
    }
  }

  const handlePublishZone = async (zoneId: string) => {
    if (!adminKey) return
    setPublishingZoneId(zoneId)
    setError('')
    try {
      await publishZone(adminKey, zoneId)
      await loadData(adminKey)
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : 'No se pudo publicar el territorio.',
      )
    } finally {
      setPublishingZoneId(null)
    }
  }

  // --- Tienda CRUD ---
  const handleCreateProduct = async (data: CreateProductPayload) => {
    if (!adminKey) return
    setCreatingProduct(true)
    try {
      await createProduct(adminKey, data)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto.')
    } finally {
      setCreatingProduct(false)
    }
  }

  const handleUpdateStock = async (variantId: string, location: string, newStock: number) => {
    if (!adminKey) return
    setUpdatingStock(true)
    try {
      await updateInventoryStock(adminKey, { variantId, location, newStock })
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar stock.')
    } finally {
      setUpdatingStock(false)
    }
  }

  const handleDeactivateProduct = async (productId: string) => {
    if (!adminKey) return
    try {
      await deactivateProduct(adminKey, productId)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al dar de baja el producto.')
    }
  }

  // --- Eventos CRUD ---
  const handleCreateEvent = async (payload: CreateEventPayload) => {
    if (!adminKey) return
    setCreatingEvent(true)
    try {
      await createEvent(adminKey, payload)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la carrera.')
    } finally {
      setCreatingEvent(false)
    }
  }

  const handleArchiveEvent = async (id: string) => {
    if (!adminKey) return
    try {
      await archiveEvent(adminKey, id)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al archivar evento.')
    }
  }

  const handleUnifiedRegister = async (data: {
    userId: string
    eventId: string
    items: Array<{ variantId: string; quantity: number }>
  }) => {
    if (!adminKey) return
    setRegisteringEvent(true)
    setError('')
    try {
      await createCheckoutOrder(adminKey, {
        userId: data.userId,
        eventId: data.eventId,
        items: data.items,
        pickupMethod: 'hub_pickup',
        paymentMethod: 'credit_card',
      })
      await loadData(adminKey)
      setSection('ordenes')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo procesar la inscripción con merch.',
      )
    } finally {
      setRegisteringEvent(false)
    }
  }

  // --- Hub CRUD ---
  const handleCreateAppointment = async (data: {
    userId: string
    serviceId: string
    specialistId: string
    scheduledAt: string
    notes?: string
  }) => {
    if (!adminKey) return
    setCreatingAppointment(true)
    try {
      await createHubAppointment(adminKey, data)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agendar cita.')
    } finally {
      setCreatingAppointment(false)
    }
  }

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    if (!adminKey) return
    try {
      await updateAppointmentStatus(adminKey, appointmentId, status)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado de la cita.')
    }
  }

  // --- Usuarios & Membresías CRUD ---
  const handleToggleUserStatus = async (userId: string, newStatus: string) => {
    if (!adminKey) return
    setUpdatingUser(true)
    try {
      await updateUserStatus(adminKey, userId, newStatus)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al modificar estado del usuario.')
    } finally {
      setUpdatingUser(false)
    }
  }

  const handleGrantMembership = async (userId: string) => {
    if (!adminKey) return
    setUpdatingUser(true)
    try {
      await grantUserMembership(adminKey, userId)
      await loadData(adminKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar membresía.')
    } finally {
      setUpdatingUser(false)
    }
  }

  // --- Órdenes QR ---
  const handleClaimQr = async (qrCode: string) => {
    if (!adminKey) return
    setClaimingQr(true)
    try {
      await claimOrderQr(adminKey, qrCode)
      await loadData(adminKey)
    } finally {
      setClaimingQr(false)
    }
  }

  const currentNav = NAVIGATION_ITEMS.find((item) => item.id === section)

  let mainContent = (
    <DashboardOverview
      zones={zones}
      events={events}
      users={users}
      memberships={memberships}
      onGoToZones={() => setSection('zonas')}
    />
  )

  if (section === 'zonas') {
    mainContent = (
      <ZoneEditor
        zoneFeatures={zoneFeatures}
        draftPoints={draftPoints}
        onAddPoint={handleAddPoint}
        onClearPoints={handleClearPoints}
        onSaveZone={handleSaveZone}
        saving={savingZone}
      />
    )
  } else if (section === 'mapa') {
    mainContent = (
      <ZoneInventory
        zones={zones}
        zoneFeatures={zoneFeatures}
        onPublishZone={handlePublishZone}
        publishingZoneId={publishingZoneId}
      />
    )
  } else if (section === 'eventos') {
    mainContent = (
      <EventsView
        events={events}
        users={users}
        catalog={storeCatalog}
        onCreateEvent={handleCreateEvent}
        onArchiveEvent={handleArchiveEvent}
        onRegisterAthlete={handleUnifiedRegister}
        creating={creatingEvent}
        registering={registeringEvent}
      />
    )
  } else if (section === 'hub') {
    mainContent = (
      <HubAgendaView
        agenda={hubAgenda}
        users={users}
        services={hubServices}
        specialists={specialists}
        onCreateAppointment={handleCreateAppointment}
        onUpdateStatus={handleUpdateAppointmentStatus}
        creating={creatingAppointment}
      />
    )
  } else if (section === 'tienda') {
    mainContent = (
      <StoreCatalogView
        catalog={storeCatalog}
        onCreateProduct={handleCreateProduct}
        onUpdateStock={handleUpdateStock}
        onDeactivateProduct={handleDeactivateProduct}
        creating={creatingProduct}
        updatingStock={updatingStock}
      />
    )
  } else if (section === 'ordenes') {
    mainContent = (
      <OrdersView orders={orders} onClaimQr={handleClaimQr} claiming={claimingQr} />
    )
  } else if (section === 'usuarios') {
    mainContent = (
      <UsersView
        users={users}
        onToggleStatus={handleToggleUserStatus}
        onGrantMembership={handleGrantMembership}
        updatingUser={updatingUser}
      />
    )
  } else if (section === 'suscripciones') {
    mainContent = (
      <UsersView
        users={users}
        onToggleStatus={handleToggleUserStatus}
        onGrantMembership={handleGrantMembership}
        updatingUser={updatingUser}
      />
    )
  }

  return (
    <main className="min-h-screen bg-[#07111d] text-slate-100 selection:bg-[#bcff40] selection:text-[#10200b]">
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:36px_36px]" />

      <Sidebar
        currentSection={section}
        onSelectSection={setSection}
        mobileOpen={mobileMenu}
        onCloseMobile={() => setMobileMenu(false)}
      />

      <div className="relative min-h-screen lg:ml-72">
        <Header
          currentLabel={currentNav?.label ?? 'Wayku Runner'}
          connected={connected}
          onOpenMobile={() => setMobileMenu(true)}
        />

        <div className="mx-auto max-w-[1600px] px-5 py-7 sm:px-8">
          {!connected && (
            <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-[#bcff40]/20 bg-[#bcff40]/7 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">Conecta el panel a la API de Wayku</p>
                <p className="mt-1 text-sm text-slate-400">
                  Si la conexión falla, puedes volver a ingresar la clave administrativa aquí.
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="Clave administrativa"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111d] px-3 py-2 text-sm text-white outline-none focus:border-[#bcff40]/70 sm:w-56"
                />
                <Button onPress={handleConnect} className="bg-[#bcff40] font-bold text-[#10200b]">
                  Conectar
                </Button>
              </div>
            </section>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {loading && (
            <div className="mb-6 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-[#bcff40]" />
            </div>
          )}

          {mainContent}
        </div>
      </div>
    </main>
  )
}
