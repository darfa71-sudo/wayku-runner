import { Button } from '@heroui/react'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'

export function NewProductModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    code: string
    name: string
    category: string
    description?: string
    basePrice: number
    memberDiscountPercent: number
    variants: Array<{ sku: string; size: string; color: string; additionalPrice: number; initialStock: number }>
  }) => Promise<void>
  submitting: boolean
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('indumentaria')
  const [description, setDescription] = useState('')
  const [basePrice, setBasePrice] = useState('25.00')
  const [discount, setDiscount] = useState('15')
  const [sizes, setSizes] = useState<{ size: string; stock: number }[]>([
    { size: 'S', stock: 10 },
    { size: 'M', stock: 15 },
    { size: 'L', stock: 10 },
  ])

  if (!isOpen) return null

  const handleStockChange = (size: string, stock: number) => {
    setSizes((curr) => curr.map((s) => (s.size === size ? { ...s, stock } : s)))
  }

  const toggleSize = (sizeName: string) => {
    if (sizes.some((s) => s.size === sizeName)) {
      setSizes((curr) => curr.filter((s) => s.size !== sizeName))
    } else {
      setSizes((curr) => [...curr, { size: sizeName, stock: 10 }])
    }
  }

  const handleSave = async () => {
    if (!code.trim() || !name.trim() || sizes.length === 0) return

    const variants = sizes.map((s) => ({
      sku: `${code.trim().toUpperCase()}-${s.size}`,
      size: s.size,
      color: 'Oficial',
      additionalPrice: 0,
      initialStock: s.stock,
    }))

    await onSubmit({
      code: code.trim().toLowerCase(),
      name: name.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      basePrice: parseFloat(basePrice) || 0,
      memberDiscountPercent: parseFloat(discount) || 0,
      variants,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Wayku Store
            </span>
            <h2 className="mt-1 text-xl font-semibold text-white">Nuevo Producto / Indumentaria</h2>
          </div>
          <button onClick={onClose} className="rounded-xl bg-white/5 p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div>
            <label className="block text-slate-300 font-medium">Nombre del producto</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Medias de Compresión Wayku"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium">Código interno</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="med-comp-01"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
              >
                <option value="indumentaria">Indumentaria</option>
                <option value="accesorios">Accesorios</option>
                <option value="hidratacion">Hidratación</option>
                <option value="recuperacion">Recuperación</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium">Precio público ($)</label>
              <input
                type="number"
                step="0.5"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
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
            <label className="block text-slate-300 font-medium">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Materiales, detalles de diseño, etc."
              className="mt-1.5 min-h-16 w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-white outline-none focus:border-[#bcff40]"
            />
          </div>

          {/* Tallas y Stock */}
          <div>
            <label className="block text-slate-300 font-medium">Tallas y Stock inicial en sede</label>
            <div className="mt-2 flex gap-2">
              {['XS', 'S', 'M', 'L', 'XL', 'UNICA'].map((sz) => {
                const active = sizes.some((s) => s.size === sz)
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      active ? 'bg-[#bcff40] text-[#10200b]' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 space-y-2">
              {sizes.map((s) => (
                <div key={s.size} className="flex items-center justify-between rounded-xl bg-[#07111d] px-3 py-2">
                  <span className="font-bold text-sky-300 text-xs">Talla {s.size}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Stock:</span>
                    <input
                      type="number"
                      value={s.stock}
                      onChange={(e) => handleStockChange(s.size, parseInt(e.target.value) || 0)}
                      className="w-16 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-center text-xs text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button onPress={onClose} className="bg-white/5 font-semibold text-white">
            Cancelar
          </Button>
          <Button
            onPress={handleSave}
            isDisabled={submitting || !code.trim() || !name.trim() || sizes.length === 0}
            className="bg-[#bcff40] font-bold text-[#10200b]"
          >
            <Plus size={16} /> {submitting ? 'Creando…' : 'Crear Producto'}
          </Button>
        </div>
      </div>
    </div>
  )
}
