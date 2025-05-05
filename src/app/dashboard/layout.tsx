'use client'

import Layout from '@/components/Layout'
import { useAuth } from '@/lib/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login')
    }
  }, [loading, session, router])

  if (loading || !session) {
    return null // ou um spinner de loading
  }

  return <Layout>{children}</Layout>
}
