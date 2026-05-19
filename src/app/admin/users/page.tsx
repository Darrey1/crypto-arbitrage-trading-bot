'use client'

import { useState, useMemo } from 'react'
import { cn, formatCurrency } from '@/lib/utils'
import { Search, Shield, ShieldOff, Bot, MoreHorizontal, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

interface AdminUser {
  id: string; name: string; email: string; role: 'user' | 'admin'
  status: 'active' | 'banned'; joinedAt: string; activeBots: number
  totalTrades: number; totalProfit: number; mode: 'paper' | 'live'
}

function generateUsers(): AdminUser[] {
  const names = ['Alex T.', 'Maria S.', 'John D.', 'Priya K.', 'Liu W.', 'Carlos M.', 'Aisha B.', 'Tom R.']
  return Array.from({ length: 24 }, (_, i) => ({
    id: `U${String(i + 1).padStart(3, '0')}`,
    name: names[i % names.length],
    email: `user${i + 1}@mail.com`,
    role: i === 0 ? 'admin' : 'user',
    status: i % 11 === 0 ? 'banned' : 'active',
    joinedAt: new Date(Date.now() - (i * 7 + Math.random() * 30) * 86400000).toLocaleDateString(),
    activeBots: Math.floor(Math.random() * 2),
    totalTrades: Math.floor(Math.random() * 200),
    totalProfit: (Math.random() - 0.1) * 800,
    mode: Math.random() > 0.6 ? 'live' : 'paper',
  }))
}

const USERS = generateUsers()

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 10

  const filtered = useMemo(() => USERS.filter(u => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    return u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase())
  }), [search, statusFilter])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">User Management</h1>
        <span className="badge-muted text-xs px-3 py-1 rounded-full">{USERS.length} total users</span>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-base pl-8 h-8 text-xs w-52" placeholder="Search users…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input-base h-8 text-xs cursor-pointer w-32">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.05)]">
                {['ID', 'User', 'Role', 'Status', 'Mode', 'Bots', 'Trades', 'P&L', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(user => (
                <tr key={user.id} className="border-b border-[rgba(255,255,255,0.03)] table-row-hover">
                  <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">{user.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {user.name[0]}
                      </div>
                      <div>
                        <div className="text-slate-200 font-medium">{user.name}</div>
                        <div className="text-[10px] text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                      user.role === 'admin' ? 'badge-danger' : 'badge-muted'
                    )}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                      user.status === 'active' ? 'badge-success' : 'badge-danger'
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                      user.mode === 'live' ? 'badge-success' : 'badge-warning'
                    )}>
                      {user.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{user.activeBots}</td>
                  <td className="px-4 py-3 font-mono text-slate-300">{user.totalTrades}</td>
                  <td className={cn('px-4 py-3 font-mono font-semibold', user.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {formatCurrency(user.totalProfit)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{user.joinedAt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toast(user.status === 'active' ? `Banned ${user.name}` : `Unbanned ${user.name}`)}
                        className={cn('p-1.5 rounded-lg transition-colors text-[10px]',
                          user.status === 'active'
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        )}
                        title={user.status === 'active' ? 'Ban user' : 'Unban user'}>
                        {user.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-ghost px-3 py-1.5 rounded-lg text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
