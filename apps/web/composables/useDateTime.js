const IST_TIME_ZONE = 'Asia/Kolkata'

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const text = String(value)
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00+05:30` : text)
}

export function useDateTime() {
  const formatDate = (value) => {
    const date = parseDate(value)
    if (!date || Number.isNaN(date.getTime())) return '—'
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: IST_TIME_ZONE }).format(date)
  }

  const formatDateTime = (value) => {
    const date = parseDate(value)
    if (!date || Number.isNaN(date.getTime())) return '—'
    return `${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST_TIME_ZONE }).format(date)} IST`
  }

  const todayInput = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map((part) => [part.type, part.value]))
    return `${parts.year}-${parts.month}-${parts.day}`
  }
  return { formatDate, formatDateTime, todayInput, timeZone: IST_TIME_ZONE }
}
