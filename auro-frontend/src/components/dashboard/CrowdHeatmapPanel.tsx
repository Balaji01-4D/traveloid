import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import ChartFullscreen from '@/components/dashboard/ChartFullscreen'

const DAY_LABELS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_REMAP_TO_MON_FIRST = [1, 2, 3, 4, 5, 6, 0]

type HeatmapCell = [hour: number, dayIndex: number, value: number | null]

type PeakCell = {
  hour: number
  dayIndex: number
  value: number
}

function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0
  }

  const rawIndex = (sortedValues.length - 1) * ratio
  const lower = Math.floor(rawIndex)
  const upper = Math.ceil(rawIndex)

  if (lower === upper) {
    return sortedValues[lower]
  }

  const weight = rawIndex - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalized = hour % 12 === 0 ? 12 : hour % 12
  return `${normalized} ${suffix}`
}

function buildCells(heatmap: Array<Array<number | null>>): {
  cells: HeatmapCell[]
  values: number[]
  maxCell: PeakCell | null
  minCell: PeakCell | null
} {
  const cells: HeatmapCell[] = []
  const values: number[] = []
  let maxCell: PeakCell | null = null
  let minCell: PeakCell | null = null

  DAY_REMAP_TO_MON_FIRST.forEach((sourceDayIndex, targetDayIndex) => {
    const row = heatmap[sourceDayIndex] ?? []

    for (let hour = 0; hour < 24; hour += 1) {
      const value = row[hour]
      const safeValue = typeof value === 'number' ? value : null
      cells.push([hour, targetDayIndex, safeValue])

      if (safeValue == null) {
        continue
      }

      values.push(safeValue)

      if (maxCell == null || safeValue > maxCell.value) {
        maxCell = { hour, dayIndex: targetDayIndex, value: safeValue }
      }

      if (minCell == null || safeValue < minCell.value) {
        minCell = { hour, dayIndex: targetDayIndex, value: safeValue }
      }
    }
  })

  return { cells, values, maxCell, minCell }
}

export default function CrowdHeatmapPanel({
  heatmap,
}: {
  heatmap: Array<Array<number | null>>
}) {
  const option = useMemo(() => {
    const { cells, values, maxCell, minCell } = buildCells(heatmap)
    const sortedValues = [...values].sort((a, b) => a - b)

    const absoluteMin = sortedValues[0] ?? 0
    const absoluteMax = sortedValues[sortedValues.length - 1] ?? 1
    const p5 = percentile(sortedValues, 0.05)
    const p95 = percentile(sortedValues, 0.95)

    const visualMin = Math.min(absoluteMin, p5)
    const visualMax = Math.max(visualMin + 1, Math.max(absoluteMax, p95))

    return {
      tooltip: {
        trigger: 'item',
        confine: true,
        formatter: (params: { data: HeatmapCell }) => {
          const [hour, dayIndex, count] = params.data
          const dayLabel = DAY_LABELS_MON_FIRST[dayIndex] ?? 'Unknown'
          const valueLabel = typeof count === 'number' ? count.toFixed(1) : 'No data'
          return `${dayLabel}, ${formatHour(hour)}<br/>Avg crowd: ${valueLabel}`
        },
      },
      grid: {
        left: 80,
        right: 28,
        top: 40,
        bottom: 95,
      },
      xAxis: {
        type: 'category',
        name: 'Hour of day (IST)',
        nameLocation: 'middle',
        nameGap: 34,
        data: Array.from({ length: 24 }, (_, hour) => String(hour)),
      },
      yAxis: {
        type: 'category',
        name: 'Day of week',
        nameLocation: 'middle',
        nameGap: 48,
        data: DAY_LABELS_MON_FIRST,
      },
      visualMap: {
        min: visualMin,
        max: visualMax,
        calculable: true,
        precision: 1,
        orient: 'horizontal' as const,
        left: 'center' as const,
        bottom: 24,
        inRange: {
          color: ['#f8fbff', '#a8c7ff', '#3f7cff', '#1638b9', '#081b6b'],
        },
      },
      series: [
        {
          name: 'Avg crowd',
          type: 'heatmap',
          data: cells,
          itemStyle: {
            borderColor: 'rgba(255,255,255,0.24)',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 1.5,
              shadowBlur: 8,
              shadowColor: 'rgba(16, 24, 40, 0.35)',
            },
          },
          markPoint: {
            symbolSize: 42,
            label: {
              color: '#ffffff',
              fontWeight: 700,
              formatter: ({ data }: { data: { value?: string } }) => data.value ?? '',
            },
            data: [
              maxCell
                ? {
                    name: 'Peak',
                    coord: [maxCell.hour, maxCell.dayIndex],
                    value: 'MAX',
                    itemStyle: { color: '#b42318' },
                  }
                : null,
              minCell
                ? {
                    name: 'Low',
                    symbol: 'circle',
                    coord: [minCell.hour, minCell.dayIndex],
                    value: 'MIN',
                    itemStyle: { color: '#0f766e' },
                  }
                : null,
            ].filter(Boolean),
          },
        },
      ],
    }
  }, [heatmap])

  return (
    <ChartFullscreen title="Crowd heatmap">
      {(isFullscreen) => (
        <ReactECharts option={option} style={{ height: isFullscreen ? '78vh' : '460px', width: '100%' }} />
      )}
    </ChartFullscreen>
  )
}
