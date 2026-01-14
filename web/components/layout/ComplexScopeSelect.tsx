"use client"

import React from 'react'
import useComplexes from '../../hooks/useComplexes'
import type { ComplexScope } from '../../lib/complexScope'
import { useComplexScope } from '../../lib/complexScope'

export default function ComplexScopeSelect() {
  const { scope, setScope } = useComplexScope()
  const { complexes } = useComplexes(50)

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    if (value === '__all__') {
      setScope({ type: 'all', id: null, name: '전체' })
      return
    }

    const match = complexes.find((c) => c.id === value)
    if (!match) return
    const next: ComplexScope = { type: 'complex', id: match.id, name: match.name }
    setScope(next)
  }

  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">단지 선택</p>
      <select
        value={scope.type === 'all' ? '__all__' : scope.id}
        onChange={handleChange}
        className="mt-2 w-full rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
      >
        <option value="__all__">전체</option>
        {complexes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
}

