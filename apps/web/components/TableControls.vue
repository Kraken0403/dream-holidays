<template>
  <div ref="root" class="border-b border-gray-200 bg-white">
    <div v-if="selectedCount" class="flex min-h-[48px] flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-3 py-2">
      <span class="inline-flex h-7 items-center rounded-full bg-blue-600 px-3 text-xs font-semibold text-white">{{ selectedCount }} selected</span>
      <slot name="selected-actions" />
      <button v-if="exportable" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100" @click="$emit('export', exportConfiguration())">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19.5h14"/></svg> Export selected
      </button>
      <button type="button" class="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-gray-600 hover:bg-white" @click="$emit('clear-selection')">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg> Clear selection
      </button>
    </div>

    <div v-else class="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div v-if="showSearch" class="relative w-full sm:w-72">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/></svg>
          <input :value="search" type="search" :placeholder="searchPlaceholder" class="h-8 w-full rounded-full border border-gray-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" @input="$emit('update:search', $event.target.value)" />
        </div>
        <button v-if="hasFilters" type="button" class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold" :class="filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'" @click="filtersOpen = !filtersOpen">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h18M6.75 9.75h10.5m-7.5 5.25h4.5"/></svg> Filters<span v-if="filterCount" class="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ filterCount }}</span>
        </button>
        <div v-if="controllerSortOptions.length" ref="sortMenu" class="relative">
          <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold" :class="sortOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'" @click="sortOpen = !sortOpen">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 7h11M8 12h8M8 17h5M4 5v14m0 0-2-2m2 2 2-2"/></svg> Sort by<span v-if="controllerActiveSort" class="max-w-28 truncate text-blue-700">{{ controllerActiveSort.label }}</span>
          </button>
          <div v-if="sortOpen" class="absolute left-0 top-10 z-30 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <label class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Field</label>
            <select :value="controllerSortKey" class="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 text-xs outline-none focus:border-blue-500" @change="selectSort($event.target.value)"><option value="">Default order</option><option v-for="option in controllerSortOptions" :key="option.key" :value="option.key">{{ option.label }}</option></select>
            <div v-if="controllerActiveSort" class="mt-3 grid grid-cols-2 rounded-lg border border-gray-200 p-0.5"><button type="button" class="rounded-md px-2 py-2 text-xs font-semibold" :class="controllerSortDirection === 'asc' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'" @click="setSortDirection('asc')">{{ directionLabels.asc }}</button><button type="button" class="rounded-md px-2 py-2 text-xs font-semibold" :class="controllerSortDirection === 'desc' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-50'" @click="setSortDirection('desc')">{{ directionLabels.desc }}</button></div>
          </div>
        </div>
        <button v-if="exportable" type="button" :disabled="!filtered" class="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40" @click="$emit('export', exportConfiguration())">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19.5h14"/></svg> Export XLS
        </button>
        <button type="button" class="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50" @click="openColumns">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg> Configure columns
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span class="whitespace-nowrap">{{ resultLabel }}</span>
        <select :value="pageSize" aria-label="Rows per page" class="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-blue-500" @change="$emit('update:pageSize', Number($event.target.value))"><option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} / page</option></select>
        <button type="button" title="Previous page" :disabled="page <= 1" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40" @click="$emit('update:page', page - 1)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg></button>
        <span class="min-w-[42px] text-center font-medium text-gray-700">{{ page }}/{{ pageCount }}</span>
        <button type="button" title="Next page" :disabled="page >= pageCount" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40" @click="$emit('update:page', page + 1)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6"/></svg></button>
      </div>
    </div>

    <div v-if="activeFilters.length" class="flex flex-wrap gap-2 border-t border-gray-100 px-3 py-2">
      <span v-for="filter in activeFilters" :key="filter.key" class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{{ filter.label }}<button type="button" class="rounded-full p-0.5 hover:bg-blue-100" :aria-label="`Remove ${filter.label}`" @click="$emit('remove-filter', filter.key)"><svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg></button></span>
    </div>
    <div v-if="hasFilters && filtersOpen" class="flex flex-wrap items-end gap-2 border-t border-gray-100 bg-gray-50/70 px-3 py-2.5 text-xs [&_input]:h-9 [&_input]:py-1.5 [&_label]:mb-1 [&_label]:text-[11px] [&_select]:h-9 [&_select]:py-1.5"><slot name="filters" /></div>

    <Teleport to="body">
      <div v-if="columnsOpen" class="fixed inset-0 z-[100] bg-gray-900/35" @click.self="closeColumns">
        <aside class="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-x-hidden bg-white shadow-2xl">
          <header class="flex min-w-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4"><div class="min-w-0"><h2 class="font-semibold text-gray-900">Configure listing</h2><p class="mt-0.5 text-xs text-gray-500">Drag, rename, align, hide, or add columns. Resize columns directly from the table header.</p></div><button type="button" class="flex-none rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Close column settings" @click="closeColumns"><svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg></button></header>
          <div class="border-b border-gray-100 p-4"><div class="relative"><svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/></svg><input v-model="columnSearch" type="search" placeholder="Search columns and values" class="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div></div>
          <div class="min-w-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto p-4">
            <section v-if="filteredAvailableColumns.length" class="mb-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <div class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-blue-500">Available record fields</div>
              <div class="flex min-w-0 flex-wrap gap-1.5"><button v-for="option in filteredAvailableColumns" :key="option.key" type="button" :title="option.label" class="inline-flex max-w-full items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100" @click="addCustomColumn(option)"><svg class="h-3 w-3 flex-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg><span class="truncate">{{ option.label }}</span></button></div>
            </section>
            <article v-for="column in filteredColumns" :key="column.key" draggable="true" class="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm" @dragstart="draggedKey = column.key" @dragover.prevent @drop="dropColumn(column.key)">
              <div class="flex items-center gap-2"><svg class="h-5 w-5 flex-none cursor-grab text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg><input v-model="column.visible" type="checkbox" class="rounded border-gray-300 text-blue-600" @change="applyColumns" /><input v-model="column.label" type="text" aria-label="Column label" class="min-w-0 flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm font-semibold text-gray-800 outline-none focus:border-blue-400" @input="applyColumns" /><button v-if="column.custom" type="button" class="rounded-md p-1.5 text-red-500 hover:bg-red-50" title="Delete custom column" @click="deleteCustomColumn(column.key)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 7 1 14h10l1-14M4 7h16M9 7V4h6v3"/></svg></button></div>
              <div class="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3"><div class="min-w-0"><label class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ column.custom ? 'Record value' : 'Current values' }}</label><select v-if="column.custom && availableColumns.length" v-model="column.sourceKey" class="w-full min-w-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" @change="applyColumns"><option value="">Fixed value</option><option v-for="option in availableColumns" :key="option.key" :value="option.key">{{ option.label }}</option></select><input v-if="column.custom && !column.sourceKey" v-model="column.defaultValue" type="text" placeholder="Fixed value shown in each row" class="mt-1 w-full min-w-0 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" @input="applyColumns" /><p v-if="!column.custom" class="break-words text-xs text-gray-500" :title="column.sampleValues">{{ column.sampleValues || 'No values yet' }}</p></div><div class="flex-none"><label class="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">Alignment</label><div class="flex rounded-md border border-gray-200 p-0.5"><button v-for="alignment in alignments" :key="alignment.id" type="button" class="rounded p-1.5" :class="column.align === alignment.id ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'" :title="alignment.label" @click="column.align = alignment.id; applyColumns()"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" :d="alignment.path"/></svg></button></div></div></div>
            </article>
            <p v-if="!filteredColumns.length && !filteredAvailableColumns.length" class="py-10 text-center text-sm text-gray-400">No columns or record fields match your search.</p>
          </div>
          <footer class="border-t border-gray-200 bg-gray-50 p-4"><div class="flex gap-2"><button type="button" class="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50" @click="addCustomColumn"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add column</button><button type="button" class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100" @click="resetColumns"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12 2M18.5 9a7 7 0 0 0-12-2"/></svg>Reset</button></div><button type="button" class="mt-2 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" @click="closeColumns">Save configuration</button></footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
const slots = useSlots()
const { formatDate } = useDateTime()
const root = ref(null)
const sortMenu = ref(null)
const props = defineProps({
  search: { type: String, default: '' }, page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 },
  pageSizeOptions: { type: Array, default: () => [10, 25, 50, 100] }, total: { type: Number, default: 0 },
  filtered: { type: Number, default: 0 }, start: { type: Number, default: 0 }, end: { type: Number, default: 0 },
  searchPlaceholder: { type: String, default: 'Search...' }, showSearch: { type: Boolean, default: true },
  exportable: { type: Boolean, default: false }, selectedCount: { type: Number, default: 0 }, filterCount: { type: Number, default: 0 },
  tableKey: { type: String, default: '' }, activeFilters: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] }, availableColumns: { type: Array, default: () => [] },
  controller: { type: Object, default: null }, fillViewport: { type: Boolean, default: true },
})
defineEmits(['update:search', 'update:page', 'update:pageSize', 'export', 'clear-selection', 'remove-filter'])
const filtersOpen = ref(false), columnsOpen = ref(false), sortOpen = ref(false), columns = ref([]), columnSearch = ref(''), draggedKey = ref('')
let table = null
let activeStorageKey = ''
const hasFilters = computed(() => Boolean(slots.filters))
const pageCount = computed(() => Math.max(Math.ceil(props.filtered / Number(props.pageSize || 1)), 1))
const resultLabel = computed(() => !props.total ? 'No results' : !props.filtered ? `No matches · ${props.total} total` : `${props.start}-${props.end} of ${props.filtered}${props.filtered === props.total ? '' : ` · ${props.total} total`}`)
const filteredColumns = computed(() => { const query = columnSearch.value.trim().toLowerCase(); return query ? columns.value.filter(column => `${column.label} ${column.originalLabel} ${column.sampleValues} ${column.defaultValue || ''} ${props.availableColumns.find(option => option.key === column.sourceKey)?.label || ''}`.toLowerCase().includes(query)) : columns.value })
const filteredAvailableColumns = computed(() => { const query = columnSearch.value.trim().toLowerCase(); return props.availableColumns.filter(option => !query || `${option.label} ${option.key}`.toLowerCase().includes(query)) })
const alignments = [{ id: 'left', label: 'Align left', path: 'M4 6h16M4 10h10M4 14h16M4 18h10' }, { id: 'center', label: 'Align center', path: 'M4 6h16M7 10h10M4 14h16M7 18h10' }, { id: 'right', label: 'Align right', path: 'M4 6h16M10 10h10M4 14h16M10 18h10' }]
const controllerSortOptions = computed(() => unref(props.controller?.sortOptions) || [])
const controllerSortKey = computed(() => unref(props.controller?.sortKey) || '')
const controllerSortDirection = computed(() => unref(props.controller?.sortDirection) || 'asc')
const controllerActiveSort = computed(() => controllerSortOptions.value.find(option => option.key === controllerSortKey.value) || null)
const directionLabels = computed(() => controllerActiveSort.value?.type === 'date' ? { asc: 'Oldest first', desc: 'Most recent' } : controllerActiveSort.value?.type === 'number' ? { asc: 'Lowest first', desc: 'Highest first' } : { asc: 'A-Z', desc: 'Z-A' })

function findTable() { return root.value?.parentElement?.querySelector('table') || null }
function keyFor(defaults) {
  if (props.tableKey) return `table-config:${props.tableKey}`
  const stableSignature = [...defaults]
    .filter(column => !String(column.key || '').startsWith('custom-'))
    .sort((left, right) => Number(String(left.key).replace(/\D+/g, '') || 0) - Number(String(right.key).replace(/\D+/g, '') || 0))
    .map(column => `${column.key}:${column.originalLabel}`)
    .join('|')
  return `table-config:${location.pathname}:${stableSignature}`
}
function initialiseColumns() {
  table = findTable()
  const headers = [...(table?.querySelectorAll('thead th') || [])]
  if (!headers.length) return
  headers.forEach((header, index) => { if (!header.dataset.columnKey) header.dataset.columnKey = `column-${index}` })
  for (const row of table.querySelectorAll('tr')) [...row.children].forEach((cell, index) => { if (!cell.dataset.columnKey) cell.dataset.columnKey = `column-${index}` })
  const defaults = headers.map((header, index) => {
    const isSelection = Boolean(header.querySelector('input[type="checkbox"]'))
    const originalLabel = header.dataset.originalLabel || header.textContent.trim() || (isSelection ? 'Selection' : index === headers.length - 1 ? 'Actions' : `Column ${index + 1}`)
    header.dataset.originalLabel = originalLabel
    const sampleValues = [...table.querySelectorAll(`tbody [data-column-key="column-${index}"]`)].slice(0, 4).map(cell => cell.textContent.trim()).filter(Boolean).join(' · ')
    const textAlign = getComputedStyle(header).textAlign
    return { key: header.dataset.columnKey, originalLabel, label: originalLabel, visible: true, width: '', widthNumber: '', align: ['center', 'right'].includes(textAlign) ? textAlign : 'left', sampleValues, isSelection, custom: false }
  })
  activeStorageKey = keyFor(defaults)
  try { const saved = JSON.parse(localStorage.getItem(activeStorageKey) || 'null'); columns.value = Array.isArray(saved) ? [...saved.filter(column => !column.custom || column.key), ...defaults.filter(item => !saved.some(column => column.key === item.key))] : defaults } catch { columns.value = defaults }
  props.controller?.registerColumns?.(props.availableColumns.map(option => ({ key: option.key, field: option.key, value: option.value, label: option.label, type: option.type })))
  applyColumns(false)
}
function ensureCustomCells() {
  for (const column of columns.value.filter(item => item.custom)) {
    for (const [rowIndex, row] of [...table.querySelectorAll('tr')].entries()) {
      if (row.querySelector(`[data-column-key="${column.key}"]`) || (row.children.length === 1 && row.children[0].hasAttribute('colspan'))) continue
      const cell = document.createElement(rowIndex === 0 ? 'th' : 'td')
      cell.dataset.columnKey = column.key
      cell.className = rowIndex === 0 ? 'px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide' : 'px-4 py-3 text-gray-600'
      cell.textContent = rowIndex === 0 ? column.label : customColumnValue(column, props.rows[rowIndex - 1])
      row.appendChild(cell)
    }
  }
}
function nestedValue(source, path) { return String(path || '').split('.').reduce((value, key) => value == null ? value : value[key], source) }
function customColumnValue(column, row) {
  if (!column.sourceKey) return column.defaultValue || '-'
  const option = props.availableColumns.find(item => item.key === column.sourceKey)
  const value = option?.value ? option.value(row) : nestedValue(row, column.sourceKey)
  if (option?.format) return option.format(value, row)
  if (value && /(?:date|at)$/i.test(column.sourceKey)) return formatDate(value)
  return value ?? '-'
}
function setHeaderLabel(header, column) {
  if (column.isSelection) return
  let label = header.querySelector('.configured-column-label')
  if (!label) { [...header.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).forEach(node => node.remove()); label = document.createElement('span'); label.className = 'configured-column-label'; label.style.color = 'inherit'; label.style.font = 'inherit'; header.insertBefore(label, header.firstChild) }
  label.textContent = column.label || column.originalLabel
}
function normalizedLabel(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ') }
function sortOptionForColumn(column) {
  if (!column || column.isSelection || normalizedLabel(column.originalLabel) === 'actions') return null
  if (column.custom && column.sourceKey) return controllerSortOptions.value.find(option => option.key === column.sourceKey) || null
  const label = normalizedLabel(column.originalLabel)
  return controllerSortOptions.value.find(option => normalizedLabel(option.label) === label)
    || controllerSortOptions.value.find(option => normalizedLabel(option.label).includes(label) || label.includes(normalizedLabel(option.label)))
    || null
}
function installHeaderSorting() {
  for (const header of table?.querySelectorAll('thead th') || []) {
    const column = columns.value.find(item => item.key === header.dataset.columnKey)
    const option = sortOptionForColumn(column)
    header.classList.toggle('cursor-pointer', Boolean(option))
    if (option && !header.dataset.sortInstalled) {
      header.dataset.sortInstalled = 'true'
      header.addEventListener('click', event => {
        if (event.target.closest('input,button,.column-resizer')) return
        const activeColumn = columns.value.find(item => item.key === header.dataset.columnKey)
        const activeOption = sortOptionForColumn(activeColumn)
        if (activeOption) props.controller?.setSort?.(activeOption.key)
      })
    }
  }
  updateSortIndicators()
}
function updateSortIndicators() {
  for (const header of table?.querySelectorAll('thead th') || []) {
    header.querySelector('.column-sort-indicator')?.remove()
    const column = columns.value.find(item => item.key === header.dataset.columnKey)
    const option = sortOptionForColumn(column)
    if (!option || option.key !== controllerSortKey.value) continue
    const indicator = document.createElement('span')
    indicator.className = 'column-sort-indicator ml-1 inline-block text-blue-600'
    indicator.textContent = controllerSortDirection.value === 'desc' ? '↓' : '↑'
    header.querySelector('.configured-column-label')?.appendChild(indicator)
  }
}
function installResizers() {
  for (const header of table?.querySelectorAll('thead th') || []) {
    if (header.querySelector('.column-resizer')) continue
    header.classList.add('relative')
    const handle = document.createElement('span')
    handle.className = 'column-resizer absolute right-0 top-0 h-full w-2 cursor-col-resize select-none border-r-2 border-gray-300 bg-gray-100/70 hover:border-blue-500 hover:bg-blue-200'
    handle.title = 'Drag to resize column'
    handle.addEventListener('pointerdown', event => startResize(event, header.dataset.columnKey))
    header.appendChild(handle)
  }
}
function startResize(event, key) {
  event.preventDefault(); event.stopPropagation()
  const header = table?.querySelector(`thead th[data-column-key="${key}"]`)
  if (!header) return
  const startX = event.clientX, startWidth = header.getBoundingClientRect().width
  const move = moveEvent => { const number = Math.max(72, Math.round(startWidth + moveEvent.clientX - startX)); const column = columns.value.find(item => item.key === key); if (column) { column.widthNumber = number; column.width = `${number}px` }; setColumnWidth(key, `${number}px`) }
  const stop = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', stop); persistColumns() }
  document.addEventListener('pointermove', move); document.addEventListener('pointerup', stop)
}
function setColumnWidth(key, width) { for (const cell of table?.querySelectorAll(`[data-column-key="${key}"]`) || []) { cell.style.width = width || ''; cell.style.minWidth = width || ''; cell.style.maxWidth = width || '' } }
function persistColumns() { if (!activeStorageKey) return; try { localStorage.setItem(activeStorageKey, JSON.stringify(columns.value)) } catch {} }
function applyColumns(persist = true) {
  if (!table) initialiseColumns()
  if (!table || !columns.value.length) return
  ensureCustomCells()
  for (const column of columns.value) {
    for (const [cellIndex, cell] of [...table.querySelectorAll(`[data-column-key="${column.key}"]`)].entries()) { cell.style.display = column.visible ? '' : 'none'; cell.style.textAlign = column.align; if (column.width) setColumnWidth(column.key, column.width); if (cell.tagName === 'TH') setHeaderLabel(cell, column); else if (column.custom) cell.textContent = customColumnValue(column, props.rows[cellIndex - 1]) }
  }
  for (const row of table.querySelectorAll('tr')) { if ([...row.children].some(cell => cell.hasAttribute('colspan'))) continue; const cells = new Map([...row.children].map(cell => [cell.dataset.columnKey, cell])); for (const column of columns.value) { const cell = cells.get(column.key); if (cell) row.appendChild(cell) } }
  installResizers()
  installHeaderSorting()
  installViewportLayout()
  if (persist) persistColumns()
}
function dropColumn(targetKey) { const from = columns.value.findIndex(column => column.key === draggedKey.value), to = columns.value.findIndex(column => column.key === targetKey); if (from < 0 || to < 0 || from === to) return; const next = [...columns.value]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); columns.value = next; draggedKey.value = ''; applyColumns() }
function addCustomColumn(selectedOption) { const key = `custom-${Date.now()}`; const option = selectedOption?.key ? selectedOption : props.availableColumns[0]; columns.value.push({ key, originalLabel: option?.label || 'Custom column', label: option?.label || 'Custom column', visible: true, width: '', widthNumber: '', align: 'left', sampleValues: '', sourceKey: option?.key || '', defaultValue: '', custom: true, isSelection: false }); columnSearch.value = ''; applyColumns() }
function deleteCustomColumn(key) { columns.value = columns.value.filter(column => column.key !== key); for (const cell of table?.querySelectorAll(`[data-column-key="${key}"]`) || []) cell.remove(); applyColumns() }
function resetColumns() { if (activeStorageKey) localStorage.removeItem(activeStorageKey); columns.value = []; initialiseColumns() }
function openColumns() { columnSearch.value = ''; columnsOpen.value = true; nextTick(initialiseColumns) }
function closeColumns() { persistColumns(); columnsOpen.value = false }
function exportConfiguration() {
  return { columns: columns.value.filter(column => column.visible && !column.isSelection && normalizedLabel(column.originalLabel) !== 'actions').map(column => {
    const option = props.availableColumns.find(item => item.key === column.sourceKey)
    return { label: column.label || column.originalLabel, originalLabel: column.originalLabel, custom: column.custom, sourceKey: column.sourceKey, defaultValue: column.defaultValue, value: option?.value, format: option?.format }
  }) }
}
function selectSort(key) { props.controller?.setSort?.(key, 'asc'); nextTick(updateSortIndicators) }
function setSortDirection(direction) { if (controllerSortKey.value) props.controller?.setSort?.(controllerSortKey.value, direction); nextTick(updateSortIndicators) }
function installViewportLayout() {
  if (!props.fillViewport || !table) return
  root.value?.parentElement?.classList.add('listing-card')
  table.parentElement?.classList.add('listing-table-scroll')
  table.querySelector('thead')?.classList.add('listing-table-head')
}
function handleOutsidePointer(event) {
  if (sortOpen.value && !sortMenu.value?.contains(event.target)) sortOpen.value = false
}
watch(() => [props.page, props.pageSize, props.filtered, props.rows, controllerSortKey.value, controllerSortDirection.value], () => nextTick(() => { table = findTable(); applyColumns(false) }), { deep: true })
onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer)
  nextTick(initialiseColumns)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', handleOutsidePointer))
</script>
