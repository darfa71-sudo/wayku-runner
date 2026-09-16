import { Button } from '@heroui/react'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import type { HubService, SpecialistItem, User } from '../../types'

export function NewAppointmentModal({
  isOpen,
  onClose,
  users,
  services,
  specialists,
  onSubmit,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  users: User[]
  services: HubService[]
  specialists: SpecialistItem[]
  onSubmit: (data: {
    userId: string
    serviceId: string
    specialistId: string
    scheduledAt: string
    notes?: string
  }) => Promise<void>
  submitting: boolean
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedSpecialistId, setSelectedSpecialistId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('2026-10-15T10:00')
  const [notes, setNotes] = useState('')

  if (!isOpen) return null

  const handleSave = async () => {
    if (!selectedUserId || !selectedServiceId || !selectedSpecialistId) return

    await onSubmit({
      userId: selectedUserId,
      serviceId: selectedServiceId,
      specialistId: selectedSpecialistId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      notes: notes.trim() || undefined,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Wayku Hub
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Agendar Cita / Valoración</h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 font-medium">Atleta / Corredor</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            >
              <option value="">Seleccionar corredor…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium">Servicio del Centro</label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            >
              <option value="">Seleccionar servicio…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} min) — ${s.price}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium">Especialista / Profesional</label>
            <select
              value={selectedSpecialistId}
              onChange={(e) => setSelectedSpecialistId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            >
              <option value="">Seleccionar profesional…</option>
              {specialists.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.specialty})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium">Fecha y hora del turno</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium">Motivo o notas de consulta</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Valoración de pisada para carrera de 10K, molestia en gemelo."
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
            isDisabled={submitting || !selectedUserId || !selectedServiceId || !selectedSpecialistId}
            className="bg-[#bcff40] font-bold text-[#10200b]"
          >
            <Plus size={16} /> {submitting ? 'Agendando…' : 'Confirmar Turno'}
          </Button>
        </div>
      </div>
    </div>
  )
}
