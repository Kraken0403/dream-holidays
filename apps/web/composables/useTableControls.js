function readField(row, field) {
  if (typeof field === 'function') return field(row)
  return String(field)
    .split('.')
    .reduce((value, key) => (value == null ? value : value[key]), row)
}

function searchableText(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(searchableText).join(' ')
  if (typeof value === 'object') return Object.values(value).map(searchableText).join(' ')
  return String(value).toLowerCase()
}

export function useTableControls(source, options = {}) {
  const search = ref('')
  const page = ref(1)
  const pageSize = ref(options.pageSize || 10)
  const pageSizeOptions = options.pageSizeOptions || [10, 25, 50, 100]

  const allRows = computed(() => unref(source) || [])
  const searchFields = options.searchFields || []

  const filteredRows = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return allRows.value

    return allRows.value.filter((row) => {
      if (!searchFields.length) return searchableText(row).includes(query)
      return searchFields.some((field) => searchableText(readField(row, field)).includes(query))
    })
  })

  const total = computed(() => allRows.value.length)
  const filtered = computed(() => filteredRows.value.length)
  const pageCount = computed(() => Math.max(Math.ceil(filtered.value / Number(pageSize.value || 1)), 1))
  const start = computed(() => (filtered.value ? (page.value - 1) * pageSize.value + 1 : 0))
  const end = computed(() => Math.min(page.value * pageSize.value, filtered.value))
  const rows = computed(() => filteredRows.value.slice(start.value ? start.value - 1 : 0, end.value))

  function reset() {
    search.value = ''
    page.value = 1
  }

  watch([search, pageSize], () => {
    page.value = 1
  })

  watch([filtered, pageSize], () => {
    if (page.value > pageCount.value) page.value = pageCount.value
    if (page.value < 1) page.value = 1
  })

  return {
    search,
    page,
    pageSize,
    pageSizeOptions,
    total,
    filtered,
    filteredRows,
    rows,
    pageCount,
    start,
    end,
    reset,
  }
}
