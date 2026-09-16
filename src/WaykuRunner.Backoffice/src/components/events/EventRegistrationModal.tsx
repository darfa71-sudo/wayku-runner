import { Button } from '@heroui/react'
import { BadgePercent, Check, PackagePlus, X } from 'lucide-react'
import { useState } from 'react'
import type { RunnerEvent, StoreCatalogItem, User } from '../../types'

export function EventRegistrationModal({
  isOpen,
  onClose,
  users,
  events,
  catalog,
  onRegister,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  users: User[]
  events: RunnerEvent[]
  catalog: StoreCatalogItem[]
  onRegister: (data: {
    userId: string
    eventId: string
    items: Array<{ variantId: string; quantity: number }>
  }) => Promise<void>
  submitting: boolean
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedVariants, setSelectedVariants] = useState<Record<string, boolean>>({})

  if (!isOpen) return null

  const selectedUser = users.find((u) => u.id === selectedUserId)
  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const isMember =
    selectedUser?.membershipState === 'active' || selectedUser?.membershipState === 'grace'

  const eventPrice = selectedEvent?.publicPrice ?? 0
  const eventDiscount = isMember ? eventPrice * ((selectedEvent?.memberDiscountPercent ?? 0) / 100) : 0
  const eventFinal = eventPrice - eventDiscount

  const toggleVariant = (variantId: string) => {
    setSelectedVariants((curr) => ({
      ...curr,
      [variantId]: !curr[variantId],
    }))
  }

  // Calculate items total
  let merchGross = 0
  let merchDiscount = 0
  const selectedItemsPayload: Array<{ variantId: string; quantity: number }> = []

  catalog.forEach((item) => {
    if (selectedVariants[item.variantId]) {
      const discount = isMember ? item.finalPrice * (item.memberDiscountPercent / 100) : 0
      merchGross += item.finalPrice
      merchDiscount += discount
      selectedItemsPayload.push({ variantId: item.variantId, quantity: 1 })
    }
  })

  const totalPayable = eventFinal + (merchGross - merchDiscount)
  const totalSavings = eventDiscount + merchDiscount

  const handleSubmit = async () => {
    if (!selectedUserId || !selectedEventId) return
    await onRegister({
      userId: selectedUserId,
      eventId: selectedEventId,
      items: selectedItemsPayload,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Checkout Unificado
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Inscripción a Carrera + Merchandising
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-white/5 p-2 text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          {/* Selector de Corredor */}
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Corredor / Atleta
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#bcff40]"
            >
              <option value="">Selecciona un atleta…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email} ({u.membershipState})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Evento */}
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Carrera o Evento Oficial
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#bcff40]"
            >
              <option value="">Selecciona una carrera…</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.eventType}) — Precio base: ${e.publicPrice ?? 0}
                </option>
              ))}
            </select>
          </div>

          {/* Badge de Membresía */}
          {selectedUser && (
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 ${
                isMember
                  ? 'border-[#bcff40]/30 bg-[#bcff40]/10 text-[#bcff40]'
                  : 'border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              <BadgePercent size={20} />
              <div className="text-xs">
                <p className="font-bold">
                  {isMember
                    ? '¡Membresía Competitiva Activa!'
                    : 'Corredor en modalidad Comunidad'}
                </p>
                <p className="text-slate-400">
                  {isMember
                    ? 'Se aplicarán automáticamente los descuentos exclusivos en la carrera y merchandising.'
                    : 'Tarifa general. No cuenta con descuentos de miembro.'}
                </p>
              </div>
            </div>
          )}

          {/* Complementos de Tienda (Merchandising) */}
          {catalog.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">
                  Agrega indumentaria oficial a tu orden
                </p>
                <span className="text-xs text-slate-500">Retiro conjunto en sede</span>
              </div>

              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto pr-1">
                {catalog.map((item) => {
                  const isChecked = !!selectedVariants[item.variantId]
                  const unitPrice = isMember
                    ? item.finalPrice * (1 - item.memberDiscountPercent / 100)
                    : item.finalPrice

                  return (
                    <div
                      key={item.variantId}
                      onClick={() => toggleVariant(item.variantId)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${
                        isChecked
                          ? 'border-[#bcff40] bg-[#bcff40]/10'
                          : 'border-white/8 bg-[#07111d] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-md border ${
                            isChecked
                              ? 'border-[#bcff40] bg-[#bcff40] text-[#10200b]'
                              : 'border-white/20 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{item.name}</p>
                          <p className="text-xs text-slate-400">
                            Talla: {item.size} · {item.color}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-white">${unitPrice.toFixed(2)}</p>
                        {isMember && item.memberDiscountPercent > 0 && (
                          <span className="text-[10px] text-[#bcff40]">
                            -{item.memberDiscountPercent}% desc
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Resumen Financiero */}
          <div className="rounded-2xl border border-white/8 bg-[#07111d] p-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Inscripción Carrera</span>
              <span>${eventPrice.toFixed(2)}</span>
            </div>
            {merchGross > 0 && (
              <div className="mt-1 flex justify-between text-slate-400">
                <span>Indumentaria ({selectedItemsPayload.length} ítems)</span>
                <span>${merchGross.toFixed(2)}</span>
              </div>
            )}
            {totalSavings > 0 && (
              <div className="mt-1 flex justify-between text-[#bcff40] font-semibold">
                <span>Descuento de Miembro Wayku</span>
                <span>-${totalSavings.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-3 border-t border-white/10 pt-2 flex justify-between font-bold text-white text-base">
              <span>Total a pagar</span>
              <span className="text-[#bcff40]">${totalPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onPress={onClose} className="bg-white/5 font-semibold text-white">
            Cancelar
          </Button>
          <Button
            onPress={handleSubmit}
            isDisabled={submitting || !selectedUserId || !selectedEventId}
            className="bg-[#bcff40] font-bold text-[#10200b]"
          >
            <PackagePlus size={16} />
            {submitting ? 'Procesando orden…' : 'Completar Inscripción + Merch'}
          </Button>
        </div>
      </div>
    </div>
  )
}
