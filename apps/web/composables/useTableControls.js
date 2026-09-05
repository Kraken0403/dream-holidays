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

function humanizeField(field) {
  return String(field || '').split('.').map(part => part.replace(/([a-z0-9])([A-Z])/g, '$1 $2')).join(' ').replace(/^./, value => value.toUpperCase())
}

function inferSortType(field) {
  const name = String(field || '')
  if (/(date|At)$/i.test(name)) return 'date'
  if (/(amount|total|balance|count|quantity|rate|cost|margin|debit|credit|paid|outstanding|version)$/i.test(name)) return 'number'
  return 'text'
}

function compareValues(left, right, type) {
  if (left == null || left === '') return right == null || right === '' ? 0 : 1
  if (right == null || right === '') return -1
  if (type === 'number') {
    const numeric = value => typeof value === 'number' ? value : Number(String(value || 0).replace(/[^0-9.-]+/g, ''))
    return numeric(left) - numeric(right)
  }
  if (type === 'date') return new Date(left).getTime() - new Date(right).getTime()
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
}

export function useTableControls(source, options = {}) {
  const search = ref('')
  const page = ref(1)
  const pageSize = ref(options.pageSize || 10)
  const pageSizeOptions = options.pageSizeOptions || [10, 25, 50, 100]
  const sortKey = ref(options.defaultSort?.key || '')
  const sortDirection = ref(options.defaultSort?.direction || 'asc')
  const registeredColumns = ref([])

  const allRows = computed(() => unref(source) || [])
  const searchFields = options.searchFields || []

  const searchedRows = computed(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) return allRows.value

    return allRows.value.filter((row) => {
      if (!searchFields.length) return searchableText(row).includes(query)
      return searchFields.some((field) => searchableText(readField(row, field)).includes(query))
    })
  })

  const sortOptions = computed(() => {
    const supplied = options.sortOptions || []
    const fallback = searchFields.filter(field => typeof field === 'string').map(field => ({ key: String(field), field, label: humanizeField(field), type: inferSortType(field) }))
    const combined = [...registeredColumns.value, ...supplied, ...fallback].map(option => typeof option === 'string' ? { key: option, field: option, label: humanizeField(option), type: inferSortType(option) } : { key: option.key || String(option.field), field: option.field ?? option.key, label: option.label || humanizeField(option.field ?? option.key), type: option.type || inferSortType(option.field ?? option.key), value: option.value })
    return combined.filter((option, index) => option.key && combined.findIndex(candidate => candidate.key === option.key) === index)
  })
  const activeSort = computed(() => sortOptions.value.find(option => option.key === sortKey.value) || null)
  const filteredRows = computed(() => {
    if (!activeSort.value) return searchedRows.value
    const option = activeSort.value
    const direction = sortDirection.value === 'desc' ? -1 : 1
    return searchedRows.value.map((row, index) => ({ row, index })).sort((left, right) => {
      const leftValue = option.value ? option.value(left.row) : readField(left.row, option.field)
      const rightValue = option.value ? option.value(right.row) : readField(right.row, option.field)
      return (compareValues(leftValue, rightValue, option.type) * direction) || left.index - right.index
    }).map(item => item.row)
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

  function registerColumns(columns = []) {
    const normalized = columns.filter(column => column && column.field).map(column => ({
      key: column.key || (typeof column.field === 'string' ? column.field : column.label),
      field: column.field,
      value: column.sortValue || (typeof column.field === 'function' ? column.field : column.value),
      label: column.label,
      type: column.type || inferSortType(column.key || column.field),
    }))
    registeredColumns.value = [...registeredColumns.value, ...normalized].filter((option, index, list) => list.findIndex(candidate => candidate.key === option.key) === index)
  }

  function setSort(key, direction) {
    if (!key) { sortKey.value = ''; sortDirection.value = 'asc'; return }
    if (sortKey.value === key && !direction) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    else { sortKey.value = key; sortDirection.value = direction || 'asc' }
  }

  watch([search, pageSize, sortKey, sortDirection], () => {
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
    sortKey,
    sortDirection,
    sortOptions,
    activeSort,
    setSort,
    registerColumns,
  }
}
