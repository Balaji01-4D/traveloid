import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

type PeakHourPoint = {
  hour: number
  avg_count: number
}

type PeakHoursPanelData = {
  busiest_hour: PeakHourPoint | null
  least_hour: PeakHourPoint | null
  top_hours: PeakHourPoint[]
  hourly_profile: PeakHourPoint[]
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatHourShort(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalized = hour % 12 === 0 ? 12 : hour % 12
  return `${normalized}${suffix}`
}

export default function PublicPeakHoursPanel({
  data,
  capacity,
}: {
  data: PeakHoursPanelData | undefined
  capacity: number
}) {
  const hourlySeries = useMemo(() => {
    const byHour = new Map<number, number>()
    for (const row of data?.hourly_profile ?? []) {
      byHour.set(row.hour, row.avg_count)
    }

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: byHour.get(hour) ?? 0,
    }))
  }, [data?.hourly_profile])

  const busiest = data?.busiest_hour ?? null
  const least = data?.least_hour ?? null

  const compareBars = useMemo(() => {
    const busiestValue = busiest?.avg_count ?? 0
    const leastValue = least?.avg_count ?? 0
    const maxValue = Math.max(busiestValue, leastValue, 1)
    const minVisible = Math.max(0.25, maxValue * 0.02)

    return [
      {
        label: busiest ? `Busiest (${formatHourShort(busiest.hour)})` : 'Busiest',
        value: busiestValue,
        plotValue: busiestValue > 0 ? busiestValue : minVisible,
      },
      {
        label: least ? `Least (${formatHourShort(least.hour)})` : 'Least',
        value: leastValue,
        plotValue: leastValue > 0 ? leastValue : minVisible,
      },
    ]
  }, [busiest, least])

  const topHours = data?.top_hours ?? []

  if (!data || (data.hourly_profile?.length ?? 0) === 0) {
    return <p className="text-sm text-muted-foreground">No peak-hours data available.</p>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs text-muted-foreground">Comparison (Avg people/hour)</p>
          <ChartFullscreen title="Peak comparison chart">
            {(isFullscreen) => (
              <ResponsiveContainer width="100%" height={isFullscreen ? 620 : 220}>
                <BarChart data={compareBars} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Avg crowd', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(_value, _name, entry) => {
                      const row = entry?.payload as { value: number } | undefined
                      const raw = row?.value ?? 0
                      return [raw.toFixed(1), 'Avg people/hour']
                    }}
                  />
                  <Bar dataKey="plotValue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} minPointSize={3} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartFullscreen>
        </div>

        <div>
          <p className="mb-2 text-xs text-muted-foreground">Top 3 busiest hours (Avg people/hour)</p>
          <div className="space-y-2">
            {topHours.map((row, index) => (
              <div key={`${row.hour}-${row.avg_count}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>#{index + 1} {formatHour(row.hour)}</span>
                <span className="font-medium">{row.avg_count.toFixed(1)}</span>
              </div>
            ))}
          </div>
          {capacity > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Capacity baseline: {capacity} people
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs text-muted-foreground">Hourly profile (avg by hour-of-day)</p>
        <ChartFullscreen title="Hourly profile chart">
          {(isFullscreen) => (
            <ResponsiveContainer width="100%" height={isFullscreen ? 620 : 260}>
              <LineChart data={hourlySeries} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(value) => formatHour(Number(value))}
                  label={{ value: 'Hour', position: 'insideBottom', offset: -4, fontSize: 12 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Avg crowd', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(value) => `Hour: ${formatHour(Number(value))}`}
                  formatter={(value) => [Number(value).toFixed(1), 'Avg people/hour']}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.4} dot={{ r: 2.2 }} />

                {busiest && (
                  <ReferenceDot
                    x={busiest.hour}
                    y={busiest.avg_count}
                    r={5}
                    fill="#b42318"
                    stroke="hsl(var(--background))"
                    label={{
                      value: `Peak ${formatHour(busiest.hour)}`,
                      position: 'top',
                      fill: '#b42318',
                      fontSize: 11,
                    }}
                  />
                )}
                {least && (
                  <ReferenceDot
                    x={least.hour}
                    y={least.avg_count}
                    r={5}
                    fill="#0f766e"
                    stroke="hsl(var(--background))"
                    label={{
                      value: `Low ${formatHour(least.hour)}`,
                      position: 'bottom',
                      fill: '#0f766e',
                      fontSize: 11,
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartFullscreen>
      </div>
    </div>
  )
}
