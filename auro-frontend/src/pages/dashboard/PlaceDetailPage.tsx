import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, ArrowLeft, Gauge } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  const heatmapOption = useMemo(() => {
    const heatmap = heatmapQuery.data?.heatmap ?? []
    const matrix: Array<[number, number, number]> = []
    let max = 0

    heatmap.forEach((row, day) => {
      row.forEach((value, hour) => {
        const safeValue = value ?? 0
        matrix.push([hour, day, safeValue])
        if (safeValue > max) {
          max = safeValue
        }
      })
    })

    return {
      tooltip: {
        position: 'top',
        formatter: (params: { data: [number, number, number] }) => {
          const [hour, day, count] = params.data
          return `${DAYS[day]} ${hour}:00<br/>Avg crowd: ${count.toFixed(1)}`
        },
      },
      grid: {
        left: 70,
        right: 40,
        top: 30,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: 24 }, (_, index) => String(index)),
      },
      yAxis: {
        type: 'category',
        data: DAYS,
      },
      visualMap: {
        min: 0,
        max: max || 10,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center' as const,
        bottom: 0,
      },
      series: [
        {
          name: 'Avg crowd',
          type: 'heatmap',
          data: matrix,
          emphasis: {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1,
            },
          },
        },
      ],
    }
  }, [heatmapQuery.data?.heatmap])

  const peaksData = useMemo(() => {
    return [
      {
        label: 'Busiest hour',
        value: peaksQuery.data?.busiest_hour?.avg_count ?? 0,
      },
      {
        label: 'Least crowded',
        value: peaksQuery.data?.least_crowded_time?.avg_count ?? 0,
      },
    ]
  }, [peaksQuery.data?.busiest_hour, peaksQuery.data?.least_crowded_time])

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
            {(currentQuery.data?.latest_actual?.percent_capacity ?? 0).toFixed(1)}% of configured capacity.
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
              <ReactECharts option={heatmapOption} style={{ height: '420px', width: '100%' }} />
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
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={peaksData} margin={{ left: 0, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => {
                        if (typeof value !== 'number') {
                          return ['-', 'Avg crowd']
                        }
                        return [value.toFixed(1), 'Avg crowd']
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-sm text-muted-foreground">
                  Busiest hour: {peaksQuery.data?.busiest_hour ? `${peaksQuery.data.busiest_hour.hour}:00` : '-'} | Least crowded: {peaksQuery.data?.least_crowded_time ? `${DAYS[peaksQuery.data.least_crowded_time.day_of_week]} ${peaksQuery.data.least_crowded_time.hour}:00` : '-'}
                </div>
              </div>
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
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={shortTermData} margin={{ left: 0, right: 8, top: 4 }}>
                  <XAxis dataKey="timestamp" tickFormatter={(value) => formatFullDateTime(value)} minTickGap={24} />
                  <YAxis hide />
                  <Tooltip labelFormatter={(value) => formatFullDateTime(value)} />
                  <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
