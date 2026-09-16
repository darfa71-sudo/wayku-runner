import { Button } from '@heroui/react'
import { PackageCheck, X } from 'lucide-react'
import { useState } from 'react'
import type { StoreCatalogItem } from '../../types'

export function StockAdjustModal({
  isOpen,
  onClose,
  item,
  onUpdateStock,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  item: StoreCatalogItem | null
  onUpdateStock: (variantId: string, location: string, newStock: number) => Promise<void>
  submitting: boolean
}) {
  const [stock, setStock] = useState<number>(item?.stockAvailable ?? 0)

  if (!isOpen || !item) return null

  const handleSave = async () => {
    await onUpdateStock(item.variantId, 'sede_norte_quito', stock)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <h3 className="font-semibold text-white">Ajustar Stock Físico</h3>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-1.5 text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-medium text-white">{item.name}</p>
            <p className="text-xs text-slate-400">
              Talla: <span className="text-sky-300 font-bold">{item.size}</span> · Sede: Norte Quito
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400">Cantidad física disponible</label>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStock((s) => Math.max(0, s - 1))}
                className="h-10 w-10 rounded-xl bg-white/5 font-bold text-white hover:bg-white/10"
              >
                -
              </button>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-[#07111d] text-center font-bold text-lg text-[#bcff40] outline-none"
              />
              <button
                type="button"
                onClick={() => setStock((s) => s + 1)}
                className="h-10 w-10 rounded-xl bg-white/5 font-bold text-white hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button onPress={onClose} className="bg-white/5 text-xs font-semibold text-white">
            Cancelar
          </Button>
          <Button
            onPress={handleSave}
            isDisabled={submitting}
            className="bg-[#bcff40] text-xs font-bold text-[#10200b]"
          >
            <PackageCheck size={14} /> {submitting ? 'Guardando…' : 'Actualizar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
