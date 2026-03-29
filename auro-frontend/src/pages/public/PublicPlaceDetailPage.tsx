import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Gauge, Activity } from 'lucide-react'

import {
  getPublicPlaceCrowdHeatmap,
  getPublicPlaceCrowdPeaks,
  getPublicPlaceCurrent,
  getPublicPlaceForecast,
  getPublicPlaceForecastAlerts,
  getPublicPlaceForecastNext,
  getPublicPlaces,
} from '@/lib/api'
import { formatISTDateTime } from '@/lib/time'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import PublicActualVsPredictedPanel from '@/components/public-dashboard/PublicActualVsPredictedPanel'
import PublicForecastDistributionPanel from '@/components/public-dashboard/PublicForecastDistributionPanel'
import PublicCapacityUtilizationPanel from '@/components/public-dashboard/PublicCapacityUtilizationPanel'
import PublicCrowdHeatmapPanel from '@/components/public-dashboard/PublicCrowdHeatmapPanel'
import PublicPeakHoursPanel from '@/components/public-dashboard/PublicPeakHoursPanel'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function formatFullDateTime(value: string | number | Date) {
  return formatISTDateTime(value)
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t pt-8">
      <div>
        <h3 className="text-xl font-medium tracking-tight">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  )
}

export default function PublicPlaceDetailPage() {
  const { orgId, placeId } = useParams()
  const parsedOrgId = orgId ? Number(orgId) : 0
  const parsedPlaceId = placeId ? Number(placeId) : 0
  
  const placesQuery = useQuery({
    queryKey: ['public-places', parsedOrgId],
    queryFn: () => getPublicPlaces(parsedOrgId),
    enabled: !!parsedOrgId,
  })

  const place = useMemo(
    () => placesQuery.data?.places.find((candidate) => candidate.id === parsedPlaceId) ?? null,
    [placesQuery.data?.places, parsedPlaceId],
  )

  const currentQuery = useQuery({
    queryKey: ['public-place-current', parsedOrgId, parsedPlaceId],
    queryFn: () => getPublicPlaceCurrent(parsedOrgId, parsedPlaceId),
    enabled: !!parsedOrgId && !!parsedPlaceId,
    refetchInterval: 60_000,
  })

  const forecastNextQuery = useQuery({
    queryKey: ['public-place-forecast-next', parsedOrgId, parsedPlaceId, 24],
    queryFn: () => getPublicPlaceForecastNext(parsedOrgId, parsedPlaceId, 24),
    enabled: !!parsedOrgId && !!parsedPlaceId,
  })

  const forecast7dQuery = useQuery({
    queryKey: ['public-place-forecast', parsedOrgId, parsedPlaceId],
    queryFn: () => getPublicPlaceForecast(parsedOrgId, parsedPlaceId),
    enabled: !!parsedOrgId && !!parsedPlaceId,
  })

  const heatmapQuery = useQuery({
    queryKey: ['public-place-heatmap', parsedOrgId, parsedPlaceId],
    queryFn: () => getPublicPlaceCrowdHeatmap(parsedOrgId, parsedPlaceId, '30d'),
    enabled: !!parsedOrgId && !!parsedPlaceId,
  })

  const peaksQuery = useQuery({
    queryKey: ['public-place-peaks', parsedOrgId, parsedPlaceId],
    queryFn: () => getPublicPlaceCrowdPeaks(parsedOrgId, parsedPlaceId, '7d'),
    enabled: !!parsedOrgId && !!parsedPlaceId,
  })

  const alertsQuery = useQuery({
    queryKey: ['public-place-alerts', parsedOrgId, parsedPlaceId],
    queryFn: () => getPublicPlaceForecastAlerts(parsedOrgId, parsedPlaceId),
    enabled: !!parsedOrgId && !!parsedPlaceId,
  })

  const shortTermData = useMemo(() => {
    return (forecastNextQuery.data?.forecast ?? []).map((point: any) => ({
      timestamp: point.timestamp,
      predicted: point.count,
    }))
  }, [forecastNextQuery.data?.forecast])

  if (!parsedPlaceId || !parsedOrgId) {
    return <div className="p-8 text-sm text-destructive">Invalid place identifier.</div>
  }

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary selection:text-primary-foreground">
      <nav className="flex h-20 items-center justify-between px-6 md:px-12 lg:px-24 border-b">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 rounded bg-foreground" />
          <span className="text-xl font-bold tracking-tight">Aura Dashboard</span>
        </div>
        <Link
          to={`/org/${parsedOrgId}`}
          className="group flex items-center gap-2 text-sm font-medium transition-colors hover:text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Back to Overview
        </Link>
      </nav>

      <main className="px-6 py-12 md:px-12 lg:px-24">
        <div className="mx-auto max-w-5xl space-y-16">
          <header className="flex flex-wrap items-end justify-between gap-6 pb-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-medium tracking-tight md:text-5xl">{place?.name ?? 'Loading Venue...'}</h1>
              <p className="text-lg text-muted-foreground">Comprehensive capacity and forecasting analysis.</p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Live Occupancy</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-light">
                  {currentQuery.isLoading ? '--' : (currentQuery.data?.latest_actual?.count ?? '--')}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {currentQuery.data?.capacity ?? place?.capacity ?? '-'} cap
                </span>
              </div>
            </div>
          </header>

          <div className="space-y-16">
            <Section title="Actual vs Predicted" description="Primary model behavior chart with 24h short-term trends.">
              <PublicActualVsPredictedPanel
                orgId={parsedOrgId}
                placeId={parsedPlaceId}
                capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
                active={true}
              />
            </Section>

            <Section title="Crowd Heatmap" description="Pattern insight by day-of-week and hour over the last 30 days.">
              {heatmapQuery.isLoading ? (
                <Skeleton className="h-[420px] w-full" />
              ) : (
                <PublicCrowdHeatmapPanel heatmap={heatmapQuery.data?.heatmap ?? []} />
              )}
            </Section>

            <Section title="Forecast Distribution" description="Predicted upcoming demand with safety zones and confidence bands.">
              <PublicForecastDistributionPanel
                orgId={parsedOrgId}
                placeId={parsedPlaceId}
                capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
                active={true}
              />
            </Section>

            <Section title="Capacity Utilization" description="Forecasted 7-day outlook expressed as percentage of max capacity.">
               {forecast7dQuery.isLoading ? (
                <Skeleton className="h-[340px] w-full" />
              ) : (
                <PublicCapacityUtilizationPanel
                  forecast={forecast7dQuery.data?.forecast ?? []}
                  capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
                />
              )}
            </Section>

            <Section title="Peak Hours Overview" description="Granular breakdown of the busiest and least crowded periods.">
              {peaksQuery.isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (peaksQuery.data?.hourly_profile.length ?? 0) === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">No peak-hours data available for this place yet.</p>
                </div>
              ) : (
                <PublicPeakHoursPanel
                  data={peaksQuery.data}
                  capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
                />
              )}
            </Section>

            <Section title="Alerts & Overloads" description="Automatically flagged windows where demand exceeds capacity.">
               {alertsQuery.isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
                <div className="rounded border border-dashed p-8 text-center text-muted-foreground">
                  No projected overload alerts for the upcoming 7 days.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {alertsQuery.data?.alerts.map((alert: any) => (
                    <div key={alert.timestamp} className="rounded-md border p-4 transition-colors hover:bg-muted/50">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Badge variant="destructive" className="gap-1 rounded">
                          <AlertTriangle className="h-3 w-3" />
                          +{alert.overload_by} Over capacity
                        </Badge>
                      </div>
                      <span className="mb-2 block text-sm font-medium">{formatFullDateTime(alert.timestamp)}</span>
                      <p className="text-xs text-muted-foreground">
                        Predicted {alert.predicted_count} / Capacity {alert.capacity}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </main>
    </div>
  )
}
