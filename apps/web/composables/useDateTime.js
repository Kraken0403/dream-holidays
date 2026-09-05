const IST_TIME_ZONE = 'Asia/Kolkata'

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const text = String(value)
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00+05:30` : text)
}

export function useDateTime() {
  const globalSettings = useState('global-settings', () => ({ dateFormat: 'DD/MM/YYYY' }))
  const dateFormat = computed(() => globalSettings.value?.dateFormat || 'DD/MM/YYYY')

  const formatDate = (value) => {
    const date = parseDate(value)
    if (!date || Number.isNaN(date.getTime())) return '—'
    const numeric = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((part) => [part.type, part.value]))
    const shortMonth = new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIME_ZONE, month: 'short' }).format(date)
    return ({
      'MM/DD/YYYY': `${numeric.month}/${numeric.day}/${numeric.year}`,
      'YYYY-MM-DD': `${numeric.year}-${numeric.month}-${numeric.day}`,
      'DD MMM YYYY': `${numeric.day} ${shortMonth} ${numeric.year}`,
      'MMM DD, YYYY': `${shortMonth} ${numeric.day}, ${numeric.year}`,
    }[dateFormat.value] || `${numeric.day}/${numeric.month}/${numeric.year}`)
  }

  const formatDateTime = (value) => {
    const date = parseDate(value)
    if (!date || Number.isNaN(date.getTime())) return '—'
    const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST_TIME_ZONE }).format(date)
    return `${formatDate(date)} ${time} IST`
  }

  const todayInput = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: IST_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]))
    return `${parts.year}-${parts.month}-${parts.day}`
  }
  const parseDateInput = (value) => {
    const text = String(value || '').trim()
    if (!text) return ''
    const monthMap = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
    let day, month, year
    if (dateFormat.value === 'YYYY-MM-DD') [year, month, day] = text.split(/[-/.]/).map(Number)
    else if (dateFormat.value === 'MM/DD/YYYY') [month, day, year] = text.split(/[-/.]/).map(Number)
    else if (dateFormat.value === 'DD MMM YYYY') { const parts = text.split(/[\s/-]+/); day = Number(parts[0]); month = monthMap[String(parts[1] || '').slice(0, 3).toLowerCase()]; year = Number(parts[2]) }
    else if (dateFormat.value === 'MMM DD, YYYY') { const parts = text.replace(',', '').split(/[\s/-]+/); month = monthMap[String(parts[0] || '').slice(0, 3).toLowerCase()]; day = Number(parts[1]); year = Number(parts[2]) }
    else [day, month, year] = text.split(/[-/.]/).map(Number)
    const candidate = new Date(Date.UTC(year, Number(month) - 1, day))
    if (!year || !month || !day || Number.isNaN(candidate.getTime()) || candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== Number(month) - 1 || candidate.getUTCDate() !== day) return null
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return { formatDate, formatDateTime, todayInput, parseDateInput, dateFormat, timeZone: IST_TIME_ZONE }
}
