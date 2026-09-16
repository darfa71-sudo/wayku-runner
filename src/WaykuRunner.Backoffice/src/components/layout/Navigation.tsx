import {
  CalendarDays,
  CircleDollarSign,
  HeartPulse,
  Layers3,
  MapPinned,
  Menu,
  PackageCheck,
  ShoppingBag,
  UsersRound,
  X,
} from 'lucide-react'
import type { NavigationItem, Section } from '../../types'

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'resumen', label: 'Resumen', icon: Layers3 },
  { id: 'zonas', label: 'Territorios', icon: MapPinned },
  { id: 'mapa', label: 'Mapa global', icon: MapPinned },
  { id: 'eventos', label: 'Eventos & Carreras', icon: CalendarDays },
  { id: 'hub', label: 'Centro Físico (Hub)', icon: HeartPulse },
  { id: 'tienda', label: 'Tienda & Merch', icon: ShoppingBag },
  { id: 'ordenes', label: 'Órdenes & Retiro QR', icon: PackageCheck },
  { id: 'usuarios', label: 'Usuarios & Atletas', icon: UsersRound },
  { id: 'suscripciones', label: 'Suscripciones', icon: CircleDollarSign },
]

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#bcff40] text-sm font-black text-[#10200b]">
        W
      </div>
      <div>
        <p className="text-sm font-black tracking-tight text-white">WAYKU</p>
        <p className="text-[10px] font-bold tracking-[.18em] text-[#bcff40]">RUNNER OPS</p>
      </div>
    </div>
  )
}

export function Sidebar({
  currentSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
}: {
  currentSection: Section
  onSelectSection: (section: Section) => void
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 border-r border-white/8 bg-[#091522] px-5 py-6 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <Brand />
          <button
            className="text-slate-400 hover:text-white lg:hidden"
            onClick={onCloseMobile}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="mt-10 space-y-1">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon
            const active = item.id === currentSection
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSection(item.id)
                  onCloseMobile()
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                  active
                    ? 'bg-[#bcff40] text-[#10200b]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 rounded-2xl border border-[#bcff40]/15 bg-[#bcff40]/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#bcff40]">Piloto Quito</p>
          <p className="mt-2 text-sm leading-5 text-slate-400">
            La operación empieza en los parques principales del distrito.
          </p>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
        />
      )}
    </>
  )
}

export function Header({
  currentLabel,
  connected,
  onOpenMobile,
}: {
  currentLabel: string
  connected: boolean
  onOpenMobile: () => void
}) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-white/8 px-5 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          className="text-slate-400 hover:text-white lg:hidden"
          aria-label="Abrir menú"
          onClick={onOpenMobile}
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Wayku Runner</p>
          <h1 className="text-lg font-semibold text-white">{currentLabel}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`hidden h-2.5 w-2.5 rounded-full sm:block ${
            connected ? 'bg-[#bcff40] shadow-[0_0_16px_#bcff40]' : 'bg-orange-400'
          }`}
        />
        <span className="hidden text-sm text-slate-400 sm:block">
          {connected ? 'API local conectada' : 'Modo de vista previa'}
        </span>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#bcff40] to-[#74baff] text-xs font-black text-[#10200b]">
          WR
        </div>
      </div>
    </header>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string
  value: number | string
  detail: string
  icon: typeof Layers3
  tone: 'lime' | 'sky' | 'violet' | 'orange'
}) {
  const tones = {
    lime: 'bg-[#bcff40]/12 text-[#bcff40]',
    sky: 'bg-sky-400/12 text-sky-300',
    violet: 'bg-violet-400/12 text-violet-300',
    orange: 'bg-orange-400/12 text-orange-300',
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  )
}
