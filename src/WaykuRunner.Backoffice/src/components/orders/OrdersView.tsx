import { CheckCircle2, Clock, QrCode } from 'lucide-react'
import { useState } from 'react'
import type { OrderSummary } from '../../types'

export function OrdersView({
  orders,
  onClaimQr,
  claiming,
}: {
  orders: OrderSummary[]
  onClaimQr: (qrCode: string) => Promise<void>
  claiming: boolean
}) {
  const [qrInput, setQrInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  )

  const handleClaim = async () => {
    if (!qrInput.trim()) return
    setFeedback(null)
    try {
      await onClaimQr(qrInput.trim().toUpperCase())
      setFeedback({ type: 'success', message: '¡Entrega de kit/merch validada con éxito en sede!' })
      setQrInput('')
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al validar el código.',
      })
    }
  }

  const fulfilledCount = orders.filter((o) => o.status === 'fulfilled').length
  const pendingCount = orders.filter((o) => o.status !== 'fulfilled').length

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Total pedidos</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">{orders.length}</p>
          <p className="mt-1 text-xs text-slate-500">carreras, kits e indumentaria</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Listos para retiro</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-amber-300">{pendingCount}</p>
          <p className="mt-1 text-xs text-slate-500">pendientes en recepción del Hub</p>
        </div>
        <div className="rounded-3xl border border-white/8 bg-[#0e1b2b] p-5">
          <p className="text-sm font-medium text-slate-400">Entregas completadas</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#b7ff3c]">{fulfilledCount}</p>
          <p className="mt-1 text-xs text-slate-500">validadas por código QR</p>
        </div>
      </section>

      {/* Validador rápido de QR en recepción */}
      <section className="rounded-3xl border border-[#bcff40]/25 bg-[#bcff40]/7 p-6 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#bcff40]">
              <QrCode size={18} /> Validación de entrega en centro físico
            </div>
            <p className="mt-1 text-sm text-slate-300">
              Escanea o ingresa el código del corredor para entregar su kit de carrera o indumentaria.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value.toUpperCase())}
              placeholder="Código QR (ej. A1B2C3D4)"
              className="w-48 sm:w-56 rounded-xl border border-white/15 bg-[#07111d] px-3 py-2 text-sm font-mono uppercase text-white outline-none focus:border-[#bcff40]"
            />
            <button
              onClick={handleClaim}
              disabled={claiming || !qrInput.trim()}
              className="rounded-xl bg-[#bcff40] px-4 py-2 text-sm font-bold text-[#10200b] transition hover:bg-[#a5f025] disabled:opacity-50"
            >
              {claiming ? 'Validando…' : 'Validar entrega'}
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl px-4 py-2.5 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-[#b7ff3c]/20 text-[#b7ff3c]'
                : 'bg-red-400/20 text-red-200'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </section>

      {/* Lista de Órdenes */}
      <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Registro de compras
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Historial de Órdenes</h2>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/8">
          {orders.length > 0 ? (
            orders.map((order) => {
              const isFulfilled = order.status === 'fulfilled'

              return (
                <div
                  key={order.id}
                  className="flex flex-col gap-4 border-b border-white/8 p-5 last:border-b-0 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-white">{order.athleteName}</p>
                      <span className="font-mono text-xs font-bold text-sky-400">
                        QR: {order.qrClaimCode}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>{order.userEmail}</span>
                      {order.eventName && (
                        <span className="text-[#bcff40]">Evento: {order.eventName}</span>
                      )}
                      <span>
                        {new Date(order.createdAt).toLocaleDateString('es-EC', {
                          dateStyle: 'short',
                        })}
                      </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {order.items.map((item) => (
                          <span
                            key={item.id}
                            className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
                          >
                            {item.quantity}x {item.itemType} {item.variantSize ? `(Talla ${item.variantSize})` : ''} - ${item.subtotal.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monto total</p>
                      <p className="text-lg font-bold text-white">${order.netAmount.toFixed(2)}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold uppercase ${
                        isFulfilled
                          ? 'bg-[#b7ff3c]/15 text-[#b7ff3c]'
                          : 'bg-amber-400/15 text-amber-300'
                      }`}
                    >
                      {isFulfilled ? (
                        <>
                          <CheckCircle2 size={13} /> Entregado
                        </>
                      ) : (
                        <>
                          <Clock size={13} /> Retiro en sede
                        </>
                      )}
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              Aún no hay órdenes registradas.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
