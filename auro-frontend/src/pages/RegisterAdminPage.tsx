import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { registerAdmin } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function RegisterAdminPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { orgId?: string; orgName?: string } | null
  
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (!state?.orgId) {
    return <Navigate to="/register" replace />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      await registerAdmin({
        organisation_id: parseInt(state!.orgId!, 10),
        name,
        email,
        password,
      })
      navigate('/login', { state: { message: 'Organization and Admin registered successfully. Please login.' } })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string, message?: string } } }
      setError(
        axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ??
          'Failed to register admin. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center mb-4">
          <h1 className="text-2xl font-bold">New Organization Onboarding</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Step 2: Create the first admin for <strong className="text-foreground">{state.orgName || 'your organization'}</strong>
          </p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" type="text" placeholder="John" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input id="password" name="password" type={showPassword ? 'text' : 'password'} required className="pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Complete Setup"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
