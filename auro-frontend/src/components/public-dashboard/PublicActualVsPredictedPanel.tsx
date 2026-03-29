import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  getPublicPlaceForecastNext,
  getPublicPlaceTimeSeries,
} from '@/lib/api'
import {
  floorToISTIntervalMs,
  formatISTDate,
  formatISTDateTime,
  formatISTDateTimeLocalInput,
  formatISTTime,
  parseISTDateTimeLocal,
} from '@/lib/time'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle } from 'lucide-react'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

type TimeSeriesInterval = 'hour' | 'day'

type RangePreset = '24h' | '3d' | '7d' | '30d' | 'custom'

type TimeRangeSelection = {
  start: Date
  end: Date
  interval: TimeSeriesInterval
  valid: boolean
}

type AlignedTimeRange = {
  start: Date
  end: Date
}

type CoreChartPoint = {
  timeMs: number
  actual: number | null
  predicted: number | null
  upper: number | null
  lower: number | null
}

const RANGE_PRESET_LABELS: Array<{ value: RangePreset; label: string }> = [
  { value: '24h', label: '24H' },
  { value: '3d', label: '3D' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'custom', label: 'Custom' },
]

const MS_IN_HOUR = 60 * 60 * 1000
const MS_IN_DAY = 24 * MS_IN_HOUR

function resolveTimeRange(
  preset: RangePreset,
  customStart: string,
  customEnd: string,
): TimeRangeSelection {
  const now = new Date()

  if (preset === 'custom') {
    const start = parseISTDateTimeLocal(customStart)
    const end = parseISTDateTimeLocal(customEnd)
    const valid = !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start < end
    const duration = end.getTime() - start.getTime()
    const interval: TimeSeriesInterval = duration > 14 * MS_IN_DAY ? 'day' : 'hour'
    return {
      start,
      end,
      interval,
      valid,
    }
  }

  const durationByPreset: Record<Exclude<RangePreset, 'custom'>, number> = {
    '24h': 24 * MS_IN_HOUR,
    '3d': 3 * MS_IN_DAY,
    '7d': 7 * MS_IN_DAY,
    '30d': 30 * MS_IN_DAY,
  }

  const duration = durationByPreset[preset]
  return {
    start: new Date(now.getTime() - duration),
    end: new Date(now.getTime() + duration),
    interval: preset === '30d' ? 'day' : 'hour',
    valid: true,
  }
}

function parseUtcMs(isoTimestamp: string): number {
  return new Date(isoTimestamp).getTime()
}

function formatCoreTick(value: number, interval: TimeSeriesInterval): string {
  if (interval === 'day') {
    return formatISTDate(value)
  }
  return formatISTTime(value)
}

function toAlignedTimeRange(selection: TimeRangeSelection): AlignedTimeRange {
  const intervalMs = selection.interval === 'day' ? MS_IN_DAY : MS_IN_HOUR
  const startMs = floorToISTIntervalMs(selection.start.getTime(), intervalMs)
  const endMs = floorToISTIntervalMs(selection.end.getTime(), intervalMs)
  return {
    start: new Date(startMs),
    end: new Date(endMs),
  }
}

function CoreChartTooltip({
  active,
  label,
  payload,
  capacity,
}: {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown }>
  capacity: number
}) {
  if (!active || label == null) {
    return null
  }

  const actualValue = payload?.find((entry) => entry.dataKey === 'actual')?.value
  const predictedValue = payload?.find((entry) => entry.dataKey === 'predicted')?.value
  const timeLabel: string | number = typeof label === 'number' ? label : label

  return (
    <div className="rounded-md border bg-background p-3 text-xs shadow-md">
      <div className="mb-1 font-medium">Time (IST): {formatISTDateTime(timeLabel)}</div>
      <div>Actual: {typeof actualValue === 'number' ? actualValue : '-'}</div>
      <div>Predicted: {typeof predictedValue === 'number' ? predictedValue : '-'}</div>
      <div>Capacity: {capacity > 0 ? capacity : '-'}</div>
    </div>
  )
}

export default function PublicActualVsPredictedPanel({
  orgId, placeId,
  capacity,
  active,
}: {
  orgId: number
  placeId: number
  capacity: number
  active: boolean
}) {
  const [rangePreset, setRangePreset] = useState<RangePreset>('24h')
  const [customStart, setCustomStart] = useState(() => formatISTDateTimeLocalInput(new Date(Date.now() - 24 * MS_IN_HOUR)))
  const [customEnd, setCustomEnd] = useState(() => formatISTDateTimeLocalInput(new Date(Date.now() + 24 * MS_IN_HOUR)))
  const [showActual, setShowActual] = useState(true)
  const [showPredicted, setShowPredicted] = useState(true)
  const [showConfidence, setShowConfidence] = useState(true)
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null)

  const selectedTimeRange = useMemo(
    () => resolveTimeRange(rangePreset, customStart, customEnd),
    [rangePreset, customStart, customEnd],
  )

  const alignedTimeRange = useMemo(
    () => toAlignedTimeRange(selectedTimeRange),
    [selectedTimeRange],
  )

  const timeRangeStartKey = selectedTimeRange.valid
    ? alignedTimeRange.start.toISOString()
    : 'invalid-start'
  const timeRangeEndKey = selectedTimeRange.valid
    ? alignedTimeRange.end.toISOString()
    : 'invalid-end'

  const timeseriesQuery = useQuery({
    queryKey: [
      'public-place-timeseries',
      orgId, placeId,
      'core',
      timeRangeStartKey,
      timeRangeEndKey,
      selectedTimeRange.interval,
    ],
    queryFn: () => getPublicPlaceTimeSeries(
      orgId, placeId,
      alignedTimeRange.start,
      alignedTimeRange.end,
      selectedTimeRange.interval,
    ),
    enabled: Number.isFinite(placeId) && active && selectedTimeRange.valid,
  })

  const confidenceHours = useMemo(() => {
    if (!selectedTimeRange.valid) {
      return 0
    }

    const nowMs = Date.now()
    const endMs = alignedTimeRange.end.getTime()
    const futureMs = Math.max(0, endMs - nowMs)
    if (futureMs <= 0) {
      return 0
    }

    return Math.min(168, Math.max(1, Math.ceil(futureMs / MS_IN_HOUR)))
  }, [alignedTimeRange.end, selectedTimeRange.valid])

  const forecastConfidenceQuery = useQuery({
    queryKey: ['public-place-forecast-next', orgId, placeId, 'core-confidence', confidenceHours],
    queryFn: () => getPublicPlaceForecastNext(orgId, placeId, confidenceHours),
    enabled: Number.isFinite(placeId) && active && selectedTimeRange.valid && confidenceHours > 0,
  })

  const coreChartData = useMemo<CoreChartPoint[]>(() => {
    if (!selectedTimeRange.valid) {
      return []
    }

    const intervalMs = selectedTimeRange.interval === 'day' ? MS_IN_DAY : MS_IN_HOUR
    const rawSeries = timeseriesQuery.data?.timeseries ?? []

    const byBucket = new Map<number, { actual: number | null; predicted: number | null }>()
    for (const point of rawSeries) {
      const bucketMs = floorToISTIntervalMs(parseUtcMs(point.timestamp), intervalMs)
      byBucket.set(bucketMs, {
        actual: point.actual,
        predicted: point.predicted,
      })
    }

    const confidenceByBucket = new Map<number, { upper: number | null; lower: number | null }>()
    for (const point of forecastConfidenceQuery.data?.forecast ?? []) {
      const bucketMs = floorToISTIntervalMs(parseUtcMs(point.timestamp), intervalMs)
      confidenceByBucket.set(bucketMs, {
        upper: point.upper_bound,
        lower: point.lower_bound,
      })
    }

    const startMs = alignedTimeRange.start.getTime()
    const endMs = alignedTimeRange.end.getTime()

    const rows: CoreChartPoint[] = []
    for (let currentMs = startMs; currentMs <= endMs; currentMs += intervalMs) {
      const value = byBucket.get(currentMs)
      const confidence = confidenceByBucket.get(currentMs)
      rows.push({
        timeMs: currentMs,
        actual: value?.actual ?? null,
        predicted: value?.predicted ?? null,
        upper: confidence?.upper ?? null,
        lower: confidence?.lower ?? null,
      })
    }

    const lastActualIdx = rows.map((row) => row.actual != null).lastIndexOf(true)
    if (lastActualIdx >= 0) {
      const firstForecastIdx = rows.findIndex((row, idx) => idx > lastActualIdx && row.predicted != null)
      if (firstForecastIdx > lastActualIdx) {
        const lastActualValue = rows[lastActualIdx].actual
        if (lastActualValue != null) {
          rows[firstForecastIdx].predicted = lastActualValue
          rows[firstForecastIdx].upper = lastActualValue
          rows[firstForecastIdx].lower = lastActualValue
        }
      }
    }

    return rows
  }, [alignedTimeRange, forecastConfidenceQuery.data?.forecast, selectedTimeRange, timeseriesQuery.data?.timeseries])

  useEffect(() => {
    if (!active) {
      return
    }

    if (coreChartData.length === 0) {
      setZoomRange(null)
      return
    }

    setZoomRange({ startIndex: 0, endIndex: coreChartData.length - 1 })
  }, [active, coreChartData.length, rangePreset, customStart, customEnd])

  const chartTickFormatter = useCallback(
    (timestampValue: number | string) => {
      const timestampMs = typeof timestampValue === 'number' ? timestampValue : Number(timestampValue)
      return formatCoreTick(timestampMs, selectedTimeRange.interval)
    },
    [selectedTimeRange.interval],
  )

  const handleChartWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (coreChartData.length < 3) {
        return
      }

      const current = zoomRange ?? { startIndex: 0, endIndex: coreChartData.length - 1 }
      const currentSpan = current.endIndex - current.startIndex + 1
      if (currentSpan < 2) {
        return
      }
 
      const zoomIn = event.deltaY < 0
      const step = Math.max(1, Math.floor(currentSpan * 0.2))
      const targetSpan = zoomIn
        ? Math.max(2, currentSpan - step)
        : Math.min(coreChartData.length, currentSpan + step)

      const center = Math.floor((current.startIndex + current.endIndex) / 2)
      let nextStart = center - Math.floor(targetSpan / 2)
      let nextEnd = nextStart + targetSpan - 1

      if (nextStart < 0) {
        nextStart = 0
        nextEnd = targetSpan - 1
      }
      if (nextEnd > coreChartData.length - 1) {
        nextEnd = coreChartData.length - 1
        nextStart = Math.max(0, nextEnd - targetSpan + 1)
      }
      setZoomRange({ startIndex: nextStart, endIndex: nextEnd })
    },
    [coreChartData.length, zoomRange],
  )

  const coreTickCount = useMemo(() => {
    if (rangePreset === '24h') {
      return 8
    }
    if (rangePreset === '3d') {
      return 9
    }
    if (rangePreset === '7d') {
      return 7
    }
    if (rangePreset === '30d') {
      return 6
    }
    return selectedTimeRange.interval === 'day' ? 6 : 8
  }, [rangePreset, selectedTimeRange.interval])

  const nowMs = Date.now()

  const timelineWarnings = useMemo(() => {
    const intervalMs = selectedTimeRange.interval === 'day' ? MS_IN_DAY : MS_IN_HOUR
    const sortedRawMs = (timeseriesQuery.data?.timeseries ?? [])
      .map((point) => parseUtcMs(point.timestamp))
      .sort((a, b) => a - b)

    const isSorted = sortedRawMs.every((value, index) => index === 0 || value >= sortedRawMs[index - 1])
    const rawHasMixedSpacing = sortedRawMs.some((value, index) => {
      if (index === 0) {
        return false
      }
      const delta = value - sortedRawMs[index - 1]
      return delta % intervalMs !== 0
    })

    return {
      isSorted,
      rawHasMixedSpacing,
    }
  }, [selectedTimeRange.interval, timeseriesQuery.data?.timeseries])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {RANGE_PRESET_LABELS.map((preset) => (
          <Button
            key={preset.value}
            size="sm"
            variant={rangePreset === preset.value ? 'default' : 'outline'}
            onClick={() => setRangePreset(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {rangePreset === 'custom' && (
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Start</span>
            <input
              type="datetime-local"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">End</span>
            <input
              type="datetime-local"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            />
          </label>
        </div>
      )}

      {!selectedTimeRange.valid && (
        <p className="text-sm text-destructive">Custom range is invalid. Ensure start is before end.</p>
      )}

      {selectedTimeRange.valid && (!timelineWarnings.isSorted || timelineWarnings.rawHasMixedSpacing) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Timeline note</AlertTitle>
          <AlertDescription>
            {!timelineWarnings.isSorted && 'Timestamps are not sorted. '}
            {timelineWarnings.rawHasMixedSpacing && 'Detected raw spacing that does not match the selected interval. '}
            Chart is rendered on IST time scale.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-5 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showActual}
            onChange={(event) => setShowActual(event.target.checked)}
          />
          Actual
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showPredicted}
            onChange={(event) => setShowPredicted(event.target.checked)}
          />
          Predicted
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(event) => setShowConfidence(event.target.checked)}
          />
          Confidence
        </label>
        <span className="text-xs text-muted-foreground">Tip: drag the brush to pan, scroll on chart to zoom.</span>
      </div>

      {timeseriesQuery.isLoading || forecastConfidenceQuery.isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <ChartFullscreen title="Actual vs Predicted chart">
          {(isFullscreen) => (
            <div
              className={isFullscreen ? 'h-[calc(100vh-11rem)] min-h-[380px]' : 'h-[380px]'}
              onWheel={handleChartWheel}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={coreChartData} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickCount={coreTickCount}
                    tickFormatter={chartTickFormatter}
                    minTickGap={24}
                  />
                  <YAxis />
                  <Tooltip cursor={{ strokeDasharray: '4 4' }} content={<CoreChartTooltip capacity={capacity} />} />
                  <ReferenceLine
                    x={nowMs}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    label={{ value: 'Now', position: 'insideTopRight', fill: 'hsl(var(--primary))', fontSize: 12 }}
                  />
                  {showConfidence && (
                    <>
                      <Area type="monotone" dataKey="upper" fill="hsl(var(--muted))" stroke="transparent" fillOpacity={0.2} name="Upper bound" connectNulls />
                      <Area type="monotone" dataKey="lower" fill="hsl(var(--background))" stroke="transparent" fillOpacity={1} name="Lower bound" connectNulls />
                    </>
                  )}
                  {showActual && (
                    <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(var(--primary))" strokeWidth={2.2} dot={false} connectNulls />
                  )}
                  {showPredicted && (
                    <Line type="monotone" dataKey="predicted" name="Predicted" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                  )}
                  <Brush
                    dataKey="timeMs"
                    height={26}
                    stroke="hsl(var(--primary))"
                    startIndex={zoomRange?.startIndex}
                    endIndex={zoomRange?.endIndex}
                    tickFormatter={chartTickFormatter}
                    onChange={(range) => {
                      if (range?.startIndex == null || range?.endIndex == null) {
                        return
                      }
                      setZoomRange({ startIndex: range.startIndex, endIndex: range.endIndex })
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartFullscreen>
      )}
    </div>
  )
}
