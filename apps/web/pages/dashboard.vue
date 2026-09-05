<template>
  <div class="space-y-6">
    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg>
            </span>
            <div>
              <h1 class="text-lg font-bold tracking-tight text-slate-900">Business Dashboard</h1>
              <p class="mt-0.5 text-xs text-slate-500">Bookings, cash movement and accounting health in one view.</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
          <DateRangeFilter v-model:preset="filters.period" v-model:from="filters.from" v-model:to="filters.to" />
          <button type="button" :disabled="loading" class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60" @click="load">
            <svg class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 6v5h-5M4 18v-5h5M18.5 9A7 7 0 0 0 6 6.5L4 9m2 6a7 7 0 0 0 12 2.5L20 15"/></svg>
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
        </div>
      </div>

      <div class="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.85fr)]">
        <div class="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white sm:p-7">
          <div class="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10"></div>
          <div class="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-white/5"></div>
          <div class="relative">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">Booking performance</p>
                <p class="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{{ fmt(data.bookingSale) }}</p>
                <p class="mt-1 text-sm text-blue-100">Active booking value in the selected period</p>
              </div>
              <div class="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Expected margin</p>
                <p class="mt-1 text-xl font-bold">{{ fmt(data.expectedMargin) }}</p>
                <p class="mt-1 text-xs font-semibold" :class="marginPct >= 0 ? 'text-emerald-200' : 'text-red-200'">{{ marginPct.toFixed(1) }}% margin</p>
              </div>
            </div>

            <div class="mt-7 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm"><p class="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Vendor cost</p><p class="mt-1.5 text-lg font-bold">{{ fmt(data.bookingCost) }}</p></div>
              <div class="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm"><p class="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Invoice sales</p><p class="mt-1.5 text-lg font-bold">{{ fmt(data.invoiceSales) }}</p></div>
              <div class="rounded-xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-sm"><p class="text-[10px] font-semibold uppercase tracking-wide text-blue-100">Net cash</p><p class="mt-1.5 text-lg font-bold" :class="Number(data.netCashPosition || 0) >= 0 ? 'text-emerald-200' : 'text-red-200'">{{ fmt(data.netCashPosition) }}</p></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-px bg-slate-200">
          <NuxtLink to="/invoices" class="group bg-white p-5 transition hover:bg-blue-50/50">
            <div class="flex items-center justify-between"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16v12H4zM8 4h8v3M8 12h8"/></svg></span><svg class="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m9 18 6-6-6-6"/></svg></div>
            <p class="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Receivable</p><p class="mt-1 text-xl font-bold text-slate-900">{{ fmt(data.receivable) }}</p><p class="mt-1 text-xs text-slate-500">Pending from clients</p>
          </NuxtLink>
          <NuxtLink to="/vendor-payables" class="group bg-white p-5 transition hover:bg-blue-50/50">
            <div class="flex items-center justify-between"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M3 7h18v12H3zM7 11h10M7 15h5"/></svg></span><svg class="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m9 18 6-6-6-6"/></svg></div>
            <p class="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Payable</p><p class="mt-1 text-xl font-bold text-slate-900">{{ fmt(data.payable) }}</p><p class="mt-1 text-xs text-slate-500">Pending to vendors</p>
          </NuxtLink>
          <div class="bg-white p-5"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M5 12h14m-7-7v14"/></svg></span><p class="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Client received</p><p class="mt-1 text-xl font-bold text-slate-900">{{ fmt(data.clientReceived) }}</p><p class="mt-1 text-xs text-slate-500">Cash inflow</p></div>
          <div class="bg-white p-5"><span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M5 12h14M12 5l7 7-7 7"/></svg></span><p class="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vendor paid</p><p class="mt-1 text-xl font-bold text-slate-900">{{ fmt(data.vendorPaid) }}</p><p class="mt-1 text-xs text-slate-500">Cash outflow</p></div>
        </div>
      </div>
    </section>

    <section class="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-sm font-bold text-slate-900">Revenue journey</p><p class="mt-0.5 text-xs text-slate-500">From booked value to invoices and collected cash.</p></div><span class="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">Commercial funnel</span></div>
        <div class="mt-5 space-y-5">
          <div><div class="mb-2 flex items-center justify-between gap-4"><div><p class="text-xs font-semibold text-slate-700">Booked sales</p><p class="text-[11px] text-slate-400">{{ data.bookingCount || 0 }} active booking(s)</p></div><p class="text-sm font-bold text-slate-900">{{ fmt(data.bookingSale) }}</p></div><div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full bg-blue-600" style="width:100%"></div></div></div>
          <div><div class="mb-2 flex items-center justify-between gap-4"><div><p class="text-xs font-semibold text-slate-700">Invoiced</p><p class="text-[11px] text-slate-400">{{ data.invoiceCount || 0 }} invoice(s) · {{ invoicedPct.toFixed(1) }}% of booking value</p></div><p class="text-sm font-bold text-slate-900">{{ fmt(data.invoiceSales) }}</p></div><div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full bg-indigo-500 transition-all" :style="{ width: `${invoicedPct}%` }"></div></div></div>
          <div><div class="mb-2 flex items-center justify-between gap-4"><div><p class="text-xs font-semibold text-slate-700">Collected</p><p class="text-[11px] text-slate-400">{{ collectedPct.toFixed(1) }}% of invoiced value</p></div><p class="text-sm font-bold text-slate-900">{{ fmt(data.clientReceived) }}</p></div><div class="h-2 rounded-full bg-slate-100"><div class="h-2 rounded-full bg-emerald-500 transition-all" :style="{ width: `${collectedPct}%` }"></div></div></div>
        </div>
        <div class="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div class="rounded-xl bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Working capital gap</p><p class="mt-1 text-base font-bold" :class="workingCapital >= 0 ? 'text-blue-700' : 'text-orange-600'">{{ fmt(workingCapital) }}</p></div>
          <div class="rounded-xl bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vendor paid ratio</p><p class="mt-1 text-base font-bold text-slate-900">{{ vendorPaidPct.toFixed(1) }}%</p></div>
          <div class="rounded-xl bg-slate-50 p-3"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-400">Gross margin</p><p class="mt-1 text-base font-bold" :class="marginPct >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ marginPct.toFixed(1) }}%</p></div>
        </div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between"><div><p class="text-sm font-bold text-slate-900">Booking pipeline</p><p class="mt-0.5 text-xs text-slate-500">Current non-cancelled booking stages.</p></div><NuxtLink to="/bookings" class="text-xs font-semibold text-blue-600 hover:text-blue-700">View all</NuxtLink></div>
        <div v-if="statusRows.length" class="mt-5 space-y-4">
          <div v-for="item in statusRows" :key="item.status">
            <div class="mb-1.5 flex items-center justify-between"><div class="flex min-w-0 items-center gap-2"><span class="h-2 w-2 rounded-full" :class="statusDotClass(item.status)"></span><span class="truncate text-xs font-semibold text-slate-700">{{ prettyStatus(item.status) }}</span></div><span class="text-xs font-bold text-slate-900">{{ item.count }}</span></div>
            <div class="h-1.5 rounded-full bg-slate-100"><div class="h-1.5 rounded-full bg-blue-500" :style="{ width: `${statusWidth(item.count)}%` }"></div></div>
          </div>
        </div>
        <div v-else class="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">No active bookings in this period.</div>
        <div class="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center"><NuxtLink to="/bookings" class="rounded-xl p-2 hover:bg-slate-50"><p class="text-xl font-bold text-slate-900">{{ data.bookingCount || 0 }}</p><p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bookings</p></NuxtLink><NuxtLink to="/invoices" class="rounded-xl p-2 hover:bg-slate-50"><p class="text-xl font-bold text-slate-900">{{ data.invoiceCount || 0 }}</p><p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Invoices</p></NuxtLink><NuxtLink to="/vendor-payables" class="rounded-xl p-2 hover:bg-slate-50"><p class="text-xl font-bold text-slate-900">{{ data.vendorBillCount || 0 }}</p><p class="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bills</p></NuxtLink></div>
      </article>
    </section>

    <section class="grid gap-5 xl:grid-cols-2">
      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 class="text-sm font-bold text-slate-900">Recent bookings</h2><p class="mt-0.5 text-xs text-slate-500">Latest booking activity in this period.</p></div><NuxtLink to="/bookings" class="text-xs font-semibold text-blue-600 hover:text-blue-700">All bookings</NuxtLink></header>
        <div v-if="data.recentBookings?.length" class="divide-y divide-slate-100">
          <NuxtLink v-for="item in data.recentBookings" :key="item.id" :to="`/bookings/${item.id}`" class="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
            <span class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">B{{ item.bookingVersion || 1 }}</span>
            <div class="min-w-0 flex-1"><div class="flex min-w-0 items-center gap-2"><p class="truncate text-xs font-bold text-slate-900">{{ item.bookingNumber }}</p><span :class="statusBadgeClass(item.status)" class="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase">{{ prettyStatus(item.status) }}</span></div><p class="mt-0.5 truncate text-xs text-slate-500">{{ item.title }}<span v-if="item.clientName"> · {{ item.clientName }}</span></p></div>
            <div class="flex-none text-right"><p class="text-xs font-bold" :class="Number(item.grossMargin || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'">{{ fmt(item.grossMargin) }}</p><p class="mt-0.5 text-[10px] text-slate-400">{{ fmtDate(item.bookingDate) }}</p></div>
          </NuxtLink>
        </div>
        <div v-else class="p-8 text-center text-xs text-slate-400">No recent bookings for this period.</div>
      </article>

      <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 class="text-sm font-bold text-slate-900">Recent invoices</h2><p class="mt-0.5 text-xs text-slate-500">Latest client billing activity.</p></div><NuxtLink to="/invoices" class="text-xs font-semibold text-blue-600 hover:text-blue-700">All invoices</NuxtLink></header>
        <div v-if="data.recentInvoices?.length" class="divide-y divide-slate-100">
          <NuxtLink v-for="item in data.recentInvoices" :key="item.id" :to="`/invoices/${item.id}`" class="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
            <span class="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h9l3 3v15H6V3Zm3 7h6M9 14h6"/></svg></span>
            <div class="min-w-0 flex-1"><div class="flex min-w-0 items-center gap-2"><p class="truncate text-xs font-bold text-slate-900">{{ item.invoiceNumber }}</p><span :class="invoiceStatusClass(item.status)" class="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase">{{ prettyStatus(item.status) }}</span></div><p class="mt-0.5 truncate text-xs text-slate-500">{{ item.bookingNumber || 'No booking' }}<span v-if="item.bookingTitle"> · {{ item.bookingTitle }}</span></p></div>
            <div class="flex-none text-right"><p class="text-xs font-bold text-slate-900">{{ fmt(item.grandTotal) }}</p><p class="mt-0.5 text-[10px]" :class="Number(item.outstandingAmount || 0) > 0 ? 'text-orange-500' : 'text-emerald-600'">{{ Number(item.outstandingAmount || 0) > 0 ? `${fmt(item.outstandingAmount)} due` : 'Settled' }}</p></div>
          </NuxtLink>
        </div>
        <div v-else class="p-8 text-center text-xs text-slate-400">No recent invoices for this period.</div>
      </article>
    </section>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const { formatDate } = useDateTime()
const data = ref({})
const loading = ref(false)
const filters = reactive({ period: 'all', from: '', to: '' })
const fmt = (value) => formatMoney(value || 0)
const fmtDate = formatDate
const pct = (value, total) => total ? Math.max(0, Math.min(100, (Number(value || 0) / Number(total || 1)) * 100)) : 0
const marginPct = computed(() => Number(data.value.bookingSale || 0) ? (Number(data.value.expectedMargin || 0) / Number(data.value.bookingSale || 1)) * 100 : 0)
const invoicedPct = computed(() => pct(data.value.invoiceSales, data.value.bookingSale))
const collectedPct = computed(() => pct(data.value.clientReceived, data.value.invoiceSales))
const vendorPaidPct = computed(() => pct(data.value.vendorPaid, data.value.bookingCost))
const workingCapital = computed(() => Number(data.value.receivable || 0) - Number(data.value.payable || 0))
const statusRows = computed(() => data.value.bookingStatusBreakdown || [])
const maxStatusCount = computed(() => Math.max(1, ...statusRows.value.map(item => Number(item.count || 0))))
const statusWidth = count => Math.max(8, (Number(count || 0) / maxStatusCount.value) * 100)
const prettyStatus = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
function statusDotClass(status) {
  const map = { DRAFT: 'bg-slate-400', CONFIRMED: 'bg-blue-500', PARTIALLY_INVOICED: 'bg-indigo-500', INVOICED: 'bg-violet-500', PARTIALLY_PAID: 'bg-amber-500', PAID: 'bg-emerald-500', CLOSED: 'bg-slate-600' }
  return map[status] || 'bg-blue-400'
}
function statusBadgeClass(status) {
  const map = { DRAFT: 'bg-slate-100 text-slate-600', CONFIRMED: 'bg-blue-50 text-blue-700', PARTIALLY_INVOICED: 'bg-indigo-50 text-indigo-700', INVOICED: 'bg-violet-50 text-violet-700', PARTIALLY_PAID: 'bg-amber-50 text-amber-700', PAID: 'bg-emerald-50 text-emerald-700', CLOSED: 'bg-slate-100 text-slate-700' }
  return map[status] || 'bg-blue-50 text-blue-700'
}
function invoiceStatusClass(status) {
  const value = String(status || '')
  if (value === 'PAID') return 'bg-emerald-50 text-emerald-700'
  if (value === 'CANCELLED') return 'bg-red-50 text-red-700'
  if (value.includes('PARTIAL')) return 'bg-amber-50 text-amber-700'
  return 'bg-blue-50 text-blue-700'
}
async function load() {
  loading.value = true
  try {
    const qs = new URLSearchParams()
    if (filters.from) qs.append('from', filters.from)
    if (filters.to) qs.append('to', filters.to)
    data.value = await request(`/reports/dashboard${qs.toString() ? '?' + qs : ''}`)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
