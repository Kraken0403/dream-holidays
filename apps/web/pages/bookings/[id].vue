<template>
  <div>
    <!-- Breadcrumb + actions -->
    <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/bookings" class="hover:text-blue-600 transition-colors">Bookings</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          <span class="text-gray-700 font-medium">{{ booking?.bookingNumber || 'Loading…' }}</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">{{ booking?.title || '…' }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ booking?.client?.name }}</p>
      </div>
      <div class="flex items-center gap-2 flex-wrap" v-if="booking">
        <span :class="statusClass(booking.status)" class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold">{{ booking.status }}</span>
        <button type="button" @click="createInvoice"
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
          Generate Invoice
        </button>
        <button type="button" @click="createVendorBills"
          class="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>
          Generate Vendor Bills
        </button>
      </div>
    </div>

    <div v-if="!booking" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-3 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Loading booking…
    </div>

    <template v-if="booking">
      <!-- KPI row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Sale Amount</p>
          <p class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(booking.totalSaleAmount) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor Cost</p>
          <p class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(booking.totalVendorCost) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Margin</p>
          <p class="text-2xl font-bold mt-1 tabular-nums" :class="Number(booking.grossMargin) >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(booking.grossMargin) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Destination</p>
          <p class="text-lg font-semibold text-gray-900 mt-1 truncate">{{ booking.destination || '—' }}</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ dateOnly(booking.travelStartDate) }} → {{ dateOnly(booking.travelEndDate) }}</p>
        </div>
      </div>

      <!-- Service items -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">Service Items</h2>
          <span class="text-sm text-gray-500">{{ booking.serviceItems?.length || 0 }} items</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="item in booking.serviceItems || []" :key="item.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-700">
                  <span class="text-xs text-gray-400">{{ item.category?.parent?.name ? item.category.parent.name + ' / ' : '' }}</span>
                  <span class="font-medium">{{ item.category?.name }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ item.description }}</td>
                <td class="px-4 py-3 text-gray-600">{{ item.vendor?.name || '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(item.saleTotal) }}</td>
                <td class="px-4 py-3 text-right text-gray-500 tabular-nums">{{ fmt(item.vendorTotal) }}</td>
                <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(item.margin) >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(item.margin) }}</td>
              </tr>
              <tr v-if="!booking.serviceItems?.length">
                <td colspan="6" class="px-4 py-8 text-center text-gray-400">No service items.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Invoices + Vendor Bills side by side -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">Invoices</h2>
          </div>
          <table class="w-full text-sm">
            <thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th></tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="i in booking.invoices || []" :key="i.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-800">{{ i.invoiceNumber }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(i.grandTotal) }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold" :class="Number(i.outstandingAmount) > 0 ? 'text-orange-600' : 'text-green-600'">{{ fmt(i.outstandingAmount) }}</td>
              </tr>
              <tr v-if="!booking.invoices?.length"><td colspan="3" class="px-4 py-6 text-center text-gray-400 text-sm">No invoices generated yet.</td></tr>
            </tbody>
          </table>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100">
            <h2 class="font-semibold text-gray-900">Vendor Bills</h2>
          </div>
          <table class="w-full text-sm">
            <thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill #</th><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th></tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="v in booking.vendorBills || []" :key="v.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-medium text-gray-800">{{ v.billNumber }}</td>
                <td class="px-4 py-3 text-gray-600">{{ v.vendor?.name }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold" :class="Number(v.outstandingAmount) > 0 ? 'text-orange-600' : 'text-green-600'">{{ fmt(v.outstandingAmount) }}</td>
              </tr>
              <tr v-if="!booking.vendorBills?.length"><td colspan="3" class="px-4 py-6 text-center text-gray-400 text-sm">No vendor bills yet.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const route = useRoute()
const { request } = useApi()
const { formatMoney } = useMoney()
const booking = ref(null)
const fmt = (v) => formatMoney(v || 0)
const dateOnly = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function statusClass(s) {
  const map = { DRAFT: 'bg-gray-100 text-gray-700', CONFIRMED: 'bg-blue-100 text-blue-700', INVOICED: 'bg-purple-100 text-purple-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
  return map[s] || 'bg-gray-100 text-gray-600'
}

async function load() { booking.value = await request(`/bookings/${route.params.id}`) }
async function createInvoice() { await request(`/invoices/from-booking/${route.params.id}`, { method: 'POST', body: {} }); await load() }
async function createVendorBills() { await request(`/vendor-payables/from-booking/${route.params.id}`, { method: 'POST' }); await load() }
onMounted(load)
</script>
