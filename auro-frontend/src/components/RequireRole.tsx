import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getCurrentUser } from '@/lib/api'

type RoleGuardStatus = 'checking' | 'allowed' | 'forbidden' | 'unauthenticated'

export default function RequireRole({ allowedRoles }: { allowedRoles: string[] }) {
  const location = useLocation()
  const [status, setStatus] = useState<RoleGuardStatus>('checking')

  useEffect(() => {
    let mounted = true

    async function validateRole() {
      try {
        const user = await getCurrentUser()

        if (!mounted) {
          return
        }

        if (allowedRoles.includes(user.role)) {
          setStatus('allowed')
          return
        }

        setStatus('forbidden')
      } catch {
        if (mounted) {
          setStatus('unauthenticated')
        }
      }
    }

    validateRole()

    return () => {
      mounted = false
    }
  }, [allowedRoles])

  if (status === 'checking') {
    return <div className="p-6 text-sm text-muted-foreground">Checking access...</div>
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'forbidden') {
    return <Navigate to="/dashboard/places" replace />
  }

  return <Outlet />
}
