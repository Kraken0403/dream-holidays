<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Passbook</h1><p class="sub">Client and vendor ledger with running balance.</p></div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar">
      <button :class="['tab-btn', tab === 'client' && 'active']" @click="tab = 'client'; reset()">Clients</button>
      <button :class="['tab-btn', tab === 'vendor' && 'active']" @click="tab = 'vendor'; reset()">Vendors</button>
    </div>

    <!-- Filters -->
    <div class="card card-pad" style="margin-bottom:16px;">
      <div class="form-row" style="align-items:flex-end;">
        <div class="field">
          <label>{{ tab === 'client' ? 'Select Client' : 'Select Vendor' }}</label>
          <select v-model="selectedId" class="input" @change="load">
            <option value="">— Select —</option>
            <option v-for="e in entities" :key="e.id" :value="e.id">{{ e.name }}{{ e.companyName ? ' (' + e.companyName + ')' : '' }}</option>
          </select>
        </div>
        <div class="field"><label>From</label><input v-model="filters.from" class="input" type="date" @change="load" /></div>
        <div class="field"><label>To</label><input v-model="filters.to" class="input" type="date" @change="load" /></div>
        <div class="field">
          <label>Type</label>
          <select v-model="filters.type" class="input" @change="load">
            <option value="">All</option>
            <option value="debit">Debit only</option>
            <option value="credit">Credit only</option>
          </select>
        </div>
        <div class="field" style="display:flex;align-items:flex-end;">
          <button class="btn ghost small" @click="exportCsv" :disabled="!data">Export CSV</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="muted" style="padding:24px 0;">Loading…</div>

    <div v-if="data && !loading">
      <!-- Entity header + summary -->
      <div class="grid grid-4" style="margin-bottom:16px;">
        <div class="card kpi"><div class="label">Opening Balance</div><div class="value">{{ fmt(data.openingBalance) }}</div></div>
        <div class="card kpi"><div class="label">Total Debit</div><div class="value" style="color:var(--danger)">{{ fmt(data.totalDebit) }}</div></div>
        <div class="card kpi"><div class="label">Total Credit</div><div class="value" style="color:var(--success)">{{ fmt(data.totalCredit) }}</div></div>
        <div class="card kpi"><div class="label">Closing Balance</div><div class="value">{{ fmt(data.closingBalance) }}</div></div>
      </div>

      <div class="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Ref</th>
              <th style="text-align:right">Debit</th>
              <th style="text-align:right">Credit</th>
              <th style="text-align:right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="data.openingBalance !== 0">
              <td colspan="6" style="color:var(--muted);font-size:13px;">Opening Balance</td>
              <td style="text-align:right"><strong>{{ fmt(data.openingBalance) }}</strong></td>
            </tr>
            <tr v-for="row in data.rows" :key="row.id + row.type">
              <td>{{ fmtDate(row.date) }}</td>
              <td><span :class="['badge', row.type === 'INVOICE' || row.type === 'BILL' ? 'badge-warning' : 'badge-success']">{{ row.type }}</span></td>
              <td>{{ row.description }}</td>
              <td class="muted">{{ row.ref || '—' }}</td>
              <td style="text-align:right" :class="row.debit ? 'money' : 'muted'">{{ row.debit ? fmt(row.debit) : '—' }}</td>
              <td style="text-align:right;color:var(--success)" :class="row.credit ? 'money' : 'muted'">{{ row.credit ? fmt(row.credit) : '—' }}</td>
              <td style="text-align:right"><strong :class="row.balance < 0 ? 'danger-text' : ''">{{ fmt(row.balance) }}</strong></td>
            </tr>
            <tr v-if="!data.rows.length"><td colspan="7" class="muted" style="text-align:center;padding:24px;">No transactions found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="!selectedId && !loading" class="card card-pad muted" style="text-align:center;padding:40px;">
      Select a {{ tab === 'client' ? 'client' : 'vendor' }} to view their passbook.
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
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

<style scoped>
.tab-bar { display:flex; gap:8px; margin-bottom:16px; }
.tab-btn { padding:9px 18px; border-radius:8px; border:1px solid var(--border); background:#fff; font-weight:600; font-size:14px; cursor:pointer; color:var(--muted); }
.tab-btn.active { background:var(--primary); color:#fff; border-color:var(--primary); }
.danger-text { color: var(--danger); }
</style>
