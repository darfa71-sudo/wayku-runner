import { Plus } from 'lucide-react'

export interface RowItem {
  title: string
  detail: string
  tag: string
}

export function ManagementList({
  title,
  description,
  rows,
  emptyMessage,
  onNew,
}: {
  title: string
  description: string
  rows: RowItem[]
  emptyMessage: string
  onNew?: () => void
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
            Gestión operativa
          </span>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>
        {onNew && (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 rounded-xl bg-[#bcff40] px-4 py-2.5 text-sm font-bold text-[#10200b] transition hover:bg-[#a5f025]"
          >
            <Plus size={16} /> Nuevo
          </button>
        )}
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-white/8">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div
              key={`${row.title}-${index}`}
              className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 last:border-b-0 hover:bg-white/[0.02]"
            >
              <div>
                <p className="font-semibold text-white">{row.title}</p>
                <p className="mt-1 text-sm text-slate-500">{row.detail}</p>
              </div>
              <span className="rounded-full bg-white/7 px-3 py-1 text-xs font-bold capitalize text-slate-300">
                {row.tag}
              </span>
            </div>
          ))
        ) : (
          <div className="px-5 py-12 text-center text-sm text-slate-500">{emptyMessage}</div>
        )}
      </div>
    </section>
  )
}
