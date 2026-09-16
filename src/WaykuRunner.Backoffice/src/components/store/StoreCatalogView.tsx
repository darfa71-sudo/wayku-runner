import { BadgePercent, Edit3, Plus, ShoppingBag, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { StoreCatalogItem } from '../../types'
import { NewProductModal } from './NewProductModal'
import { StockAdjustModal } from './StockAdjustModal'

export function StoreCatalogView({
  catalog,
  onCreateProduct,
  onUpdateStock,
  onDeactivateProduct,
  creating,
  updatingStock,
}: {
  catalog: StoreCatalogItem[]
  onCreateProduct: (data: {
    code: string
    name: string
    category: string
    description?: string
    basePrice: number
    memberDiscountPercent: number
    variants: Array<{ sku: string; size: string; color: string; additionalPrice: number; initialStock: number }>
  }) => Promise<void>
  onUpdateStock: (variantId: string, location: string, newStock: number) => Promise<void>
  onDeactivateProduct: (productId: string) => Promise<void>
  creating: boolean
  updatingStock: boolean
}) {
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [selectedStockItem, setSelectedStockItem] = useState<StoreCatalogItem | null>(null)

  const totalStock = catalog.reduce((sum, item) => sum + item.stockAvailable, 0)
  const uniqueProducts = new Set(catalog.map((c) => c.productId)).size

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Productos en catálogo</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{uniqueProducts}</p>
          <p className="mt-1 text-xs text-slate-500">modelos e indumentaria oficial</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Variantes de stock</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-sky-300">{catalog.length}</p>
          <p className="mt-1 text-xs text-slate-500">combinaciones de talla y color</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Stock físico en sede</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#b7ff3c]">{totalStock}</p>
          <p className="mt-1 text-xs text-slate-500">unidades disponibles para entrega</p>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Wayku Store · Inventario Central
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Catálogo de Merchandising & Ropa</h2>
            <p className="mt-2 text-sm text-slate-400">
              Artículos oficiales, kits de carrera e hidratación disponibles para corredores y miembros.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#bcff40] px-4 py-2.5 text-sm font-bold text-[#10200b] transition hover:bg-[#a5f025]"
            >
              <Plus size={16} /> Nuevo Producto
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.length > 0 ? (
            catalog.map((item) => {
              const memberPrice = (
                item.finalPrice *
                (1 - item.memberDiscountPercent / 100)
              ).toFixed(2)

              return (
                <div
                  key={`${item.productId}-${item.variantId}`}
                  className="flex flex-col justify-between rounded-2xl border border-white/8 bg-[#07111d] p-5 transition hover:border-[#bcff40]/30"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-400">
                        <Tag size={11} /> {item.category}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          item.stockAvailable > 0
                            ? 'bg-[#b7ff3c]/12 text-[#b7ff3c]'
                            : 'bg-red-400/15 text-red-300'
                        }`}
                      >
                        {item.stockAvailable > 0 ? `${item.stockAvailable} en stock` : 'Agotado'}
                      </span>
                    </div>

                    <h3 className="mt-3 font-semibold text-white text-base leading-snug">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 font-mono">
                      SKU: {item.sku} · Color: {item.color}
                    </p>

                    <div className="mt-3 inline-block rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-sky-300">
                      Talla: {item.size}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/8 pt-3 space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Público</p>
                        <p className="text-lg font-bold text-white">${item.finalPrice.toFixed(2)}</p>
                      </div>

                      {item.memberDiscountPercent > 0 && (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b7ff3c]">
                            <BadgePercent size={12} /> Miembro (-{item.memberDiscountPercent}%)
                          </span>
                          <p className="text-base font-extrabold text-[#b7ff3c]">${memberPrice}</p>
                        </div>
                      )}
                    </div>

                    {/* Acciones del CRUD */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                      <button
                        onClick={() => setSelectedStockItem(item)}
                        className="inline-flex items-center gap-1 font-semibold text-sky-300 hover:underline"
                      >
                        <Edit3 size={13} /> Ajustar stock
                      </button>
                      <button
                        onClick={() => onDeactivateProduct(item.productId)}
                        className="inline-flex items-center gap-1 text-slate-500 hover:text-red-400"
                        title="Desactivar producto"
                      >
                        <Trash2 size={13} /> Dar de baja
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">
              No hay productos registrados en el catálogo. Haz clic en &ldquo;Nuevo Producto&rdquo; para agregar el primero.
            </div>
          )}
        </div>
      </section>

      <NewProductModal
        isOpen={isNewOpen}
        onClose={() => setIsNewOpen(false)}
        onSubmit={onCreateProduct}
        submitting={creating}
      />

      <StockAdjustModal
        isOpen={!!selectedStockItem}
        onClose={() => setSelectedStockItem(null)}
        item={selectedStockItem}
        onUpdateStock={onUpdateStock}
        submitting={updatingStock}
      />
    </div>
  )
}
