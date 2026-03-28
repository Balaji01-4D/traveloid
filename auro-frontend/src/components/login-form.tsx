import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  error,
  loading,
  ...props
}: React.ComponentProps<"form"> & { error?: string | null; loading?: boolean }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Enter your email below to login to your account
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
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          </div>
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
          <Button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </Field>
        
        <FieldDescription className="text-center mt-4">
          Don&apos;t have an account?{" "}
          <a href="/register" className="underline underline-offset-4">
            Sign up
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  )
}
