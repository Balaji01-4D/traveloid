import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import api, { getCurrentUser } from '@/lib/api'
import { toast } from 'sonner'

export default function InviteMemberPage() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // To avoid adding Redux immediately, we will fetch user manually on mount for the organisation ID.
  const [orgId, setOrgId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchMe() {
      try {
        const meData = await getCurrentUser()
        setOrgId(meData.organisation_id)
      } catch (err) {
        console.error("Could not fetch user organisation ID", err)
      }
    }
    fetchMe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    if (!orgId) {
      toast.error("Failed to resolve your organisation. Please try logging in again.")
      setLoading(false)
      return
    }

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      await api.post('/organisation/member', {
        organisation_id: orgId,
        name,
        email,
        password,
      })
      toast.success(`Member ${email} has been correctly invited!`)
      form.reset()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string, message?: string } } }
      const errorMessage = axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ?? 'Failed to invite member. Please try again.'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-col gap-6 p-8 max-w-2xl mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Invite Member</h1>
        <p className="text-muted-foreground">
          Add a new member to your organisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" name="name" type="text" placeholder="John" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Temporary Password</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Let them change it later"
                className="pr-10"
              />
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
          <div className="mt-4">
            <Button type="submit" disabled={loading || !orgId}>
              {loading ? "Inviting..." : "Send Invite"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
