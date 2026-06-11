<template>
  <div>
    <PageHeader title="Passbook" subtitle="Client and vendor ledger with running balance.">
      <template #actions>
        <button v-if="data" @click="exportCsv"
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Export CSV
        </button>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        v-for="t in [{ id: 'client', label: 'Clients' }, { id: 'vendor', label: 'Vendors' }]"
        :key="t.id"
        @click="tab = t.id; reset()"
        :class="tab === t.id ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-md text-sm transition-all"
      >{{ t.label }}</button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-[200px] flex-1">
          <label class="block text-xs font-medium text-gray-600 mb-1.5">{{ tab === 'client' ? 'Select Client' : 'Select Vendor' }}</label>
          <select v-model="selectedId" :class="INP" @change="load">
            <option value="">— Select —</option>
            <option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}{{ e.companyName ? ' (' + e.companyName + ')' : '' }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">From</label>
          <input v-model="filters.from" type="date" :class="INP" @change="load" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1.5">To</label>
          <input v-model="filters.to" type="date" :class="INP" @change="load" />
        </div>
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

    <!-- Empty state -->
    <div v-if="!selectedId && !loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-200" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
      Select a {{ tab === 'client' ? 'client' : 'vendor' }} to view their passbook.
    </div>

    <template v-if="data && !loading">
      <!-- KPI row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening Balance</p>
          <p class="text-xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(data.openingBalance) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Debit</p>
          <p class="text-xl font-bold text-red-600 mt-1 tabular-nums">{{ fmt(data.totalDebit) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Credit</p>
          <p class="text-xl font-bold text-green-600 mt-1 tabular-nums">{{ fmt(data.totalCredit) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Closing Balance</p>
          <p class="text-xl font-bold mt-1 tabular-nums" :class="data.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(data.closingBalance) }}</p>
        </div>
      </div>

      <!-- Ledger table -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
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
                <td colspan="6" class="px-4 py-2.5 text-xs text-gray-500 italic">Opening Balance</td>
                <td class="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{{ fmt(data.openingBalance) }}</td>
              </tr>
              <tr v-for="row in data.rows" :key="row.id + row.type" class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(row.date) }}</td>
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
              <tr v-if="!data.rows.length">
                <td colspan="7" class="px-4 py-10 text-center text-gray-400">No transactions found for the selected filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
const tab = ref('client')
const selectedId = ref('')
const entities = ref([])
const data = ref(null)
const loading = ref(false)
const filters = reactive({ from: '', to: '', type: '' })

const fmt = (v) => formatMoney(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function reset() { selectedId.value = ''; data.value = null }

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

function exportCsv() {
  if (!data.value) return
  const rows = data.value.rows
  const header = ['Date', 'Type', 'Description', 'Ref', 'Debit', 'Credit', 'Balance']
  const lines = [header.join(','), ...rows.map(r => [fmtDate(r.date), r.type, `"${r.description}"`, r.ref || '', r.debit || '', r.credit || '', r.balance].join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `passbook-${tab.value}-${selectedId.value}-${Date.now()}.csv`
  a.click()
}

watch(tab, () => { loadEntities(); reset() })
onMounted(loadEntities)
</script>
