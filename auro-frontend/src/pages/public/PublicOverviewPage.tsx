import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import {
  getPublicPlaceCurrent,
  getPublicPlaceForecastAlerts,
  getPublicPlaceTimeSeries,
  getPublicPlaces,
  type Place,
} from '@/lib/api'
import { formatISTDateTime, formatISTTime } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

function formatChartHour(value: string) {
  return formatISTTime(value)
}

function formatRelative(ts: string) {
  return formatISTDateTime(ts)
}

export default function PublicOverviewPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const parsedOrgId = orgId ? parseInt(orgId, 10) : 0
  
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)

  const placesQuery = useQuery({
    queryKey: ['public-places', parsedOrgId],
    queryFn: () => getPublicPlaces(parsedOrgId),
    enabled: !!parsedOrgId,
  })

  const places = placesQuery.data?.places ?? []

  useEffect(() => {
    if (!selectedPlaceId && places.length > 0) {
      setSelectedPlaceId(places[0].id)
    }
  }, [places, selectedPlaceId])

  const selectedPlace = useMemo(
    () => places.find((place: Place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  )

  const currentQuery = useQuery({
    queryKey: ['public-place-current', parsedOrgId, selectedPlaceId],
    queryFn: () => getPublicPlaceCurrent(parsedOrgId, selectedPlaceId as number),
    enabled: !!parsedOrgId && selectedPlaceId !== null,
    refetchInterval: 60_000,
  })

  const alertsQuery = useQuery({
    queryKey: ['public-place-alerts', parsedOrgId, selectedPlaceId],
    queryFn: () => getPublicPlaceForecastAlerts(parsedOrgId, selectedPlaceId as number),
    enabled: !!parsedOrgId && selectedPlaceId !== null,
    refetchInterval: 60_000,
  })

  const timeseriesQuery = useQuery({
    queryKey: ['public-place-timeseries', parsedOrgId, selectedPlaceId, 'overview'],
    queryFn: () => {
      const end = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return getPublicPlaceTimeSeries(parsedOrgId, selectedPlaceId as number, start, end)
    },
    enabled: !!parsedOrgId && selectedPlaceId !== null,
  })

  const chartData = useMemo(() => {
    return (timeseriesQuery.data?.timeseries ?? []).map((point: any) => ({
      timestamp: point.timestamp,
      actual: point.actual,
      predicted: point.predicted,
    }))
  }, [timeseriesQuery.data?.timeseries])

  const loadingPrimary = placesQuery.isLoading || currentQuery.isLoading || alertsQuery.isLoading

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      <nav className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-24 border-b">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-foreground" />
          <span className="text-xl font-bold tracking-tight">Aura Dashboard</span>
        </div>
        <Link
          to="/"
          className="group flex items-center gap-2 text-sm font-medium transition-colors hover:text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Organizations
        </Link>
      </nav>

      <main className="px-6 py-12 md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl space-y-16">
          <header className="space-y-6">
            <h1 className="text-4xl font-medium tracking-tight md:text-5xl">Live Overview.</h1>
            <p className="max-w-xl text-lg text-muted-foreground md:text-xl">
              Real-time synchronization and proactive alerts across all connected public areas.
            </p>
          </header>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground border-b pb-4">
              Select Venue
            </h2>
            <div className="flex flex-wrap gap-3">
              {placesQuery.isLoading ? (
                <Skeleton className="h-10 w-32 rounded-full" />
              ) : places.length === 0 ? (
                 <span className="text-muted-foreground">No places configured.</span>
              ) : places.map((place: Place) => (
                <button
                  key={place.id}
                  onClick={() => setSelectedPlaceId(place.id)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                    selectedPlaceId === place.id
                      ? 'bg-foreground text-background shadow-md'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {place.name}
                </button>
              ))}
            </div>
          </section>

          {selectedPlace && (
            <div className="grid gap-12 lg:grid-cols-3">
              {/* Primary Stats Column */}
              <div className="flex flex-col gap-10 lg:col-span-1">
                <div className="space-y-2 border-t pt-6">
                  <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Current Occupancy</h3>
                  <div className="text-5xl font-light tracking-tighter">
                    {loadingPrimary ? '--' : (currentQuery.data?.latest_actual?.count ?? '--')}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {loadingPrimary
                      ? 'Loading latest occupancy...'
                      : currentQuery.data?.latest_actual
                        ? `${(currentQuery.data.latest_actual.percent_capacity ?? 0).toFixed(1)}% of max capacity`
                        : 'No recent live occupancy sample.'}
                  </p>
                </div>

                <div className="space-y-2 border-t pt-6">
                  <h3 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">7-Day Alert Risk</h3>
                  <div className="text-5xl font-light tracking-tighter">
                     {loadingPrimary ? '--' : alertsQuery.data?.overload_count ?? 0}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {loadingPrimary ? 'Checking overload windows...' : 'Upcoming forecasted overloads.'}
                  </p>
                </div>

                <div className="pt-6">
                  <Link
                    to={`/org/${parsedOrgId}/places/${selectedPlace.id}`}
                    className="group inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
                  >
                    Open Deep Analysis Report
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* Chart & Alerts Column */}
              <div className="flex flex-col gap-10 lg:col-span-2">
                <div className="space-y-6 border-t pt-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-medium tracking-tight">24H Timeline Flow</h3>
                    <p className="text-sm text-muted-foreground">Actual vs. Predicted live attendance bridging past and future.</p>
                  </div>
                  
                  {timeseriesQuery.isLoading ? (
                    <Skeleton className="h-[280px] w-full" />
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatChartHour}
                            tick={{ fontSize: 12 }}
                            minTickGap={28}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }} 
                            axisLine={false} 
                            tickLine={false}
                            dx={-10}
                          />
                          <Tooltip
                            labelFormatter={(value) => formatRelative(value)}
                            formatter={(value, name) => [value ?? '-', name === 'actual' ? 'Actual' : 'Predicted']}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="actual"
                            stroke="hsl(var(--foreground))"
                            strokeWidth={2.5}
                            dot={false}
                            connectNulls
                          />
                          <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="space-y-6 border-t pt-6">
                  <div className="space-y-1">
                    <h3 className="text-xl font-medium tracking-tight">Warning Feed</h3>
                    <p className="text-sm text-muted-foreground">Highest upcoming predicted risks.</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {alertsQuery.isLoading ? (
                      Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                    ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
                      <div className="col-span-full py-8 text-sm text-muted-foreground">
                        No critical thresholds approached in the next 7 days.
                      </div>
                    ) : (
                      alertsQuery.data?.alerts.slice(0, 4).map((alert: any) => (
                        <div key={alert.timestamp} className="rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/40">
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <Badge variant="destructive" className="gap-1 rounded-sm shadow-none">
                              <AlertTriangle className="h-3 w-3" />
                              +{alert.overload_by} Over
                            </Badge>
                          </div>
                          <span className="mb-1 block text-sm font-semibold">{formatRelative(alert.timestamp)}</span>
                          <p className="text-xs text-muted-foreground">
                            Predicted {alert.predicted_count} • Cap {alert.capacity}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
