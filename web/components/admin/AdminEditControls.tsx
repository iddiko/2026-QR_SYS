"use client"

import React from 'react'
import useAppSession from '../../lib/authSession'
import { useAdminCustomization } from '../../lib/adminCustomization'
import MenuEditorPanel from './MenuEditorPanel'
import DashboardUserMenu from '../layout/DashboardUserMenu'

type AdminEditControlsProps = {
  email: string
  role?: string
  onLogout: () => void
}

export default function AdminEditControls({ email, role, onLogout }: AdminEditControlsProps) {
  const { session } = useAppSession()
  const isSuper = session?.role === 'SUPER'
  const { state, setEditMode } = useAdminCustomization()
  const [panelOpen, setPanelOpen] = React.useState(false)

  const togglePanel = () => {
    if (!isSuper) return
    const nextOpen = !panelOpen
    setPanelOpen(nextOpen)
    setEditMode(nextOpen)
  }

  const close = () => {
    setPanelOpen(false)
    setEditMode(false)
  }

  return (
    <div className="flex items-center gap-2">
      {isSuper && (
        <>
          <button
            type="button"
            onClick={togglePanel}
            className={`inline-flex items-center justify-center rounded-full border p-2 transition ${
              state.editMode
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/15 dark:text-sky-300'
                : 'border-white/10 bg-white/10 text-slate-700 hover:bg-white/20 dark:text-slate-200 dark:hover:bg-white/10'
            }`}
            aria-label="최고관리자 편집 모드"
            title="최고관리자 편집 모드"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 20h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <MenuEditorPanel open={panelOpen} onClose={close} />
        </>
      )}

      <DashboardUserMenu email={email} role={role} onLogout={onLogout} />
    </div>
  )
}

