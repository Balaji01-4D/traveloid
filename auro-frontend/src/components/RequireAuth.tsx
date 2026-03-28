import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser } from '@/lib/api'

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export default function RequireAuth() {
  const location = useLocation()
  const [status, setStatus] = useState<AuthStatus>('checking')

  useEffect(() => {
    let mounted = true

    async function validateSession() {
      try {
        await getCurrentUser()
        if (mounted) {
          setStatus('authenticated')
        }
      } catch {
        if (mounted) {
          setStatus('unauthenticated')
        }
      }
    }

    validateSession()

    return () => {
      mounted = false
    }
  }, [])

  if (status === 'checking') {
    return <div className="p-6 text-sm text-muted-foreground">Checking session...</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
