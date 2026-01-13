"use client"

import React from 'react'
import useAppSession from '../../lib/authSession'

export default function SuperAdminOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAppSession()
  if (session?.role !== 'SUPER') return null
  return <>{children}</>
}

