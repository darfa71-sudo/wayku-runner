import { Activity, Calendar, Check, Clock, Plus, User, X } from 'lucide-react'
import { useState } from 'react'
import type { HubAgendaItem, HubService, User as UserModel } from '../../types'
import type { SpecialistItem } from '../../services/api'
import { NewAppointmentModal } from './NewAppointmentModal'

export function HubAgendaView({
  agenda,
  users,
  services,
  specialists,
  onCreateAppointment,
  onUpdateStatus,
  creating,
}: {
  agenda: HubAgendaItem[]
  users: UserModel[]
  services: HubService[]
  specialists: SpecialistItem[]
  onCreateAppointment: (data: {
    userId: string
    serviceId: string
    specialistId: string
    scheduledAt: string
    notes?: string
  }) => Promise<void>
  onUpdateStatus: (appointmentId: string, status: string) => Promise<void>
  creating: boolean
}) {
  const [isNewOpen, setIsNewOpen] = useState(false)

  const fisioCount = agenda.filter((a) => a.serviceType === 'physiotherapy').length
  const bioCount = agenda.filter((a) => a.serviceType === 'biomechanics').length
  const nutriCount = agenda.filter((a) => a.serviceType === 'nutrition').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-[#b7ff3c]/15 text-[#b7ff3c]'
      case 'confirmed':
        return 'bg-sky-400/15 text-sky-300'
      case 'cancelled':
        return 'bg-red-400/15 text-red-300'
      default:
        return 'bg-amber-400/15 text-amber-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'attended':
        return 'Atendida'
      case 'confirmed':
        return 'Confirmada'
      case 'cancelled':
        return 'Cancelada'
      default:
        return 'Agendada'
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Total citas</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{agenda.length}</p>
          <p className="mt-1 text-xs text-slate-500">en agenda general</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Fisioterapia</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#b7ff3c]">{fisioCount}</p>
          <p className="mt-1 text-xs text-slate-500">descargas y recuperación</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Biomecánica</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-sky-300">{bioCount}</p>
          <p className="mt-1 text-xs text-slate-500">test de pisada y técnica</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Nutrición</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-amber-300">{nutriCount}</p>
          <p className="mt-1 text-xs text-slate-500">planes y cargas para carrera</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Wayku Hub · Sede Norte Quito
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Agenda de Atletas y Turnos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Control de citas de deportistas, valoraciones de pisada, recuperación y fisioterapia deportiva.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#bcff40] px-4 py-2.5 text-sm font-bold text-[#10200b] transition hover:bg-[#a5f025]"
            >
              <Plus size={16} /> Agendar Cita
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-white/8">
          {agenda.length > 0 ? (
            agenda.map((item) => (
              <div
                key={item.appointmentId}
                className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.02]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#bcff40]/10 text-[#bcff40]">
                    <Activity size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.serviceName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <User size={13} className="text-slate-500" />
                        {item.athleteName || item.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-500" />
                        {new Date(item.scheduledAt).toLocaleString('es-EC', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-slate-500" />
                        {item.durationMinutes} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusBadge(
                      item.status,
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>

                  {item.status !== 'attended' && item.status !== 'cancelled' && (
                    <button
                      onClick={() => onUpdateStatus(item.appointmentId, 'attended')}
                      className="inline-flex items-center gap-1 rounded-lg bg-[#bcff40]/15 px-2.5 py-1 text-xs font-bold text-[#bcff40] hover:bg-[#bcff40]/25"
                      title="Marcar como atendida"
                    >
                      <Check size={12} /> Atendida
                    </button>
                  )}

                  {item.status !== 'cancelled' && item.status !== 'attended' && (
                    <button
                      onClick={() => onUpdateStatus(item.appointmentId, 'cancelled')}
                      className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                      title="Cancelar cita"
                    >
                      <X size={12} /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No hay turnos registrados en la agenda del centro. Haz clic en &ldquo;Agendar Cita&rdquo; para registrar el primero.
            </div>
          )}
        </div>
      </section>

      <NewAppointmentModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        users={users}
        services={services}
        specialists={specialists}
        onSubmit={onCreateAppointment}
        submitting={creating}
      />
    </div>
  )
}
