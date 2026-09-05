<template>
  <div>
    <PageHeader title="Passbook" subtitle="Client and vendor ledger with running balance." />

    <!-- Tabs -->
    <AppTabs v-model="tab" :tabs="[{ id: 'client', label: 'Clients' }, { id: 'vendor', label: 'Vendors' }]" class="mb-5" />

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[200px] flex-1">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ tab === 'client' ? 'Select Client' : 'Select Vendor' }}</label>
          <SearchableSelect v-model="selectedId" :options="entities" secondary-key="companyName" allow-all all-label="All" all-value="all"
            :placeholder="tab === 'client' ? 'Search clients' : 'Search vendors'" @change="load" />
        </div>
        <DateRangeFilter
          v-model:preset="filters.period"
          v-model:from="filters.from"
          v-model:to="filters.to"
          @change="load"
        />
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
          <select v-model="filters.type" :class="INP" @change="load">
            <option value="">All</option>
            <option value="debit">Debit only</option>
            <option value="credit">Credit only</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      Loading passbook…
    </div>

    <template v-if="data && !loading">
      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)]">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style="--listing-offset: 315px">
        <TableControls
          :controller="passbookTable"
          :key="tab"
          :table-key="`passbook-${tab}`"
          v-model:search="passbookTable.search.value"
          v-model:page="passbookTable.page.value"
          v-model:page-size="passbookTable.pageSize.value"
          :page-size-options="passbookTable.pageSizeOptions"
          :total="passbookTable.total.value"
          :filtered="passbookTable.filtered.value"
          :start="passbookTable.start.value"
          :end="passbookTable.end.value"
          :rows="passbookTable.rows.value"
          :available-columns="[{ key: 'entityName', label: tab === 'client' ? 'Client' : 'Vendor' }, { key: 'bookingVersion', label: 'Booking version' }, { key: 'bookingDestination', label: 'Booking destination' }, { key: 'sourceType', label: 'Source type' }, { key: 'sourceId', label: 'Source ID' }]"
          :active-filters="passbookActiveFilters"
          exportable
          search-placeholder="Search transactions, refs..."
          @export="passbookExport.exportXls"
          @remove-filter="removePassbookFilter"
        />
        <div class="overflow-x-auto">
          <table :key="tab" class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ tab === 'client' ? 'Client' : 'Vendor' }}</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking ID</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Title</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-if="data.openingBalance !== 0" class="bg-blue-50/40">
                <td colspan="9" class="px-4 py-2.5 text-xs text-gray-500 italic">Opening Balance</td>
                <td class="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{{ fmt(data.openingBalance) }}</td>
              </tr>
              <tr v-for="row in passbookTable.rows.value" :key="row.id + row.type" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(row.date) }}</td>
                <td class="px-4 py-3 text-gray-700 font-medium">{{ row.entityName }}</td>
                <td class="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap">{{ row.bookingNumber || '—' }}</td>
                <td class="px-4 py-3 text-gray-700 max-w-[220px] truncate" :title="row.bookingTitle || ''">{{ row.bookingTitle || '—' }}</td>
                <td class="px-4 py-3">
                  <span :class="row.type === 'INVOICE' || row.type === 'BILL' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ row.type }}</span>
                </td>
                <td class="px-4 py-3 text-gray-700 max-w-[250px] truncate">{{ row.description }}</td>
                <td class="px-4 py-3 text-gray-400 text-xs">{{ row.ref || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-medium" :class="row.debit ? 'text-red-600' : 'text-gray-300'">{{ row.debit ? fmt(row.debit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-medium" :class="row.credit ? 'text-green-600' : 'text-gray-300'">{{ row.credit ? fmt(row.credit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold" :class="row.balance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(row.balance) }}</td>
              </tr>
              <tr v-if="!passbookTable.filtered.value">
                <td colspan="10" class="px-4 py-10 text-center text-gray-400">No transactions found for the selected filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <aside class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm xl:sticky xl:top-5">
        <header class="bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4 text-white"><h2 class="font-semibold">Passbook Summary</h2><p class="mt-0.5 text-xs text-indigo-100">{{ selectedEntityLabel }}</p></header>
        <dl class="space-y-4 p-5 text-sm">
          <div class="flex items-center justify-between gap-3"><dt class="text-gray-500">Opening balance</dt><dd class="font-semibold text-gray-900 tabular-nums">{{ fmt(data.openingBalance) }}</dd></div>
          <div class="flex items-center justify-between gap-3"><dt class="text-gray-500">Total debit</dt><dd class="font-semibold text-red-600 tabular-nums">{{ fmt(data.totalDebit) }}</dd></div>
          <div class="flex items-center justify-between gap-3"><dt class="text-gray-500">Total credit</dt><dd class="font-semibold text-green-600 tabular-nums">{{ fmt(data.totalCredit) }}</dd></div>
          <div class="flex items-center justify-between gap-3 border-t border-gray-200 pt-4"><dt class="font-semibold text-gray-700">Closing balance</dt><dd class="text-lg font-bold tabular-nums" :class="data.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(data.closingBalance) }}</dd></div>
        </dl>
      </aside>
      </div>
    </template>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatDate } = useDateTime()
const { formatMoney } = useMoney()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
const tab = ref('client')
const selectedId = ref('all')
const entities = ref([])
const data = ref(null)
const loading = ref(false)
const filters = reactive({ period: 'all', from: '', to: '', type: '' })
const ledgerRows = computed(() => data.value?.rows || [])
const passbookTable = useTableControls(ledgerRows, {
  searchFields: ['type', 'description', 'ref', 'bookingNumber', 'bookingTitle', 'bookingDestination', (row) => fmtDate(row.date)],
})
const passbookActiveFilters = computed(() => {
  const chips = []
  if (selectedId.value !== 'all') chips.push({ key: 'entity', label: `${tab.value === 'client' ? 'Client' : 'Vendor'}: ${selectedEntityLabel.value}` })
  const period = periodLabel(filters)
  if (period) chips.push({ key: 'period', label: period })
  if (filters.type) chips.push({ key: 'type', label: `Type: ${filters.type === 'debit' ? 'Debit only' : 'Credit only'}` })
  return chips
})
const selectedEntityLabel = computed(() => selectedId.value === 'all' ? `All ${tab.value === 'client' ? 'clients' : 'vendors'}` : entities.value.find(item => Number(item.id) === Number(selectedId.value))?.name || String(selectedId.value))

const fmt = (v) => formatMoney(v)
const fmtDate = formatDate
const { periodLabel } = useFilterLabels()
const passbookExport = useListingSelection(passbookTable, [
  { key: 'date', label: 'Date', type: 'date', sortValue: row => row.date, field: row => fmtDate(row.date) },
  { key: 'entityName', label: 'Party', field: 'entityName' },
  { key: 'bookingNumber', label: 'Booking ID', field: 'bookingNumber' },
  { key: 'bookingTitle', label: 'Booking Title', field: 'bookingTitle' },
  { key: 'type', label: 'Type', field: 'type' },
  { key: 'description', label: 'Description', field: 'description' },
  { key: 'ref', label: 'Ref', field: 'ref' },
  { key: 'debit', label: 'Debit', type: 'number', field: row => row.debit ? fmt(row.debit) : '' },
  { key: 'credit', label: 'Credit', type: 'number', field: row => row.credit ? fmt(row.credit) : '' },
  { key: 'balance', label: 'Balance', type: 'number', field: row => fmt(row.balance) },
], 'passbook')

function reset() { selectedId.value = 'all'; data.value = null }
function removePassbookFilter(key) {
  if (key === 'entity') selectedId.value = 'all'
  if (key === 'period') Object.assign(filters, { period: 'all', from: '', to: '' })
  if (key === 'type') filters.type = ''
  load()
}

async function loadEntities() {
  entities.value = tab.value === 'client'
    ? await request('/passbook/clients')
    : await request('/passbook/vendors')
}

async function load() {
  if (!selectedId.value) { data.value = null; return }
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filters.from) params.append('from', filters.from)
    if (filters.to) params.append('to', filters.to)
    if (filters.type) params.append('type', filters.type)
    const qs = params.toString() ? '?' + params.toString() : ''
    data.value = tab.value === 'client'
      ? await request(`/passbook/client/${selectedId.value}${qs}`)
      : await request(`/passbook/vendor/${selectedId.value}${qs}`)
  } finally {
    loading.value = false
  }
}

watch(tab, async () => { reset(); await loadEntities(); await load() })
onMounted(async () => { await loadEntities(); await load() })
</script>
