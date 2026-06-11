<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Payment Tracking</h1><p class="sub">Aging analysis — outstanding receivables and payables.</p></div>
    </div>

    <div class="tab-bar">
      <button :class="['tab-btn', tab === 'receivables' && 'active']" @click="tab = 'receivables'">Receivables</button>
      <button :class="['tab-btn', tab === 'payables' && 'active']" @click="tab = 'payables'">Payables</button>
    </div>

    <div v-if="loading" class="muted" style="padding:24px 0;">Loading…</div>

    <template v-if="!loading && data">
      <!-- Summary cards -->
      <div class="grid grid-4" style="margin-bottom:16px;">
        <div v-for="b in data.buckets" :key="b.key" class="card kpi">
          <div class="label">{{ b.label }}</div>
          <div class="value" :style="b.key !== 'CURRENT' ? 'color:var(--danger)' : ''">{{ fmt(b.total) }}</div>
          <div class="muted" style="font-size:12px;margin-top:4px;">{{ (tab === 'receivables' ? b.invoices : b.bills).length }} item(s)</div>
        </div>
        <div class="card kpi">
          <div class="label">Total Outstanding</div>
          <div class="value money">{{ fmt(data.grandTotal) }}</div>
        </div>
      </div>

      <!-- Detail tables per bucket -->
      <div v-for="b in data.buckets.filter(x => (tab === 'receivables' ? x.invoices : x.bills).length > 0)" :key="b.key" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <strong style="font-size:15px;">{{ b.label }}</strong>
          <span class="badge" :class="b.key === 'CURRENT' ? 'badge-success' : b.key === '1_30' ? 'badge-warning' : 'badge-danger'">{{ fmt(b.total) }}</span>
        </div>
        <div class="card table-wrap">
          <table v-if="tab === 'receivables'">
            <thead><tr><th>Invoice #</th><th>Client</th><th>Invoice Date</th><th>Due Date</th><th style="text-align:right">Total</th><th style="text-align:right">Outstanding</th></tr></thead>
            <tbody>
              <tr v-for="inv in b.invoices" :key="inv.id">
                <td><NuxtLink :to="`/invoices`" class="link">{{ inv.invoiceNumber }}</NuxtLink></td>
                <td>{{ inv.client?.name }}<div class="muted">{{ inv.client?.companyName }}</div></td>
                <td>{{ fmtDate(inv.invoiceDate) }}</td>
                <td :class="isPastDue(inv.dueDate) ? 'danger-text' : ''">{{ inv.dueDate ? fmtDate(inv.dueDate) : '—' }}</td>
                <td style="text-align:right">{{ fmt(inv.grandTotal) }}</td>
                <td style="text-align:right"><strong class="danger-text">{{ fmt(inv.outstanding) }}</strong></td>
              </tr>
            </tbody>
          </table>
          <table v-else>
            <thead><tr><th>Bill #</th><th>Vendor</th><th>Bill Date</th><th>Due Date</th><th style="text-align:right">Total</th><th style="text-align:right">Outstanding</th></tr></thead>
            <tbody>
              <tr v-for="bill in b.bills" :key="bill.id">
                <td>{{ bill.billNumber }}</td>
                <td>{{ bill.vendor?.name }}</td>
                <td>{{ fmtDate(bill.billDate) }}</td>
                <td :class="isPastDue(bill.dueDate) ? 'danger-text' : ''">{{ bill.dueDate ? fmtDate(bill.dueDate) : '—' }}</td>
                <td style="text-align:right">{{ fmt(bill.grandTotal) }}</td>
                <td style="text-align:right"><strong class="danger-text">{{ fmt(bill.outstanding) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="data.grandTotal === 0" class="card card-pad muted" style="text-align:center;padding:40px;">
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

watch(tab, load)
onMounted(load)
</script>

<style scoped>
.tab-bar { display:flex; gap:8px; margin-bottom:16px; }
.tab-btn { padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:#fff; font-weight:600; font-size:14px; cursor:pointer; color:var(--muted); }
.tab-btn.active { background:var(--primary); color:#fff; border-color:var(--primary); }
.danger-text { color: var(--danger); }
.link { color: var(--primary); font-weight:600; }
</style>
