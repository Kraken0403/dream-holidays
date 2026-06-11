<template>
  <div>
    <PageHeader title="Payment Tracking" subtitle="Aging analysis — outstanding receivables and payables." />

    <!-- Tabs -->
    <div class="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        v-for="t in [{ id: 'receivables', label: 'Receivables' }, { id: 'payables', label: 'Payables' }]"
        :key="t.id"
        @click="tab = t.id"
        :class="tab === t.id ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-md text-sm transition-all"
      >{{ t.label }}</button>
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <div class="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
      Loading…
    </div>

    <template v-if="!loading && data">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div v-for="b in data.buckets" :key="b.key"
          class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium uppercase tracking-wide" :class="b.key === 'CURRENT' ? 'text-gray-500' : 'text-red-500'">{{ b.label }}</p>
          <p class="text-xl font-bold mt-1 tabular-nums" :class="b.key !== 'CURRENT' ? 'text-red-600' : 'text-gray-900'">{{ fmt(b.total) }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ (tab === 'receivables' ? b.invoices : b.bills).length }} item(s)</p>
        </div>
        <div class="bg-blue-600 rounded-xl shadow-sm p-4">
          <p class="text-xs font-medium uppercase tracking-wide text-blue-200">Total Outstanding</p>
          <p class="text-xl font-bold mt-1 text-white tabular-nums">{{ fmt(data.grandTotal) }}</p>
        </div>
      </div>

      <!-- Detail tables per bucket -->
      <div v-for="b in data.buckets.filter(x => (tab === 'receivables' ? x.invoices : x.bills).length > 0)" :key="b.key" class="mb-5">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="font-semibold text-gray-900">{{ b.label }}</h3>
          <span :class="b.key === 'CURRENT' ? 'bg-green-100 text-green-700' : b.key === '1_30' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'"
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">
            {{ fmt(b.total) }}
          </span>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table v-if="tab === 'receivables'" class="w-full text-sm">
              <thead><tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="inv in b.invoices" :key="inv.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-semibold text-blue-600">{{ inv.invoiceNumber }}</td>
                  <td class="px-4 py-3"><div class="text-gray-800">{{ inv.client?.name }}</div><div class="text-xs text-gray-400">{{ inv.client?.companyName }}</div></td>
                  <td class="px-4 py-3 text-gray-600">{{ fmtDate(inv.invoiceDate) }}</td>
                  <td class="px-4 py-3" :class="isPastDue(inv.dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'">{{ inv.dueDate ? fmtDate(inv.dueDate) : '—' }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(inv.grandTotal) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold text-red-600">{{ fmt(inv.outstanding) }}</td>
                </tr>
              </tbody>
            </table>
            <table v-else class="w-full text-sm">
              <thead><tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill #</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="bill in b.bills" :key="bill.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-semibold text-gray-900">{{ bill.billNumber }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ bill.vendor?.name }}</td>
                  <td class="px-4 py-3 text-gray-600">{{ fmtDate(bill.billDate) }}</td>
                  <td class="px-4 py-3" :class="isPastDue(bill.dueDate) ? 'text-red-600 font-medium' : 'text-gray-600'">{{ bill.dueDate ? fmtDate(bill.dueDate) : '—' }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(bill.grandTotal) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold text-red-600">{{ fmt(bill.outstanding) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
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
const tab = ref('receivables')
const data = ref(null)
const loading = ref(false)
const fmt = (v) => formatMoney(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const isPastDue = (d) => d && new Date(d) < new Date()

async function load() {
  loading.value = true; data.value = null
  try {
    data.value = tab.value === 'receivables'
      ? await request('/reports/aging/receivables')
      : await request('/reports/aging/payables')
  } finally { loading.value = false }
}

watch(tab, load)
onMounted(load)
</script>
