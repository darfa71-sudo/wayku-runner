import { CalendarDays, PackagePlus, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import type { RunnerEvent, StoreCatalogItem, User } from '../../types'
import { EventRegistrationModal } from './EventRegistrationModal'
import { NewEventModal } from './NewEventModal'
import type { CreateEventPayload } from '../../services/api'

export function EventsView({
  events,
  users,
  catalog,
  onCreateEvent,
  onArchiveEvent,
  onRegisterAthlete,
  creating,
  registering,
}: {
  events: RunnerEvent[]
  users: User[]
  catalog: StoreCatalogItem[]
  onCreateEvent: (payload: CreateEventPayload) => Promise<void>
  onArchiveEvent: (id: string) => Promise<void>
  onRegisterAthlete: (data: {
    userId: string
    eventId: string
    items: Array<{ variantId: string; quantity: number }>
  }) => Promise<void>
  creating: boolean
  registering: boolean
}) {
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isRegisterOpen, setIsRegisterOpen] = useState(false)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Gestión operativa
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Eventos, Carreras y Desafíos</h2>
            <p className="mt-2 text-sm text-slate-400">
              Crea carreras oficiales, abre inscripciones y vincula indumentaria oficial a cada evento.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <PackagePlus size={16} className="text-[#bcff40]" /> Inscribir Atleta + Merch
            </button>
            <button
              onClick={() => setIsNewOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#bcff40] px-4 py-2.5 text-sm font-bold text-[#10200b] transition hover:bg-[#a5f025]"
            >
              <Plus size={16} /> Nueva Carrera
            </button>
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-white/8">
          {events.length > 0 ? (
            events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-4 border-b border-white/8 p-5 last:border-b-0 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-white text-base">{e.name}</p>
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-bold uppercase text-slate-300">
                      {e.eventType}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} className="text-slate-500" />
                      {new Date(e.startsAt).toLocaleDateString('es-EC', { dateStyle: 'long' })}
                    </span>
                    <span>Precio: ${e.publicPrice ?? 0}</span>
                    {e.memberDiscountPercent ? (
                      <span className="text-[#bcff40]">Descuento Miembro: {e.memberDiscountPercent}%</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      e.status === 'archived'
                        ? 'bg-white/5 text-slate-500'
                        : 'bg-[#b7ff3c]/15 text-[#b7ff3c]'
                    }`}
                  >
                    {e.status}
                  </span>

                  {e.status !== 'archived' && (
                    <button
                      onClick={() => onArchiveEvent(e.id)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5"
                      title="Archivar evento"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              Aún no hay eventos registrados. Haz clic en &ldquo;Nueva Carrera&rdquo; para crear el primero.
            </div>
          )}
        </div>
      </section>

      <NewEventModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={onCreateEvent}
        submitting={creating}
      />

      <EventRegistrationModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        users={users}
        events={events}
        catalog={catalog}
        onRegister={onRegisterAthlete}
        submitting={registering}
      />
    </div>
  )
}
