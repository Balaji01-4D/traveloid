import { useMemo } from 'react'
import {
  Area,
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

import type { ForecastPoint } from '@/lib/api'
import { formatISTDateTime, formatISTDayHour } from '@/lib/time'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

type UtilizationChartPoint = {
  timeMs: number
  predictedCount: number
  utilizationRaw: number
  utilizationPlot: number
  lowerPlot: number
  upperPlot: number
}

type OverloadSegment = {
  startMs: number
  endMs: number
}

function formatDateTime(value: string | number | Date) {
  return formatISTDateTime(value)
}

function formatTick(value: number) {
  return formatISTDayHour(value)
}

function getUtilizationStatus(utilization: number): 'Safe' | 'Moderate' | 'Warning' | 'Overload' {
  if (utilization > 100) {
    return 'Overload'
  }
  if (utilization >= 90) {
    return 'Warning'
  }
  if (utilization >= 70) {
    return 'Moderate'
  }
  return 'Safe'
}

function UtilizationTooltip({
  active,
  label,
  payload,
  capacity,
}: {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ dataKey?: unknown; value?: unknown; payload?: unknown }>
  capacity: number
}) {
  if (!active || label == null) {
    return null
  }

  const utilizationEntry = payload?.find(
    (entry) => entry.dataKey === 'utilizationPlot' || entry.dataKey === 'utilization',
  )
  const pointPayload = utilizationEntry?.payload as UtilizationChartPoint | undefined

  const utilization = typeof utilizationEntry?.value === 'number'
    ? pointPayload?.utilizationRaw ?? utilizationEntry.value
    : null
  const predicted = pointPayload?.predictedCount

  return (
    <div className="rounded-md border bg-background p-3 text-xs shadow-md">
      <div className="mb-1 font-medium">Time: {formatDateTime(label)}</div>
      <div>Utilization: {utilization != null ? `${utilization.toFixed(1)}%` : '-'}</div>
      <div>Capacity: {capacity > 0 ? capacity : '-'}</div>
      <div>Predicted: {typeof predicted === 'number' ? Math.round(predicted) : '-'}</div>
      <div>Status: {utilization != null ? getUtilizationStatus(utilization) : '-'}</div>
    </div>
  )
}

export default function PublicCapacityUtilizationPanel({
  forecast,
  capacity,
}: {
  forecast: ForecastPoint[]
  capacity: number
}) {
  const chartData = useMemo<UtilizationChartPoint[]>(() => {
    if (capacity <= 0) {
      return []
    }

    return forecast
      .map((point) => {
        const utilization = (point.count / capacity) * 100
        const upperRaw = (point.upper_bound / capacity) * 100
        const lowerRaw = (point.lower_bound / capacity) * 100
        return {
          timeMs: new Date(point.timestamp).getTime(),
          predictedCount: point.count,
          utilizationRaw: utilization,
          utilizationPlot: Math.min(utilization, 100),
          upperPlot: Math.min(upperRaw, 100),
          lowerPlot: Math.max(0, Math.min(lowerRaw, 100)),
        }
      })
      .sort((a, b) => a.timeMs - b.timeMs)
  }, [forecast, capacity])

  const overloadSegments = useMemo<OverloadSegment[]>(() => {
    if (chartData.length < 2) {
      return []
    }

    const segments: OverloadSegment[] = []
    let currentStart: number | null = null

    for (let idx = 0; idx < chartData.length; idx += 1) {
      const point = chartData[idx]
      const isOverload = point.utilizationRaw > 100

      if (isOverload && currentStart == null) {
        currentStart = point.timeMs
      }

      const isLast = idx === chartData.length - 1
      const nextPoint = !isLast ? chartData[idx + 1] : null
      const closesSegment = currentStart != null && (!isOverload || isLast)

      if (closesSegment) {
        const startMs = currentStart
        if (startMs == null) {
          continue
        }

        const endMs = isOverload
          ? point.timeMs
          : chartData[Math.max(0, idx - 1)].timeMs

        const paddedEndMs = nextPoint
          ? nextPoint.timeMs
          : endMs

        segments.push({
          startMs,
          endMs: paddedEndMs,
        })
        currentStart = null
      }
    }

    return segments
  }, [chartData])

  const peakPoint = useMemo(() => {
    if (chartData.length === 0) {
      return null
    }
    return chartData.reduce((max, point) => (point.utilizationRaw > max.utilizationRaw ? point : max), chartData[0])
  }, [chartData])

  const lowPoint = useMemo(() => {
    if (chartData.length === 0) {
      return null
    }
    return chartData.reduce((min, point) => (point.utilizationRaw < min.utilizationRaw ? point : min), chartData[0])
  }, [chartData])

  const nowMs = Date.now()

  if (capacity <= 0) {
    return <p className="text-sm text-muted-foreground">Capacity is not configured for this place.</p>
  }

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground">No forecast utilization data available.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500/30" />
          Safe (0-70%)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/30" />
          Moderate (70-90%)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-orange-500/30" />
          Warning (90-100%)
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/35" />
          Overload (&gt;100%, clipped on Y-axis)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {peakPoint && (
          <span>
            Peak: {peakPoint.utilizationRaw.toFixed(1)}% at {formatDateTime(peakPoint.timeMs)}
          </span>
        )}
        {lowPoint && (
          <span>
            Low: {lowPoint.utilizationRaw.toFixed(1)}% at {formatDateTime(lowPoint.timeMs)}
          </span>
        )}
      </div>

      <ChartFullscreen title="Capacity utilization chart">
        {(isFullscreen) => (
          <ResponsiveContainer width="100%" height={isFullscreen ? 620 : 340}>
            <ComposedChart data={chartData} margin={{ left: 0, right: 8, top: 16 }}>
              <CartesianGrid strokeDasharray="2 6" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="timeMs"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => formatTick(Number(value))}
                tickCount={6}
                minTickGap={56}
              />
              <YAxis domain={[0, 105]} tickFormatter={(value) => `${value}%`} width={42} />
              <Tooltip cursor={{ strokeDasharray: '4 4' }} content={<UtilizationTooltip capacity={capacity} />} />

              <Area
                type="linear"
                dataKey="upperPlot"
                stroke="transparent"
                fill="hsl(var(--primary))"
                fillOpacity={0.05}
                connectNulls
                name="Upper band"
                dot={false}
              />
              <Area
                type="linear"
                dataKey="lowerPlot"
                stroke="transparent"
                fill="hsl(var(--background))"
                fillOpacity={1}
                connectNulls
                name="Lower band"
                dot={false}
              />

              <ReferenceArea y1={0} y2={70} fill="rgba(34, 197, 94, 0.1)" fillOpacity={1} />
              <ReferenceArea y1={70} y2={90} fill="rgba(245, 158, 11, 0.1)" fillOpacity={1} />
              <ReferenceArea y1={90} y2={100} fill="rgba(249, 115, 22, 0.1)" fillOpacity={1} />

              {overloadSegments.map((segment) => (
                <ReferenceArea
                  key={`${segment.startMs}-${segment.endMs}`}
                  x1={segment.startMs}
                  x2={segment.endMs}
                  y1={90}
                  y2={100}
                  fill="rgba(239, 68, 68, 0.18)"
                  fillOpacity={1}
                />
              ))}

              <Line
                type="linear"
                dataKey="utilizationPlot"
                stroke="hsl(var(--primary))"
                strokeWidth={2.4}
                dot={false}
                name="Utilization"
                connectNulls
              />

              <ReferenceLine
                y={100}
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 4"
                label={{ value: 'Capacity limit', position: 'insideLeft', fill: 'hsl(var(--destructive))', fontSize: 12 }}
              />
              <ReferenceLine
                x={nowMs}
                stroke="hsl(var(--primary))"
                strokeDasharray="4 4"
                label={{ value: 'NOW', position: 'insideTopRight', fill: 'hsl(var(--primary))', fontSize: 12 }}
              />

              {peakPoint && (
                <ReferenceDot
                  x={peakPoint.timeMs}
                  y={peakPoint.utilizationPlot}
                  r={4}
                  fill="hsl(var(--primary))"
                  stroke="hsl(var(--background))"
                />
              )}

              {lowPoint && (
                <ReferenceDot
                  x={lowPoint.timeMs}
                  y={lowPoint.utilizationPlot}
                  r={4}
                  fill="hsl(var(--muted-foreground))"
                  stroke="hsl(var(--background))"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartFullscreen>
    </div>
  )
}
