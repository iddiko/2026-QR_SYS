"use client"

import React from 'react'
import { useBuildingScope } from '../../lib/buildingScope'
import { getClientAuthHeaders } from '../../lib/clientAuth'

type Building = { id: string; name: string }

export default function BuildingScopeSelect() {
  const { scope, setScope } = useBuildingScope()
  const [buildings, setBuildings] = React.useState<Building[]>([])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const headers = await getClientAuthHeaders()
      if (!headers.Authorization && !headers['x-demo-role']) return

      const res = await fetch('/api/buildings?limit=200', { headers, cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as { buildings?: Building[] }
      if (!res.ok) return
      if (cancelled) return
      setBuildings(Array.isArray(json.buildings) ? json.buildings : [])
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value === '__all__') {
      setScope({ type: 'all', id: null, name: '전체' })
      return
    }

    const match = buildings.find((b) => b.id === value)
    if (!match) return
    setScope({ type: 'building', id: match.id, name: match.name })
  }

  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">동 선택</p>
      <select
        value={scope.type === 'all' ? '__all__' : scope.id}
        onChange={handleChange}
        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
      >
        <option value="__all__">전체</option>
        {buildings.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  )
}

