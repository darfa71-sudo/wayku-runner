import { Globe, MapPinned, RefreshCw, Send } from 'lucide-react'
import type { FeatureCollection, Zone } from '../../types'
import { MapWorkspace } from '../map/MapWorkspace'

export function ZoneInventory({
  zones,
  zoneFeatures,
  onPublishZone,
  publishingZoneId,
  onRefresh,
  refreshing,
}: {
  zones: Zone[]
  zoneFeatures: FeatureCollection
  onPublishZone: (zoneId: string) => Promise<void>
  publishingZoneId: string | null
  onRefresh: () => Promise<void>
  refreshing: boolean
}) {
  const publishedCount = zones.filter((z) => z.status === 'published').length
  const draftCount = zones.filter((z) => z.status === 'draft').length

  return (
    <section className="grid min-h-[680px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1625] shadow-2xl shadow-black/20 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative min-h-[560px]">
        <MapWorkspace
          zones={zoneFeatures}
          draftPoints={[]}
          onPoint={() => undefined}
          readOnly
        />
        <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-[#07111d]/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <MapPinned size={16} className="text-[#bcff40]" /> Mapa global de territorios
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Vista de consulta y publicación de arenas territoriales.
          </p>
        </div>
      </div>

      <aside className="border-t border-white/10 bg-[#101e30] p-6 xl:border-l xl:border-t-0 flex flex-col justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
            Inventario territorial
          </span>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Todas las zonas</h2>
            <button
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-[#b7ff3c]/50 hover:text-[#b7ff3c] disabled:opacity-50"
              title="Actualizar territorios"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#07111d] p-4">
              <p className="text-2xl font-bold text-white">{zones.length}</p>
              <p className="mt-1 text-xs text-slate-500">territorios totales</p>
            </div>
            <div className="rounded-2xl bg-[#07111d] p-4">
              <p className="text-2xl font-bold text-[#b7ff3c]">{publishedCount}</p>
              <p className="mt-1 text-xs text-slate-500">publicados ({draftCount} borradores)</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {zones.length > 0 ? (
              zones.map((zone) => {
                const isPublished = zone.status === 'published'
                const isPublishing = publishingZoneId === zone.id

                return (
                  <div
                    key={zone.id}
                    className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-[#07111d] p-3.5 transition hover:border-white/15"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{zone.name}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{zone.code}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                          isPublished
                            ? 'bg-[#b7ff3c]/12 text-[#b7ff3c]'
                            : 'bg-sky-300/10 text-sky-300'
                        }`}
                      >
                        {isPublished ? 'Publicado' : 'Borrador'}
                      </span>
                    </div>

                    {!isPublished && (
                      <div className="mt-1 flex items-center justify-between border-t border-white/5 pt-2">
                        <span className="text-[11px] text-slate-400">Listo para activación</span>
                        <button
                          onClick={() => onPublishZone(zone.id)}
                          disabled={isPublishing}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#b7ff3c]/15 px-2.5 py-1 text-xs font-bold text-[#b7ff3c] transition hover:bg-[#b7ff3c]/25 disabled:opacity-50"
                        >
                          <Send size={12} />
                          {isPublishing ? 'Publicando…' : 'Publicar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center text-sm leading-6 text-slate-500">
                Aún no hay territorios registrados. Ve a la pestaña &ldquo;Territorios&rdquo; para trazar el primero.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-white/8 pt-4 text-xs leading-5 text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-slate-400" />
            <span>Sistema PostGIS EPSG:4326</span>
          </div>
          <div>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#b7ff3c]" />
            Publicado
            <span className="ml-3 mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-300" />
            Borrador
          </div>
        </div>
      </aside>
    </section>
  )
}
