import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '@/lib/api'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      await login({ email, password })
      navigate('/dashboard')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setError(
        axiosErr?.response?.data?.message ?? 'Invalid email or password. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return <LoginForm onSubmit={handleSubmit} error={error} loading={loading} />
}
