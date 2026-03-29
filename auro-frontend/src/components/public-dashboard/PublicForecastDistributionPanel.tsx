import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Area,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getPublicPlaceForecast } from '@/lib/api'
import {
  floorToISTIntervalMs,
  formatISTDate,
  formatISTDateTime,
  formatISTTime,
  getISTDayKey,
} from '@/lib/time'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

type RangePreset = '24h' | '3d' | '7d'

type ForecastChartPoint = {
  timeMs: number
  predicted: number
  upper: number
  lower: number
}

type RiskLevel = 'low' | 'medium' | 'high' | 'over' | 'unknown'

type RiskSummary = {
  label: string
  level: RiskLevel
  utilization: number | null
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step
}

const RANGE_PRESET_LABELS: Array<{ value: RangePreset; label: string }> = [
  { value: '24h', label: '24H' },
  { value: '3d', label: '3D' },
  { value: '7d', label: '7D' },
]

const MS_IN_HOUR = 60 * 60 * 1000
const MS_IN_DAY = 24 * MS_IN_HOUR

const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'rgba(34, 197, 94, 0.12)',
  medium: 'rgba(234, 179, 8, 0.14)',
  high: 'rgba(239, 68, 68, 0.12)',
  over: 'rgba(239, 68, 68, 0.2)',
  unknown: 'rgba(148, 163, 184, 0.1)',
}

function parseUtcMs(isoTimestamp: string): number {
  return new Date(isoTimestamp).getTime()
}

function formatUtcDateTime(value: string | number | Date) {
  return formatISTDateTime(value)
}

function formatForecastTick(value: number, preset: RangePreset): string {
  const date = new Date(value)

  if (preset === '24h') {
    return formatISTTime(date)
  }

  if (preset === '3d') {
    return formatISTDateTime(date)
  }

  if (preset === '7d') {
    return formatISTDate(date)
  }

  return formatISTDateTime(date)
}

function resolveRange(preset: RangePreset) {
  const now = new Date()
  const durationByPreset: Record<RangePreset, number> = {
    '24h': 24 * MS_IN_HOUR,
    '3d': 3 * MS_IN_DAY,
    '7d': 7 * MS_IN_DAY,
  }
  const end = new Date(now.getTime() + durationByPreset[preset])
  const startMs = floorToISTIntervalMs(now.getTime(), MS_IN_HOUR)
  const endMs = floorToISTIntervalMs(end.getTime(), MS_IN_HOUR)
  return {
    start: new Date(startMs),
    end: new Date(endMs),
  }
}

function getRiskSummary(predicted: number | null, capacity: number): RiskSummary {
  if (!Number.isFinite(predicted) || predicted == null || capacity <= 0) {
    return { label: 'Unknown', level: 'unknown', utilization: null }
  }

  const utilization = (predicted / capacity) * 100
  if (utilization < 70) {
    return { label: 'Low', level: 'low', utilization }
  }
  if (utilization < 90) {
    return { label: 'Elevated', level: 'medium', utilization }
  }
  if (utilization < 100) {
    return { label: 'High', level: 'high', utilization }
  }
  return { label: 'Over capacity', level: 'over', utilization }
}

function ForecastTooltip({
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

  const predictedValue = payload?.find((entry) => entry.dataKey === 'predicted')?.value
  const upperValue = payload?.find((entry) => entry.dataKey === 'upper')?.value
  const lowerValue = payload?.find((entry) => entry.dataKey === 'lower')?.value
  const predicted = typeof predictedValue === 'number' ? predictedValue : null
  const upper = typeof upperValue === 'number' ? upperValue : null
  const lower = typeof lowerValue === 'number' ? lowerValue : null
  const risk = getRiskSummary(predicted, capacity)

  return (
    <div className="rounded-md border bg-background p-3 text-xs shadow-md">
      <div className="mb-1 font-medium">Time: {formatUtcDateTime(label)}</div>
      <div>Predicted: {predicted != null ? Math.round(predicted) : '-'}</div>
      <div>Confidence band: {lower != null ? Math.round(lower) : '-'} - {upper != null ? Math.round(upper) : '-'}</div>
      <div>Capacity: {capacity > 0 ? capacity : '-'}</div>
      <div className="flex items-center gap-2">
        <span>Risk: {risk.label}</span>
        {risk.utilization != null && <span className="text-muted-foreground">({risk.utilization.toFixed(1)}%)</span>}
      </div>
    </div>
  )
}

export default function PublicForecastDistributionPanel({
  orgId, placeId,
  capacity,
  active,
}: {
  orgId: number
  placeId: number
  capacity: number
  active: boolean
}) {
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d')
  const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null)

  const selectedRange = useMemo(() => resolveRange(rangePreset), [rangePreset])

  const forecastQuery = useQuery({
    queryKey: [
      'place-forecast',
      orgId, placeId,
      'distribution',
      selectedRange.start.toISOString(),
      selectedRange.end.toISOString(),
    ],
    queryFn: () => getPublicPlaceForecast(orgId, placeId, selectedRange.start, selectedRange.end),
    enabled: Number.isFinite(placeId) && active,
  })

  const chartData = useMemo<ForecastChartPoint[]>(() => {
    const rows = (forecastQuery.data?.forecast ?? []).map((point) => ({
      timeMs: parseUtcMs(point.timestamp),
      predicted: point.count,
      upper: point.upper_bound,
      lower: point.lower_bound,
    }))
    rows.sort((a, b) => a.timeMs - b.timeMs)
    return rows
  }, [forecastQuery.data?.forecast])

  const yDomain = useMemo(() => {
    const maxForecast = Math.max(
      0,
      ...chartData.map((point) => Math.max(point.predicted, point.upper)),
    )
    const baseline = Math.max(maxForecast, capacity)

    if (capacity <= 0) {
      return [0, roundUp(Math.max(10, baseline*1.05), 10)]
    }

    const minPadding = Math.max(10, Math.round(capacity * 0.08))
    const maxPadding = Math.max(30, Math.round(capacity * 0.15))
    const neededPadding = Math.max(minPadding, baseline - capacity + Math.round(capacity * 0.02))
    const boundedPadding = Math.min(neededPadding, maxPadding)
    return [0, roundUp(capacity + boundedPadding, 5)]
  }, [chartData, capacity])

  const riskZones = useMemo(() => {
    if (capacity <= 0) {
      return null
    }

    const lowEnd = capacity * 0.7
    const mediumEnd = capacity * 0.9
    const maxY = yDomain[1]

    return {
      lowEnd,
      mediumEnd,
      maxY,
    }
  }, [capacity, yDomain])

  const globalPeak = useMemo(() => {
    if (chartData.length === 0) {
      return null
    }

    return chartData.reduce((max, point) => (point.predicted > max.predicted ? point : max), chartData[0])
  }, [chartData])

  const axisTicks = useMemo(() => {
    if (rangePreset !== '7d') {
      return undefined
    }

    const ticks: number[] = []
    let lastDayKey = ''

    for (const point of chartData) {
      const dayKey = getISTDayKey(point.timeMs)
      if (dayKey !== lastDayKey) {
        ticks.push(point.timeMs)
        lastDayKey = dayKey
      }
    }

    return ticks
  }, [chartData, rangePreset])

  useEffect(() => {
    if (!active) {
      return
    }

    if (chartData.length === 0) {
      setZoomRange(null)
      return
    }

    setZoomRange({ startIndex: 0, endIndex: chartData.length - 1 })
  }, [active, chartData.length, rangePreset])

  const handleChartWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (chartData.length < 3) {
        return
      }

      const current = zoomRange ?? { startIndex: 0, endIndex: chartData.length - 1 }
      const currentSpan = current.endIndex - current.startIndex + 1
      if (currentSpan < 2) {
        return
      }

      const zoomIn = event.deltaY < 0
      const step = Math.max(1, Math.floor(currentSpan * 0.2))
      const targetSpan = zoomIn
        ? Math.max(2, currentSpan - step)
        : Math.min(chartData.length, currentSpan + step)

      const center = Math.floor((current.startIndex + current.endIndex) / 2)
      let nextStart = center - Math.floor(targetSpan / 2)
      let nextEnd = nextStart + targetSpan - 1

      if (nextStart < 0) {
        nextStart = 0
        nextEnd = targetSpan - 1
      }
      if (nextEnd > chartData.length - 1) {
        nextEnd = chartData.length - 1
        nextStart = Math.max(0, nextEnd - targetSpan + 1)
      }
      setZoomRange({ startIndex: nextStart, endIndex: nextEnd })
    },
    [chartData.length, zoomRange],
  )

  const tickCount = useMemo(() => {
    if (rangePreset === '24h') {
      return 5
    }
    if (rangePreset === '3d') {
      return 6
    }
    return 5
  }, [rangePreset])

  const nowMs = Date.now()

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
        <span className="text-xs text-muted-foreground">Tip: drag the brush to pan, scroll on chart to zoom.</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS.low }} />
          Low
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS.medium }} />
          Elevated
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS.high }} />
          High
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RISK_COLORS.over }} />
          Over capacity
        </span>
      </div>

      {forecastQuery.isLoading ? (
        <Skeleton className="h-[340px] w-full" />
      ) : (
        <ChartFullscreen title="Forecast distribution chart">
          {(isFullscreen) => (
            <div
              className={isFullscreen ? 'h-[calc(100vh-11rem)] min-h-[380px]' : 'h-[380px]'}
              onWheel={handleChartWheel}
            >
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ left: 0, right: 8, top: 4 }}>
                  <CartesianGrid strokeDasharray="2 6" strokeOpacity={0.35} vertical={false} />
                  <XAxis
                    dataKey="timeMs"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    ticks={axisTicks}
                    interval={0}
                    tickCount={tickCount}
                    tickFormatter={(value) => formatForecastTick(Number(value), rangePreset)}
                    minTickGap={36}
                  />
                  <YAxis domain={yDomain} />
                  <Tooltip cursor={{ strokeDasharray: '4 4' }} content={<ForecastTooltip capacity={capacity} />} />
                  <ReferenceLine
                    x={nowMs}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="4 4"
                    label={{ value: 'Now', position: 'insideTopRight', fill: 'hsl(var(--primary))', fontSize: 12 }}
                  />
                  <Area
                    type="linear"
                    dataKey="upper"
                    fill="hsl(var(--muted))"
                    stroke="transparent"
                    fillOpacity={0.05}
                    name="Upper bound"
                    dot={false}
                    connectNulls
                  />
                  <Area
                    type="linear"
                    dataKey="lower"
                    fill="hsl(var(--background))"
                    stroke="transparent"
                    fillOpacity={1}
                    name="Lower bound"
                    dot={false}
                    connectNulls
                  />
                  {riskZones && (
                    <>
                      <ReferenceArea y1={0} y2={riskZones.lowEnd} fill={RISK_COLORS.low} fillOpacity={1} />
                      <ReferenceArea y1={riskZones.lowEnd} y2={riskZones.mediumEnd} fill={RISK_COLORS.medium} fillOpacity={1} />
                      <ReferenceArea y1={riskZones.mediumEnd} y2={capacity} fill={RISK_COLORS.high} fillOpacity={1} />
                      <ReferenceArea y1={capacity} y2={riskZones.maxY} fill={RISK_COLORS.over} fillOpacity={1} />
                    </>
                  )}
                  <Line
                    type="linear"
                    dataKey="predicted"
                    name="Predicted"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.4}
                    dot={rangePreset === '24h' ? { r: 2 } : false}
                    connectNulls
                  />
                  {capacity > 0 && (
                    <ReferenceLine
                      y={capacity}
                      stroke="hsl(var(--destructive))"
                      strokeDasharray="4 4"
                      label={{ value: 'Capacity limit', position: 'insideLeft', fill: 'hsl(var(--destructive))', fontSize: 12, dx: 8, dy: -4 }}
                    />
                  )}
                  {globalPeak && (
                    <ReferenceDot
                      key={globalPeak.timeMs}
                      x={globalPeak.timeMs}
                      y={globalPeak.predicted}
                      r={4}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      label={{
                        value: `Global peak ${Math.round(globalPeak.predicted)}`,
                        position: 'top',
                        offset: 14,
                        fill: 'hsl(var(--muted-foreground))',
                        fontSize: 11,
                      }}
                    />
                  )}
                  <Brush
                    dataKey="timeMs"
                    height={26}
                    stroke="hsl(var(--primary))"
                    startIndex={zoomRange?.startIndex}
                    endIndex={zoomRange?.endIndex}
                    tickFormatter={(value) => formatForecastTick(Number(value), rangePreset)}
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
