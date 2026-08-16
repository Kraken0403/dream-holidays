<template>
  <div class="border-b border-gray-200 bg-white">
    <div v-if="selectedCount" class="flex min-h-[52px] flex-wrap items-center gap-2 border-b border-blue-100 bg-blue-50 px-3 py-2">
      <span class="inline-flex h-8 items-center rounded-full bg-blue-600 px-3 text-xs font-semibold text-white">{{ selectedCount }} selected</span>
      <slot name="selected-actions" />
      <button v-if="exportable" type="button" @click="$emit('export')" class="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-100">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19.5h14"/></svg>
        Export selected
      </button>
      <button type="button" @click="$emit('clear-selection')" class="ml-auto inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-gray-600 hover:bg-white hover:text-gray-900">Clear selection</button>
    </div>
    <div v-else class="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div v-if="showSearch" class="relative w-full sm:w-72">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
          </svg>
          <input :value="search" type="search" :placeholder="searchPlaceholder"
            class="h-9 w-full rounded-full border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            @input="$emit('update:search', $event.target.value)" />
        </div>
        <button v-if="hasFilters" type="button" @click="filtersOpen = !filtersOpen"
          class="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors"
          :class="filtersOpen ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4.5h18M6.75 9.75h10.5m-7.5 5.25h4.5"/></svg>
          Filters<span v-if="filterCount" class="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">{{ filterCount }}</span>
        </button>
        <button v-if="exportable" type="button" :disabled="!filtered" @click="$emit('export')"
          class="inline-flex h-9 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19.5h14"/></svg>
          Export XLS<span v-if="selectedCount">({{ selectedCount }})</span>
        </button>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span class="whitespace-nowrap">{{ resultLabel }}</span>
        <select :value="pageSize" aria-label="Rows per page" class="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs outline-none focus:border-blue-500" @change="$emit('update:pageSize', Number($event.target.value))">
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} / page</option>
        </select>
        <button type="button" title="Previous page" :disabled="page <= 1" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40" @click="$emit('update:page', page - 1)">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="min-w-[42px] text-center font-medium text-gray-700">{{ page }}/{{ pageCount }}</span>
        <button type="button" title="Next page" :disabled="page >= pageCount" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 hover:bg-gray-50 disabled:opacity-40" @click="$emit('update:page', page + 1)">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
    <div v-if="hasFilters && filtersOpen" class="flex flex-wrap items-end gap-2 border-t border-gray-100 bg-gray-50/70 px-3 py-2.5 text-xs [&_input]:h-9 [&_input]:py-1.5 [&_label]:mb-1 [&_label]:text-[11px] [&_select]:h-9 [&_select]:py-1.5">
      <slot name="filters" />
    </div>
  </div>
</template>

<script setup>
const slots = useSlots()
const props = defineProps({
  search: { type: String, default: '' }, page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 },
  pageSizeOptions: { type: Array, default: () => [10, 25, 50, 100] }, total: { type: Number, default: 0 },
  filtered: { type: Number, default: 0 }, start: { type: Number, default: 0 }, end: { type: Number, default: 0 },
  searchPlaceholder: { type: String, default: 'Search...' }, showSearch: { type: Boolean, default: true },
  exportable: { type: Boolean, default: false }, selectedCount: { type: Number, default: 0 }, filterCount: { type: Number, default: 0 },
})
defineEmits(['update:search', 'update:page', 'update:pageSize', 'export', 'clear-selection'])
const filtersOpen = ref(false)
const hasFilters = computed(() => Boolean(slots.filters))
const pageCount = computed(() => Math.max(Math.ceil(props.filtered / Number(props.pageSize || 1)), 1))
const resultLabel = computed(() => {
  if (!props.total) return 'No results'
  if (!props.filtered) return `No matches · ${props.total} total`
  return `${props.start}-${props.end} of ${props.filtered}${props.filtered === props.total ? '' : ` · ${props.total} total`}`
})
</script>
