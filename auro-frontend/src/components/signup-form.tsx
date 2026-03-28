import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function SignupForm({
  className,
  error,
  loading,
  orgName,
  ...props
}: React.ComponentProps<"form"> & { error?: string | null; loading?: boolean; orgName?: string }) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create Admin Account</h1>
          <p className="text-sm text-balance text-muted-foreground">
            Step 2: Set up the admin for {orgName ? <span className="font-semibold text-foreground">{orgName}</span> : "your organisation"}
          </p>
        </div>
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md text-center">
            {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="first-name">First Name</FieldLabel>
            <Input id="first-name" name="first-name" type="text" placeholder="John" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="last-name">Last Name</FieldLabel>
            <Input id="last-name" name="last-name" type="text" placeholder="Doe" required />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input id="password" name="password" type="password" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          <Input id="confirm-password" name="confirm-password" type="password" required />
        </Field>
        <Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Complete Setup"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
