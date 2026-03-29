import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'

import { getPublicOrganisations, type Organisation } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

export default function OrganisationsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-organisations'],
    queryFn: getPublicOrganisations,
  })

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Navbar Minimal */}
      <nav className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-24">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-foreground" />
          <span className="text-xl font-bold tracking-tight">Aura</span>
        </div>
        <Link
          to="/login"
          className="group flex items-center gap-2 text-sm font-medium transition-colors hover:text-muted-foreground"
        >
          Administrator Log in
          <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>

      {/* Hero */}
      <main className="px-6 pb-24 pt-16 md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl space-y-24">
          <section className="space-y-6">
            <h1 className="max-w-3xl text-5xl font-medium tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl">
              Public crowd transparency.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
              Monitor live capacity, forecasting boundaries, and venue utilization across verified public spaces.
            </p>
          </section>

          {/* Org List */}
          <section className="space-y-12">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Available Networks
              </h2>
            </div>

            <div className="grid gap-x-12 gap-y-16 sm:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-0.5 w-12" />
                  </div>
                ))
              ) : data?.organisations?.length === 0 ? (
                <div className="col-span-full py-12 text-muted-foreground">
                  No public networks are accessible at this moment.
                </div>
              ) : (
                data?.organisations?.map((org: Organisation) => (
                  <Link
                    key={org.id}
                    to={`/org/${org.id}`}
                    className="group block space-y-4 outline-none"
                  >
                    <div className="space-y-2">
                      <h3 className="text-2xl font-medium tracking-tight transition-colors group-hover:text-primary md:text-3xl">
                        {org.name}
                      </h3>
                      <p className="text-muted-foreground transition-colors group-hover:text-foreground">
                        Public viewing dashboards & capacity analytics
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Explore Dashboard <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
