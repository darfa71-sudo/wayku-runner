import { Button } from '@heroui/react'
import { Crosshair, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FeatureCollection, Point } from '../../types'
import { MapWorkspace } from '../map/MapWorkspace'

export function ZoneEditor({
  zoneFeatures,
  draftPoints,
  onAddPoint,
  onClearPoints,
  onSaveZone,
  saving,
}: {
  zoneFeatures: FeatureCollection
  draftPoints: Point[]
  onAddPoint: (point: Point) => void
  onClearPoints: () => void
  onSaveZone: (zone: { code: string; name: string; description: string }) => Promise<void>
  saving: boolean
}) {
  const [zoneName, setZoneName] = useState('')
  const [zoneCode, setZoneCode] = useState('')
  const [zoneDescription, setZoneDescription] = useState('')

  const handleSave = async () => {
    if (!zoneName.trim() || !zoneCode.trim() || draftPoints.length < 3) return
    await onSaveZone({
      code: zoneCode.trim().toLowerCase(),
      name: zoneName.trim(),
      description: zoneDescription.trim(),
    })
    setZoneName('')
    setZoneCode('')
    setZoneDescription('')
  }

  return (
    <section className="grid min-h-[650px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b1625] shadow-2xl shadow-black/20 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative min-h-[550px]">
        <MapWorkspace
          zones={zoneFeatures}
          draftPoints={draftPoints}
          onPoint={onAddPoint}
        />

        <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/10 bg-[#07111d]/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Crosshair size={16} className="text-[#bcff40]" /> Editor territorial
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Haz clic en el mapa para trazar los vértices del territorio.
          </p>
        </div>

        {draftPoints.length > 0 && (
          <button
            onClick={onClearPoints}
            className="absolute bottom-5 left-5 rounded-xl border border-white/15 bg-[#07111d]/90 px-3 py-2 text-xs font-semibold text-white backdrop-blur hover:bg-[#07111d]"
          >
            Limpiar trazado ({draftPoints.length} puntos)
          </button>
        )}
      </div>

      <aside className="border-t border-white/10 bg-[#101e30] p-6 xl:border-l xl:border-t-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Nuevo borrador
            </span>
            <h2 className="mt-2 text-xl font-semibold text-white">Crear territorio</h2>
          </div>
          <span className="rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-300">
            {draftPoints.length} puntos
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-300">
            Nombre de zona
            <input
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="Ej. Parque La Carolina"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#bcff40]/70"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Código interno
            <input
              value={zoneCode}
              onChange={(e) => setZoneCode(e.target.value)}
              placeholder="la-carolina"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#bcff40]/70"
            />
          </label>

          <label className="block text-sm font-medium text-slate-300">
            Descripción
            <textarea
              value={zoneDescription}
              onChange={(e) => setZoneDescription(e.target.value)}
              placeholder="Características de la zona, puntos de referencia, etc."
              className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-[#07111d] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#bcff40]/70"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-sky-300/10 bg-sky-300/5 p-4 text-sm leading-6 text-slate-400">
          El territorio se guardará inicialmente en <strong className="text-slate-200">borrador</strong>.
          Podrás publicarlo luego desde el mapa o inventario una vez validado el polígono.
        </div>

        <Button
          onPress={handleSave}
          isDisabled={saving || !zoneName.trim() || !zoneCode.trim() || draftPoints.length < 3}
          className="mt-5 w-full bg-[#bcff40] font-bold text-[#10200b]"
        >
          <Plus size={16} /> {saving ? 'Guardando territorio…' : 'Guardar borrador'}
        </Button>
      </aside>
    </section>
  )
}
