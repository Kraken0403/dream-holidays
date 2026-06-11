<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Reports</h1><p class="sub">P&amp;L, trial balance, and account statements.</p></div>
    </div>

    <div class="tab-bar">
      <button v-for="t in tabs" :key="t.id" :class="['tab-btn', tab === t.id && 'active']" @click="switchTab(t.id)">{{ t.label }}</button>
    </div>

    <!-- P&L -->
    <div v-if="tab === 'pl'">
      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="form-row" style="align-items:flex-end;">
          <div class="field"><label>From</label><input v-model="plFilters.from" class="input" type="date" /></div>
          <div class="field"><label>To</label><input v-model="plFilters.to" class="input" type="date" /></div>
          <div class="field" style="display:flex;align-items:flex-end;"><button class="btn" @click="loadPl">Generate</button></div>
        </div>
      </div>
      <div v-if="pl">
        <div class="grid grid-4" style="margin-bottom:16px;">
          <div class="card kpi"><div class="label">Revenue</div><div class="value" style="color:var(--success)">{{ fmt(pl.totalRevenue) }}</div></div>
          <div class="card kpi"><div class="label">Cost</div><div class="value" style="color:var(--danger)">{{ fmt(pl.totalCost) }}</div></div>
          <div class="card kpi"><div class="label">Gross Profit</div><div class="value">{{ fmt(pl.grossProfit) }}</div></div>
          <div class="card kpi"><div class="label">Margin %</div><div class="value">{{ pl.marginPct.toFixed(1) }}%</div></div>
        </div>
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Category</th><th style="text-align:right">Revenue</th><th style="text-align:right">Cost</th><th style="text-align:right">Margin</th><th style="text-align:right">%</th></tr></thead>
            <tbody>
              <tr v-for="r in pl.breakdown" :key="r.name">
                <td>{{ r.name }}</td>
                <td style="text-align:right">{{ fmt(r.revenue) }}</td>
                <td style="text-align:right">{{ fmt(r.cost) }}</td>
                <td style="text-align:right"><strong>{{ fmt(r.margin) }}</strong></td>
                <td style="text-align:right" class="muted">{{ r.revenue ? ((r.margin / r.revenue) * 100).toFixed(1) + '%' : '—' }}</td>
              </tr>
              <tr style="font-weight:800;background:#f8fafc;">
                <td>Total</td>
                <td style="text-align:right">{{ fmt(pl.totalRevenue) }}</td>
                <td style="text-align:right">{{ fmt(pl.totalCost) }}</td>
                <td style="text-align:right">{{ fmt(pl.grossProfit) }}</td>
                <td style="text-align:right">{{ pl.marginPct.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Trial Balance -->
    <div v-if="tab === 'tb'">
      <div v-if="tb" class="card table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th></tr></thead>
          <tbody>
            <tr v-for="r in tb.rows" :key="r.code">
              <td><span class="badge badge-muted">{{ r.code }}</span></td>
              <td>{{ r.name }}</td>
              <td class="muted">{{ r.type }}</td>
              <td style="text-align:right">{{ r.totalDebit ? fmt(r.totalDebit) : '—' }}</td>
              <td style="text-align:right">{{ r.totalCredit ? fmt(r.totalCredit) : '—' }}</td>
            </tr>
            <tr style="font-weight:800;background:#f8fafc;">
              <td colspan="3">Totals</td>
              <td style="text-align:right">{{ fmt(tb.totals.debit) }}</td>
              <td style="text-align:right">{{ fmt(tb.totals.credit) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Client Statement -->
    <div v-if="tab === 'client-stmt'">
      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="form-row" style="align-items:flex-end;">
          <div class="field">
            <label>Client</label>
            <select v-model="stmtClientId" class="input">
              <option value="">— Select Client —</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.companyName ? ' (' + c.companyName + ')' : '' }}</option>
            </select>
          </div>
          <div class="field"><label>From</label><input v-model="stmtFilters.from" class="input" type="date" /></div>
          <div class="field"><label>To</label><input v-model="stmtFilters.to" class="input" type="date" /></div>
          <div class="field" style="display:flex;align-items:flex-end;"><button class="btn" @click="loadClientStmt">Generate</button></div>
        </div>
      </div>
      <div v-if="clientStmt">
        <div class="grid grid-3" style="margin-bottom:16px;">
          <div class="card kpi"><div class="label">Client</div><div class="value" style="font-size:18px;">{{ clientStmt.client?.name }}</div><div class="muted">{{ clientStmt.client?.companyName || '' }}</div></div>
          <div class="card kpi"><div class="label">Opening Balance</div><div class="value">{{ fmt(clientStmt.openingBalance) }}</div></div>
          <div class="card kpi"><div class="label">Closing Balance</div><div class="value">{{ fmt(clientStmt.closingBalance) }}</div></div>
        </div>
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in clientStmt.rows" :key="i">
                <td>{{ fmtDate(r.date) }}</td>
                <td><span class="badge" :class="r.type === 'Invoice' ? 'badge-warning' : 'badge-success'">{{ r.type }}</span></td>
                <td class="muted">{{ r.ref || '—' }}</td>
                <td class="muted">{{ r.description || '—' }}</td>
                <td style="text-align:right">{{ r.debit ? fmt(r.debit) : '—' }}</td>
                <td style="text-align:right">{{ r.credit ? fmt(r.credit) : '—' }}</td>
                <td style="text-align:right"><strong>{{ fmt(r.balance) }}</strong></td>
              </tr>
              <tr v-if="!clientStmt.rows.length"><td colspan="7" class="muted" style="text-align:center;padding:24px;">No transactions.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Vendor Statement -->
    <div v-if="tab === 'vendor-stmt'">
      <div class="card card-pad" style="margin-bottom:16px;">
        <div class="form-row" style="align-items:flex-end;">
          <div class="field">
            <label>Vendor</label>
            <select v-model="stmtVendorId" class="input">
              <option value="">— Select Vendor —</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="field"><label>From</label><input v-model="stmtFilters.from" class="input" type="date" /></div>
          <div class="field"><label>To</label><input v-model="stmtFilters.to" class="input" type="date" /></div>
          <div class="field" style="display:flex;align-items:flex-end;"><button class="btn" @click="loadVendorStmt">Generate</button></div>
        </div>
      </div>
      <div v-if="vendorStmt">
        <div class="grid grid-3" style="margin-bottom:16px;">
          <div class="card kpi"><div class="label">Vendor</div><div class="value" style="font-size:18px;">{{ vendorStmt.vendor?.name }}</div></div>
          <div class="card kpi"><div class="label">Opening Balance</div><div class="value">{{ fmt(vendorStmt.openingBalance) }}</div></div>
          <div class="card kpi"><div class="label">Closing Balance</div><div class="value">{{ fmt(vendorStmt.closingBalance) }}</div></div>
        </div>
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Ref</th><th>Description</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in vendorStmt.rows" :key="i">
                <td>{{ fmtDate(r.date) }}</td>
                <td><span class="badge" :class="r.type === 'Bill' ? 'badge-warning' : 'badge-success'">{{ r.type }}</span></td>
                <td class="muted">{{ r.ref || '—' }}</td>
                <td class="muted">{{ r.description || '—' }}</td>
                <td style="text-align:right">{{ r.debit ? fmt(r.debit) : '—' }}</td>
                <td style="text-align:right">{{ r.credit ? fmt(r.credit) : '—' }}</td>
                <td style="text-align:right"><strong>{{ fmt(r.balance) }}</strong></td>
              </tr>
              <tr v-if="!vendorStmt.rows.length"><td colspan="7" class="muted" style="text-align:center;padding:24px;">No transactions.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()

const tabs = [
  { id: 'pl', label: 'P&L' },
  { id: 'tb', label: 'Trial Balance' },
  { id: 'client-stmt', label: 'Client Statement' },
  { id: 'vendor-stmt', label: 'Vendor Statement' },
]
const tab = ref('pl')

const fmt = (v) => formatMoney(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const pl = ref(null)
const plFilters = reactive({
  from: new Date(new Date().getFullYear(), 3, 1).toISOString().slice(0, 10),
  to: new Date().toISOString().slice(0, 10),
})
async function loadPl() {
  pl.value = await request(`/reports/pl?from=${plFilters.from}&to=${plFilters.to}`)
}

const tb = ref(null)
async function loadTb() { tb.value = await request('/reports/trial-balance') }

const clients = ref([])
const stmtClientId = ref('')
const clientStmt = ref(null)
const stmtFilters = reactive({ from: '', to: '' })
async function loadClients() { clients.value = await request('/reports/clients') }
async function loadClientStmt() {
  if (!stmtClientId.value) return
  const qs = new URLSearchParams()
  if (stmtFilters.from) qs.append('from', stmtFilters.from)
  if (stmtFilters.to) qs.append('to', stmtFilters.to)
  clientStmt.value = await request(`/reports/client-statement/${stmtClientId.value}${qs.toString() ? '?' + qs : ''}`)
}

const vendors = ref([])
const stmtVendorId = ref('')
const vendorStmt = ref(null)
async function loadVendors() { vendors.value = await request('/reports/vendors') }
async function loadVendorStmt() {
  if (!stmtVendorId.value) return
  const qs = new URLSearchParams()
  if (stmtFilters.from) qs.append('from', stmtFilters.from)
  if (stmtFilters.to) qs.append('to', stmtFilters.to)
  vendorStmt.value = await request(`/reports/vendor-statement/${stmtVendorId.value}${qs.toString() ? '?' + qs : ''}`)
}

function switchTab(t) {
  tab.value = t
  if (t === 'tb' && !tb.value) loadTb()
}

onMounted(async () => {
  await Promise.all([loadClients(), loadVendors(), loadPl()])
})
</script>

<style scoped>
.tab-bar { display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap; }
.tab-btn { padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:#fff; font-weight:600; font-size:14px; cursor:pointer; color:var(--muted); }
.tab-btn.active { background:var(--primary); color:#fff; border-color:var(--primary); }
</style>
