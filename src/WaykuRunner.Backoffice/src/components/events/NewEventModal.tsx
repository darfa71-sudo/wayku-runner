import { Button } from '@heroui/react'
import { Calendar, Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { CreateEventPayload } from '../../services/api'

export function NewEventModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: CreateEventPayload) => Promise<void>
  submitting: boolean
}) {
  const [name, setName] = useState('')
  const [eventType, setEventType] = useState('race')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('2026-10-18T07:00')
  const [endsAt, setEndsAt] = useState('2026-10-18T12:00')
  const [capacity, setCapacity] = useState('300')
  const [publicPrice, setPublicPrice] = useState('20.00')
  const [discount, setDiscount] = useState('50')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim() || !startsAt || !endsAt) return

    await onSubmit({
      name: name.trim(),
      eventType,
      description: description.trim() || undefined,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      capacity: parseInt(capacity) || undefined,
      publicPrice: parseFloat(publicPrice) || 0,
      memberDiscountPercent: parseFloat(discount) || 0,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Gestión de Carreras
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Crear Nueva Carrera o Desafío</h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 font-medium">Nombre del evento</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Desafío 10K Parque Bicentenario"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium">Modalidad</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              >
                <option value="race">Carrera Oficial</option>
                <option value="training">Entrenamiento Guiado</option>
                <option value="expedition">Expedición Territorial</option>
                <option value="community">Social / Comunidad</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium">Cupo máximo de atletas</label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium">Fecha y hora inicio</label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium">Fecha y hora fin</label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium">Precio de inscripción ($)</label>
              <input
                type="number"
                step="1"
                value={publicPrice}
                onChange={(e) => setPublicPrice(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium">Descuento Miembro (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium">Descripción y puntos de encuentro</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles de la ruta, hidratación y entrega de dorsales."
              className="mt-1.5 min-h-20 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onPress={onClose} className="bg-white/5 font-semibold text-white">
            Cancelar
          </Button>
          <Button
            onPress={handleSave}
            isDisabled={submitting || !name.trim()}
            className="bg-[#bcff40] font-bold text-[#10200b]"
          >
            <Plus size={16} /> {submitting ? 'Guardando…' : 'Crear Evento'}
          </Button>
        </div>
      </div>
    </div>
  )
}
