import { CalendarDays, ChevronRight, MapPinned, ShieldCheck, UsersRound } from 'lucide-react'
import type { Membership, RunnerEvent, User, Zone } from '../../types'
import { MetricCard } from '../layout/Navigation'

export function DashboardOverview({
  zones,
  events,
  users,
  memberships,
  onGoToZones,
}: {
  zones: Zone[]
  events: RunnerEvent[]
  users: User[]
  memberships: Membership[]
  onGoToZones: () => void
}) {
  const activeMembers = memberships.filter((m) => m.status === 'active').length

  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Territorios"
          value={zones.length}
          detail="zonas configuradas"
          icon={MapPinned}
          tone="lime"
        />
        <MetricCard
          label="Corredores"
          value={users.length}
          detail="usuarios en plataforma"
          icon={UsersRound}
          tone="sky"
        />
        <MetricCard
          label="Membresías"
          value={activeMembers}
          detail="competitivas activas"
          icon={ShieldCheck}
          tone="violet"
        />
        <MetricCard
          label="Eventos"
          value={events.length}
          detail="en calendario"
          icon={CalendarDays}
          tone="orange"
        />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.6fr_0.8fr]">
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-6 shadow-2xl shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
                Control territorial
              </span>
              <h2 className="mt-2 text-2xl font-semibold text-white">El mapa se administra aquí</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Cada territorio es un polígono PostGIS, con sus rutas oficiales, versión y estado de
                publicación.
              </p>
            </div>
            <button
              onClick={onGoToZones}
              className="hidden items-center gap-1 text-sm font-semibold text-[#bcff40] sm:flex hover:underline"
            >
              Abrir editor <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <ProcessCard step="01" title="Dibuja" detail="Límite seguro de la zona" />
            <ProcessCard step="02" title="Valida" detail="Rutas y tolerancias GPS" />
            <ProcessCard step="03" title="Publica" detail="Disponible para runners" />
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-6">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Próximos eventos
          </span>
          <div className="mt-4 space-y-3">
            {events.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#07111d] p-3"
              >
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-400/10 text-orange-300">
                  <CalendarDays size={16} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{event.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(event.startsAt).toLocaleDateString('es-EC')}
                  </p>
                </div>
              </div>
            ))}
            {!events.length && (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                Cuando crees una carrera o desafío aparecerá aquí.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function ProcessCard({ step, title, detail }: { step: string; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#07111d] p-4">
      <span className="text-xs font-black text-[#bcff40]">{step}</span>
      <p className="mt-5 font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}
