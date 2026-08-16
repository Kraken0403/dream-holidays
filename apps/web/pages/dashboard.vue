<template>
  <div>
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-gray-900">Dashboard</h1>
      <p class="text-sm text-gray-500 mt-1">Financial overview — sales, margins, receivables and payables.</p>
    </div>

    <div class="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <DateRangeFilter
          v-model:preset="filters.period"
          v-model:from="filters.from"
          v-model:to="filters.to"
        />
        <button type="button" class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700" @click="load">
          Refresh overview
        </button>
      </div>
    </div>

    <!-- Primary KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard label="Booking Sales"    :value="fmt(data.bookingSale)"     icon="currency" color="blue" />
      <KpiCard label="Vendor Cost"      :value="fmt(data.bookingCost)"     icon="truck"    color="orange" />
      <KpiCard label="Expected Margin"  :value="fmt(data.expectedMargin)"  icon="trend"    color="green" />
      <KpiCard label="Invoice Sales"    :value="fmt(data.invoiceSales)"    icon="doc"      color="purple" />
    </div>

    <!-- Cash flow row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <KpiCard label="Client Received"  :value="fmt(data.clientReceived)"  icon="in"       color="green" />
      <KpiCard label="Vendor Paid"      :value="fmt(data.vendorPaid)"      icon="out"      color="red" />
      <KpiCard label="Receivable"       :value="fmt(data.receivable)"      icon="clock"    color="yellow" />
      <KpiCard label="Payable"          :value="fmt(data.payable)"         icon="clock"    color="yellow" />
    </div>

    <!-- Net cash position -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">Net Cash Position</p>
          <p class="text-3xl font-bold mt-1" :class="(data.netCashPosition || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
            {{ fmt(data.netCashPosition) }}
          </p>
          <p class="text-xs text-gray-400 mt-1">Client received − Vendor paid</p>
        </div>
        <div class="w-14 h-14 rounded-xl flex items-center justify-center" :class="(data.netCashPosition || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'">
          <svg class="w-7 h-7" :class="(data.netCashPosition || 0) >= 0 ? 'text-green-600' : 'text-red-600'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Count row -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
        <div class="text-3xl font-bold text-gray-900">{{ data.bookingCount || 0 }}</div>
        <div class="text-sm text-gray-500 mt-1">My Bookings</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
        <div class="text-3xl font-bold text-gray-900">{{ data.invoiceCount || 0 }}</div>
        <div class="text-sm text-gray-500 mt-1">Invoices</div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 text-center">
        <div class="text-3xl font-bold text-gray-900">{{ data.vendorBillCount || 0 }}</div>
        <div class="text-sm text-gray-500 mt-1">Vendor Bills</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const data = ref({})
const filters = reactive({ period: 'all', from: '', to: '' })
const fmt = (v) => formatMoney(v || 0)
async function load() {
  const qs = new URLSearchParams()
  if (filters.from) qs.append('from', filters.from)
  if (filters.to) qs.append('to', filters.to)
  data.value = await request(`/reports/dashboard${qs.toString() ? '?' + qs : ''}`)
}
onMounted(load)
</script>
