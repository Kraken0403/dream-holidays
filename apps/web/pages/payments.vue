<template>
  <div>
    <PageHeader title="Payment Tracking" subtitle="Aging analysis - outstanding receivables and payables." />

    <AppTabs v-model="tab" :tabs="[{ id: 'receivables', label: 'Receivables' }, { id: 'payables', label: 'Payables' }]" class="mb-5" />

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      Loading...
    </div>

    <template v-if="!loading && data">
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div v-for="b in data.buckets" :key="b.key" class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium uppercase tracking-wide" :class="b.key === 'CURRENT' ? 'text-gray-500' : 'text-red-500'">{{ b.label }}</p>
          <p class="text-xl font-bold mt-1 tabular-nums" :class="b.key !== 'CURRENT' ? 'text-red-600' : 'text-gray-900'">{{ fmt(b.total) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ (tab === 'receivables' ? b.invoices : b.bills).length }} item(s)</p>
        </div>
        <div class="bg-blue-600 rounded-xl shadow-sm p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-blue-200">Total Outstanding</p>
          <p class="text-xl font-bold mt-1 text-white tabular-nums">{{ fmt(data.grandTotal) }}</p>
        </div>
      </div>

      <div v-if="agingRows.length" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TableControls
          :controller="agingTable"
          v-model:search="agingTable.search.value"
          v-model:page="agingTable.page.value"
          v-model:page-size="agingTable.pageSize.value"
          :page-size-options="agingTable.pageSizeOptions"
          :total="agingTable.total.value"
          :filtered="agingTable.filtered.value"
          :start="agingTable.start.value"
          :end="agingTable.end.value"
          :rows="agingTable.rows.value"
          :available-columns="[{ key: 'status', label: 'Status' }, { key: 'client.companyName', label: 'Client company' }, { key: 'vendor.email', label: 'Vendor email' }, { key: 'createdAt', label: 'Created at' }]"
          exportable
          :selected-count="agingSelection.selectedCount.value"
          :filter-count="[bucketFilter, paymentFilters.from, paymentFilters.to].filter(Boolean).length"
          :active-filters="paymentActiveFilters"
          :search-placeholder="tab === 'receivables' ? 'Search invoices, clients...' : 'Search bills, vendors...'"
          @export="agingSelection.exportXls"
          @clear-selection="agingSelection.clear"
          @remove-filter="removePaymentFilter"
        >
          <template #filters>
            <div class="w-full sm:w-44">
              <label class="block text-xs font-medium text-gray-600 mb-1.5">Bucket</label>
              <select v-model="bucketFilter" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                <option v-for="bucket in activeBuckets" :key="bucket.key" :value="bucket.key">{{ bucket.label }}</option>
              </select>
            </div>
            <DateRangeFilter v-model:preset="paymentFilters.period" v-model:from="paymentFilters.from" v-model:to="paymentFilters.to" />
          </template>
        </TableControls>

        <div class="overflow-x-auto">
          <table v-if="tab === 'receivables'" class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="agingSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="agingSelection.togglePage" /></th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bucket</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="inv in agingTable.rows.value" :key="inv.id" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${inv.invoiceNumber}`" :checked="agingSelection.isSelected(inv)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="agingSelection.toggle(inv)" /></td>
                <td class="px-4 py-3"><span :class="bucketClass(inv.bucketKey)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">{{ inv.bucketLabel }}</span></td>
                <td class="px-4 py-3 font-semibold text-blue-600">{{ inv.invoiceNumber }}</td>
                <td class="px-4 py-3"><div class="text-gray-800">{{ inv.client?.name }}</div><div class="text-xs text-gray-400">{{ inv.client?.companyName }}</div></td>
                <td class="px-4 py-3 text-gray-600">{{ fmtDate(inv.invoiceDate) }}</td>
                <td class="px-4 py-3" :class="isPastDue(inv.dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'">{{ inv.dueDate ? fmtDate(inv.dueDate) : '-' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(inv.grandTotal) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-red-600">{{ fmt(inv.outstanding) }}</td>
              </tr>
              <tr v-if="!agingTable.filtered.value"><td colspan="8" class="px-4 py-10 text-center text-gray-400">No receivables found.</td></tr>
            </tbody>
          </table>

          <table v-else class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="agingSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="agingSelection.togglePage" /></th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bucket</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill #</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="bill in agingTable.rows.value" :key="bill.id" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${bill.billNumber}`" :checked="agingSelection.isSelected(bill)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="agingSelection.toggle(bill)" /></td>
                <td class="px-4 py-3"><span :class="bucketClass(bill.bucketKey)" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">{{ bill.bucketLabel }}</span></td>
                <td class="px-4 py-3 font-semibold text-gray-900">{{ bill.billNumber }}</td>
                <td class="px-4 py-3 text-gray-700">{{ bill.vendor?.name }}</td>
                <td class="px-4 py-3 text-gray-600">{{ fmtDate(bill.billDate) }}</td>
                <td class="px-4 py-3" :class="isPastDue(bill.dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'">{{ bill.dueDate ? fmtDate(bill.dueDate) : '-' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(bill.grandTotal) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-red-600">{{ fmt(bill.outstanding) }}</td>
              </tr>
              <tr v-if="!agingTable.filtered.value"><td colspan="8" class="px-4 py-10 text-center text-gray-400">No payables found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="data.grandTotal === 0" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
        No outstanding {{ tab === 'receivables' ? 'receivables' : 'payables' }}.
      </div>
    </template>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const { formatDate, todayInput } = useDateTime()
const tab = ref('receivables')
const data = ref(null)
const loading = ref(false)
const bucketFilter = ref('')
const paymentFilters = reactive({ period: 'all', from: '', to: '' })
const fmt = (v) => formatMoney(v)
const fmtDate = formatDate
const isPastDue = (d) => d && String(d).slice(0, 10) < todayInput()

const agingRows = computed(() => {
  if (!data.value) return []
  return data.value.buckets.flatMap((bucket) => {
    const rows = tab.value === 'receivables' ? bucket.invoices : bucket.bills
    return rows.map((row) => ({ ...row, bucketKey: bucket.key, bucketLabel: bucket.label }))
  })
})

const activeBuckets = computed(() => {
  if (!data.value) return []
  return data.value.buckets.filter((bucket) => (tab.value === 'receivables' ? bucket.invoices : bucket.bills).length > 0)
})

const filteredAgingRows = computed(() => {
  return agingRows.value.filter((row) => {
    if (bucketFilter.value && row.bucketKey !== bucketFilter.value) return false
    const date = String(row.invoiceDate || row.billDate || '').slice(0, 10)
    if (paymentFilters.from && date < paymentFilters.from) return false
    if (paymentFilters.to && date > paymentFilters.to) return false
    return true
  })
})
const paymentActiveFilters = computed(() => {
  const chips = []
  if (bucketFilter.value) chips.push({ key: 'bucket', label: `Status: ${activeBuckets.value.find(item => item.key === bucketFilter.value)?.label || bucketFilter.value}` })
  if (paymentFilters.from || paymentFilters.to) chips.push({ key: 'period', label: `Period: ${paymentFilters.from ? fmtDate(paymentFilters.from) : 'Start'} - ${paymentFilters.to ? fmtDate(paymentFilters.to) : 'Today'}` })
  return chips
})

const agingTable = useTableControls(filteredAgingRows, {
  searchFields: [
    'bucketLabel',
    'invoiceNumber',
    'billNumber',
    'client.name',
    'client.companyName',
    'vendor.name',
    (row) => fmtDate(row.invoiceDate || row.billDate),
    (row) => fmtDate(row.dueDate),
  ],
})
const agingSelection = useListingSelection(agingTable, [
  { label: 'Bucket', field: 'bucketLabel' }, { label: 'Reference', field: (row) => row.invoiceNumber || row.billNumber },
  { label: 'Party', field: (row) => row.client?.name || row.vendor?.name }, { label: 'Date', field: (row) => fmtDate(row.invoiceDate || row.billDate) },
  { label: 'Due Date', field: (row) => fmtDate(row.dueDate) }, { label: 'Total', field: (row) => fmt(row.grandTotal) }, { label: 'Outstanding', field: (row) => fmt(row.outstanding) },
], 'payment-tracking')

function bucketClass(key) {
  if (key === 'CURRENT') return 'bg-green-100 text-green-700'
  if (key === '1_30') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}
function removePaymentFilter(key) {
  if (key === 'bucket') bucketFilter.value = ''
  if (key === 'period') Object.assign(paymentFilters, { period: 'all', from: '', to: '' })
}

async function load() {
  loading.value = true
  data.value = null
  try {
    data.value = tab.value === 'receivables'
      ? await request('/reports/aging/receivables')
      : await request('/reports/aging/payables')
  } finally {
    loading.value = false
  }
}

watch(tab, () => {
  bucketFilter.value = ''
  Object.assign(paymentFilters, { period: 'all', from: '', to: '' })
  agingTable.reset()
  load()
})

onMounted(load)
</script>
