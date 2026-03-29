import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Gauge } from 'lucide-react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  getPlaceCrowdHeatmap,
  getPlaceCrowdPeaks,
  getPlaceCurrent,
  getPlaceForecast,
  getPlaceForecastAlerts,
  getPlaceForecastNext,
  bootstrapPlaceData,
  getPlaces,
} from '@/lib/api'
import { formatISTDateTime } from '@/lib/time'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import ActualVsPredictedPanel from '@/components/dashboard/ActualVsPredictedPanel'
import ForecastDistributionPanel from '@/components/dashboard/ForecastDistributionPanel'
import CapacityUtilizationPanel from '@/components/dashboard/CapacityUtilizationPanel'
import CrowdHeatmapPanel from '@/components/dashboard/CrowdHeatmapPanel'
import PeakHoursPanel from '@/components/dashboard/PeakHoursPanel'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

const ANALYSIS_OPTIONS = {
  actual_predicted: {
    title: 'Actual vs Predicted',
    description: 'Primary model behavior chart with confidence bounds.',
  },
  heatmap: {
    title: 'Crowd Heatmap',
    description: 'Pattern insight by day-of-week and hour.',
  },
  forecast_area: {
    title: 'Forecast Distribution',
    description: 'Predicted demand with risk zones and confidence bands.',
  },
  capacity_utilization: {
    title: 'Capacity Utilization %',
    description: 'Forecast translated into percentage of capacity.',
  },
  peaks: {
    title: 'Peak Hours',
    description: 'Quick busiest vs least-crowded decision chart.',
  },
  alerts: {
    title: 'Alerts Timeline',
    description: 'Overload windows for action planning.',
  },
  short_term: {
    title: 'Short-Term Trend (24h)',
    description: 'Compact future sparkline for fast glance decisions.',
  },
} as const

type AnalysisKey = keyof typeof ANALYSIS_OPTIONS
function formatFullDateTime(value: string | number | Date) {
  return formatISTDateTime(value)
}

export default function PlaceDetailPage() {
  const params = useParams()
  const placeId = Number(params.placeId)
  const [analysis, setAnalysis] = useState<AnalysisKey>('actual_predicted')
  const queryClient = useQueryClient()

  const placesQuery = useQuery({
    queryKey: ['places'],
    queryFn: getPlaces,
  })

  const place = useMemo(
    () => placesQuery.data?.places.find((candidate) => candidate.id === placeId) ?? null,
    [placesQuery.data?.places, placeId],
  )

  const currentQuery = useQuery({
    queryKey: ['place-current', placeId],
    queryFn: () => getPlaceCurrent(placeId),
    enabled: Number.isFinite(placeId),
    refetchInterval: 60_000,
  })

  const forecastNextQuery = useQuery({
    queryKey: ['place-forecast-next', placeId, 24],
    queryFn: () => getPlaceForecastNext(placeId, 24),
    enabled: Number.isFinite(placeId) && analysis === 'short_term',
  })

  const forecast7dQuery = useQuery({
    queryKey: ['place-forecast', placeId],
    queryFn: () => getPlaceForecast(placeId),
    enabled: Number.isFinite(placeId) && analysis === 'capacity_utilization',
  })

  const heatmapQuery = useQuery({
    queryKey: ['place-heatmap', placeId],
    queryFn: () => getPlaceCrowdHeatmap(placeId, '30d'),
    enabled: Number.isFinite(placeId) && analysis === 'heatmap',
  })

  const peaksQuery = useQuery({
    queryKey: ['place-peaks', placeId],
    queryFn: () => getPlaceCrowdPeaks(placeId, '7d'),
    enabled: Number.isFinite(placeId) && analysis === 'peaks',
  })

  const alertsQuery = useQuery({
    queryKey: ['place-alerts', placeId],
    queryFn: () => getPlaceForecastAlerts(placeId),
    enabled: Number.isFinite(placeId) && analysis === 'alerts',
  })

  const bootstrapMutation = useMutation({
    mutationFn: () => bootstrapPlaceData(placeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['place-current', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-peaks', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-heatmap', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-alerts', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-forecast', placeId] }),
        queryClient.invalidateQueries({ queryKey: ['place-forecast-next', placeId, 24] }),
      ])
    },
  })

  const shortTermData = useMemo(() => {
    return (forecastNextQuery.data?.forecast ?? []).map((point) => ({
      timestamp: point.timestamp,
      predicted: point.count,
    }))
  }, [forecastNextQuery.data?.forecast])

  if (!Number.isFinite(placeId)) {
    return <div className="p-8 text-sm text-destructive">Invalid place identifier.</div>
  }

  const analysisMeta = ANALYSIS_OPTIONS[analysis]

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-2">
            <Link to="/dashboard/overview">
              <ArrowLeft className="h-4 w-4" />
              Back to overview
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{place?.name ?? 'Place Detail'}</h1>
          <p className="text-muted-foreground">Select one analysis at a time for on-demand loading and faster UX.</p>
        </div>
        <Badge variant="outline">Capacity {currentQuery.data?.capacity ?? place?.capacity ?? '-'}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current occupancy</CardDescription>
            <CardTitle className="text-3xl">{currentQuery.data?.latest_actual?.count ?? '--'}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {currentQuery.data?.latest_actual
              ? `${(currentQuery.data.latest_actual.percent_capacity ?? 0).toFixed(1)}% of configured capacity.`
              : 'No recent live occupancy sample.'}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription>Analysis View</CardDescription>
            <CardTitle className="text-base">{analysisMeta.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={analysis} onValueChange={(value) => setAnalysis(value as AnalysisKey)}>
              <SelectTrigger className="w-full max-w-96">
                <SelectValue placeholder="Select analysis" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Core</SelectLabel>
                  <SelectItem value="actual_predicted">Actual vs Predicted</SelectItem>
                  <SelectItem value="forecast_area">Forecast Distribution</SelectItem>
                  <SelectItem value="capacity_utilization">Capacity Utilization %</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Behavior</SelectLabel>
                  <SelectItem value="heatmap">Crowd Heatmap</SelectItem>
                  <SelectItem value="peaks">Peak Hours</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Action</SelectLabel>
                  <SelectItem value="alerts">Alerts Timeline</SelectItem>
                  <SelectItem value="short_term">Short-Term Trend (24h)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{analysisMeta.description}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{analysisMeta.title}</CardTitle>
          <CardDescription>{analysisMeta.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis === 'actual_predicted' && (
            <ActualVsPredictedPanel
              placeId={placeId}
              capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
              active={analysis === 'actual_predicted'}
            />
          )}

          {analysis === 'heatmap' && (
            heatmapQuery.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <CrowdHeatmapPanel heatmap={heatmapQuery.data?.heatmap ?? []} />
            )
          )}

          {analysis === 'forecast_area' && (
            <ForecastDistributionPanel
              placeId={placeId}
              capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
              active={analysis === 'forecast_area'}
            />
          )}

          {analysis === 'capacity_utilization' && (
            forecast7dQuery.isLoading ? (
              <Skeleton className="h-[340px] w-full" />
            ) : (
              <CapacityUtilizationPanel
                forecast={forecast7dQuery.data?.forecast ?? []}
                capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
              />
            )
          )}

          {analysis === 'peaks' && (
            peaksQuery.isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (peaksQuery.data?.hourly_profile.length ?? 0) === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No peak-hours data available for this place yet.</p>
                <Button
                  size="sm"
                  onClick={() => bootstrapMutation.mutate()}
                  disabled={bootstrapMutation.isPending}
                >
                  {bootstrapMutation.isPending ? 'Generating data...' : 'Generate sample data'}
                </Button>
                {bootstrapMutation.isError && (
                  <p className="text-sm text-destructive">Failed to generate data. Please try again.</p>
                )}
              </div>
            ) : (
              <PeakHoursPanel
                data={peaksQuery.data}
                capacity={currentQuery.data?.capacity ?? place?.capacity ?? 0}
              />
            )
          )}

          {analysis === 'alerts' && (
            alertsQuery.isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : (alertsQuery.data?.alerts.length ?? 0) === 0 ? (
              <Alert>
                <Gauge className="h-4 w-4" />
                <AlertTitle>No overload alerts</AlertTitle>
                <AlertDescription>No forecasted windows exceed capacity in the next 7 days.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {alertsQuery.data?.alerts.map((alert) => (
                  <div key={alert.timestamp} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        +{alert.overload_by}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatFullDateTime(alert.timestamp)}</span>
                    </div>
                    <p className="text-sm">Predicted {alert.predicted_count} / Capacity {alert.capacity}</p>
                  </div>
                ))}
              </div>
            )
          )}

          {analysis === 'short_term' && (
            forecastNextQuery.isLoading ? (
              <Skeleton className="h-[180px] w-full" />
            ) : (
              <ChartFullscreen title="Short-term trend chart">
                {(isFullscreen) => (
                  <ResponsiveContainer width="100%" height={isFullscreen ? 520 : 180}>
                    <LineChart data={shortTermData} margin={{ left: 0, right: 8, top: 4 }}>
                      <XAxis dataKey="timestamp" tickFormatter={(value) => formatFullDateTime(value)} minTickGap={24} />
                      <YAxis hide />
                      <Tooltip labelFormatter={(value) => formatFullDateTime(value)} />
                      <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartFullscreen>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
