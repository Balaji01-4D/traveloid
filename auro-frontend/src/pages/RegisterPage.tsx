import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { registerOrganisation, checkOrganisationName } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgName.trim()) {
      setNameError(null)
      setIsChecking(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsChecking(true)
      try {
        const { exists } = await checkOrganisationName(orgName.trim())
        if (exists) {
          setNameError('This organisation name is already taken.')
        } else {
          setNameError(null)
        }
      } catch (err) {
        setNameError('Could not verify organisation name.')
      } finally {
        setIsChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [orgName])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (nameError || isChecking || !orgName.trim()) return
    
    setError(null)
    setLoading(true)

    try {
      const { org } = await registerOrganisation(orgName.trim())
      navigate('/register/admin', { state: { orgId: org.id, orgName: orgName.trim() } })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string, message?: string } } }
      setError(
        axiosErr?.response?.data?.error ?? axiosErr?.response?.data?.message ??
          'Failed to create organisation. Please try again.',
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
            Step 1: Get started by setting up your organisation.
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
          <FieldLabel htmlFor="org-name">Organisation Name</FieldLabel>
          <Input
            id="org-name"
            name="org-name"
            type="text"
            placeholder="e.g. Acme Corp"
            required
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          {nameError ? (
            <div className="text-[0.8rem] text-destructive">{nameError}</div>
          ) : isChecking ? (
            <div className="text-[0.8rem] text-muted-foreground">Checking availability...</div>
          ) : orgName && !nameError && !isChecking ? (
            <div className="text-[0.8rem] text-green-600">This name is available!</div>
          ) : (
            <div className="text-[0.8rem] text-muted-foreground">
              This is the name of your company or workspace.
            </div>
          )}
        </Field>
        
        <Field>
          <Button type="submit" disabled={loading || isChecking || !!nameError || !orgName.trim()}>
            {loading ? "Creating..." : "Create Organization"}
          </Button>
        </Field>
        
        <div className="text-[0.8rem] text-muted-foreground text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="underline underline-offset-4">
            Sign in
          </a>
        </div>
      </FieldGroup>
    </form>
  )
}
