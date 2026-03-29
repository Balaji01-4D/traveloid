import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Users } from 'lucide-react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import {
  getPlaceCurrent,
  getPlaceForecastAlerts,
  getPlaceTimeSeries,
  getPlaces,
  type Place,
} from '@/lib/api'
import { formatISTDateTime, formatISTTime } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function formatChartHour(value: string) {
  return formatISTTime(value)
}

function formatRelative(ts: string) {
  return formatISTDateTime(ts)
}

export default function OverviewPage() {
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null)

  const placesQuery = useQuery({
    queryKey: ['places'],
    queryFn: getPlaces,
  })

  const places = placesQuery.data?.places ?? []

  useEffect(() => {
    if (!selectedPlaceId && places.length > 0) {
      setSelectedPlaceId(places[0].id)
    }
  }, [places, selectedPlaceId])

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  )

  const currentQuery = useQuery({
    queryKey: ['place-current', selectedPlaceId],
    queryFn: () => getPlaceCurrent(selectedPlaceId as number),
    enabled: selectedPlaceId !== null,
    refetchInterval: 60_000,
  })

  const alertsQuery = useQuery({
    queryKey: ['place-alerts', selectedPlaceId],
    queryFn: () => getPlaceForecastAlerts(selectedPlaceId as number),
    enabled: selectedPlaceId !== null,
    refetchInterval: 60_000,
  })

  const timeseriesQuery = useQuery({
    queryKey: ['place-timeseries', selectedPlaceId, 'overview'],
    queryFn: () => {
      const end = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const start = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return getPlaceTimeSeries(selectedPlaceId as number, start, end)
    },
    enabled: selectedPlaceId !== null,
  })

  const chartData = useMemo(() => {
    return (timeseriesQuery.data?.timeseries ?? []).map((point) => ({
      timestamp: point.timestamp,
      actual: point.actual,
      predicted: point.predicted,
    }))
  }, [timeseriesQuery.data?.timeseries])

  const loadingPrimary = placesQuery.isLoading || currentQuery.isLoading || alertsQuery.isLoading

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Live Crowd Overview</h1>
          <p className="text-muted-foreground">Monitor current occupancy, forecast pressure, and drill into each place.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {places.map((place: Place) => (
            <Button
              key={place.id}
              size="sm"
              variant={selectedPlaceId === place.id ? 'default' : 'outline'}
              onClick={() => setSelectedPlaceId(place.id)}
            >
              {place.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Places tracked</CardDescription>
            <CardTitle className="text-3xl">{places.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Organisation-wide active places.</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current crowd</CardDescription>
            <CardTitle className="text-3xl">
              {loadingPrimary ? '--' : (currentQuery.data?.latest_actual?.count ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {loadingPrimary
              ? 'Loading latest occupancy...'
              : `${(currentQuery.data?.latest_actual?.percent_capacity ?? 0).toFixed(1)}% of capacity`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Forecast alerts (7 days)</CardDescription>
            <CardTitle className="text-3xl">{loadingPrimary ? '--' : alertsQuery.data?.overload_count ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {loadingPrimary ? 'Checking overload windows...' : 'Predicted windows above configured place capacity.'}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{selectedPlace ? `${selectedPlace.name}: Actual vs Predicted` : 'Actual vs Predicted'}</CardTitle>
            <CardDescription>Last 24h + next 24h merged timeline.</CardDescription>
          </CardHeader>
          <CardContent>
            {timeseriesQuery.isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ left: 0, right: 8, top: 4 }}>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatChartHour}
                    tick={{ fontSize: 12 }}
                    minTickGap={28}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(value) => formatRelative(value)}
                    formatter={(value, name) => [value ?? '-', name === 'actual' ? 'Actual' : 'Predicted']}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 4"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Upcoming overload windows for selected place.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsQuery.isLoading ? (
              <>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </>
            ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No overload risk in next 7 days.
              </div>
            ) : (
              alertsQuery.data?.alerts.slice(0, 4).map((alert) => (
                <div key={alert.timestamp} className="rounded-lg border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      +{alert.overload_by}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelative(alert.timestamp)}</span>
                  </div>
                  <p className="text-sm">Predicted {alert.predicted_count} / Capacity {alert.capacity}</p>
                </div>
              ))
            )}

            {selectedPlace && (
              <Button asChild className="w-full" variant="outline">
                <Link to={`/dashboard/places/${selectedPlace.id}`}>
                  Open Place Details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
