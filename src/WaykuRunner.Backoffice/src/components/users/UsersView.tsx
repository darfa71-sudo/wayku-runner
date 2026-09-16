import { Ban, CheckCircle, Crown, User } from 'lucide-react'
import { useState } from 'react'
import type { User as UserModel } from '../../types'

export function UsersView({
  users,
  onToggleStatus,
  onGrantMembership,
  updatingUser,
}: {
  users: UserModel[]
  onToggleStatus: (userId: string, newStatus: string) => Promise<void>
  onGrantMembership: (userId: string) => Promise<void>
  updatingUser: boolean
}) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase()
    return (
      u.email.toLowerCase().includes(term) ||
      (u.displayName && u.displayName.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-[#0e1b2b] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#bcff40]">
              Gestión de Comunidad
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-white">Comunidad de Runners & Atletas</h2>
            <p className="mt-2 text-sm text-slate-400">
              Administración de cuentas, suspensión de accesos y asignación manual de membresías competitivas.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar atleta por nombre o email…"
              className="w-full rounded-xl border border-white/10 bg-[#07111d] px-3.5 py-2 text-sm text-white outline-none focus:border-[#bcff40]"
            />
          </div>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl border border-white/8">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isBlocked = user.accountStatus === 'blocked'
              const isPro = user.membershipState === 'active' || user.membershipState === 'grace'

              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-4 border-b border-white/8 p-5 last:border-b-0 hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-400/10 text-sky-300">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{user.displayName || user.email}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            isBlocked ? 'bg-red-400/15 text-red-300' : 'bg-[#b7ff3c]/15 text-[#b7ff3c]'
                          }`}
                        >
                          {user.accountStatus}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{user.email}</p>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold ${
                            isPro
                              ? 'bg-violet-400/15 text-violet-300'
                              : 'bg-white/5 text-slate-400'
                          }`}
                        >
                          <Crown size={12} /> Membresía: {user.membershipState}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {!isPro && (
                      <button
                        onClick={() => onGrantMembership(user.id)}
                        disabled={updatingUser}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#bcff40]/15 px-3 py-1.5 text-xs font-bold text-[#bcff40] transition hover:bg-[#bcff40]/25 disabled:opacity-50"
                      >
                        <Crown size={14} /> Activar PRO 30d
                      </button>
                    )}

                    <button
                      onClick={() => onToggleStatus(user.id, isBlocked ? 'active' : 'blocked')}
                      disabled={updatingUser}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                        isBlocked
                          ? 'bg-sky-400/15 text-sky-300 hover:bg-sky-400/25'
                          : 'bg-red-400/10 text-red-300 hover:bg-red-400/20'
                      }`}
                    >
                      {isBlocked ? (
                        <>
                          <CheckCircle size={14} /> Desbloquear
                        </>
                      ) : (
                        <>
                          <Ban size={14} /> Bloquear
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-12 text-center text-sm text-slate-500">
              No se encontraron corredores que coincidan con la búsqueda.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
