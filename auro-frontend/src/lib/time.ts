const IST_TIME_ZONE = 'Asia/Kolkata'

const MS_IN_MINUTE = 60 * 1000
const IST_OFFSET_MS = (5 * 60 + 30) * MS_IN_MINUTE

export function formatISTDateTime(value: string | number | Date) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TIME_ZONE,
  })
}

export function formatISTDate(value: string | number | Date) {
  return new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    timeZone: IST_TIME_ZONE,
  })
}

export function formatISTTime(value: string | number | Date) {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: IST_TIME_ZONE,
  })
}

export function formatISTDayHour(value: string | number | Date) {
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    hour: '2-digit',
    timeZone: IST_TIME_ZONE,
  })
}

export function formatISTDateTimeLocalInput(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16)
}

export function parseISTDateTimeLocal(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim())
  if (!match) {
    return new Date(Number.NaN)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])

  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MS
  return new Date(utcMs)
}

export function floorToISTIntervalMs(timestampMs: number, intervalMs: number): number {
  return Math.floor((timestampMs + IST_OFFSET_MS) / intervalMs) * intervalMs - IST_OFFSET_MS
}

export function getISTDayKey(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: IST_TIME_ZONE,
  }).formatToParts(new Date(timestampMs))

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}
