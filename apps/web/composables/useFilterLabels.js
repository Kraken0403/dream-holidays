export function useFilterLabels() {
  const { formatDate } = useDateTime()
  const presetLabels = {
    all: 'All time',
    today: 'Today',
    this_week: 'This week',
    this_month: 'This month',
    previous_month: 'Previous month',
    month: 'Selected month',
    this_quarter: 'This quarter',
    previous_quarter: 'Previous quarter',
    this_half: 'This half-year',
    previous_half: 'Previous half-year',
    financial_year: 'Financial year',
    custom: 'Custom dates',
  }

  function periodLabel(filters) {
    if (!filters) return ''
    if (filters.from || filters.to) return `Period: ${filters.from ? formatDate(filters.from) : 'Start'} – ${filters.to ? formatDate(filters.to) : 'Today'}`
    return filters.period && filters.period !== 'all' ? `Period: ${presetLabels[filters.period] || filters.period}` : ''
  }

  return { periodLabel }
}
