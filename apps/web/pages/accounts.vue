<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Accounts</h1><p class="sub">Chart of accounts and journal entry ledger.</p></div>
      <button class="btn" @click="openJournal">+ Manual Entry</button>
    </div>

    <div v-if="!selectedAccount">
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Code</th><th>Account</th><th>Type</th><th style="text-align:right">Total Debit</th><th style="text-align:right">Total Credit</th><th style="text-align:right">Balance</th><th></th></tr></thead>
          <tbody>
            <tr v-for="a in accounts" :key="a.id">
              <td><span class="badge badge-muted">{{ a.code }}</span></td>
              <td><strong>{{ a.name }}</strong></td>
              <td class="muted">{{ a.type }}</td>
              <td style="text-align:right">{{ fmt(a.totalDebit) }}</td>
              <td style="text-align:right">{{ fmt(a.totalCredit) }}</td>
              <td style="text-align:right"><strong :class="a.balance < 0 ? 'danger-text' : ''">{{ fmt(a.balance) }}</strong></td>
              <td><button class="btn ghost small" @click="viewLedger(a)">View Ledger</button></td>
            </tr>
            <tr v-if="!accounts.length"><td colspan="7" class="muted" style="text-align:center;padding:32px;">No accounts found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ledger detail -->
    <div v-if="selectedAccount">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <button class="btn ghost small" @click="selectedAccount = null; ledger = null">← Back</button>
        <div>
          <strong style="font-size:16px;">{{ selectedAccount.name }}</strong>
          <span class="muted" style="margin-left:10px;">{{ selectedAccount.code }}</span>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div class="field"><label>From</label><input v-model="ledgerFilters.from" class="input" type="date" @change="loadLedger" /></div>
        <div class="field"><label>To</label><input v-model="ledgerFilters.to" class="input" type="date" @change="loadLedger" /></div>
      </div>

      <div v-if="ledger" class="grid grid-3" style="margin-bottom:16px;">
        <div class="card kpi"><div class="label">Total Debit</div><div class="value">{{ fmt(ledger.totalDebit) }}</div></div>
        <div class="card kpi"><div class="label">Total Credit</div><div class="value">{{ fmt(ledger.totalCredit) }}</div></div>
        <div class="card kpi"><div class="label">Balance</div><div class="value">{{ fmt(ledger.closingBalance) }}</div></div>
      </div>

      <div class="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Source</th><th>Narration</th><th style="text-align:right">Debit</th><th style="text-align:right">Credit</th><th style="text-align:right">Balance</th></tr></thead>
          <tbody>
            <tr v-for="row in ledger?.rows || []" :key="row.id">
              <td>{{ fmtDate(row.date) }}</td>
              <td><span class="badge badge-muted">{{ row.sourceType }}</span></td>
              <td class="muted">{{ row.narration }}</td>
              <td style="text-align:right">{{ row.debit ? fmt(row.debit) : '—' }}</td>
              <td style="text-align:right">{{ row.credit ? fmt(row.credit) : '—' }}</td>
              <td style="text-align:right"><strong>{{ fmt(row.balance) }}</strong></td>
            </tr>
            <tr v-if="!ledger?.rows?.length"><td colspan="6" class="muted" style="text-align:center;padding:24px;">No transactions.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Manual Journal Entry Modal -->
    <div v-if="showJournal" class="modal-backdrop" @click.self="showJournal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">Manual Journal Entry</h2>
          <button class="btn ghost small" @click="showJournal = false">Close</button>
        </div>
        <div class="modal-body form">
          <div class="form-row">
            <div class="field"><label>Date</label><input v-model="jForm.date" class="input" type="date" /></div>
            <div class="field"><label>Narration</label><input v-model="jForm.narration" class="input" placeholder="Description of the entry" /></div>
          </div>
          <div style="margin-top:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <strong style="font-size:13px;">Lines</strong>
              <button class="btn ghost small" type="button" @click="addLine">+ Add Line</button>
            </div>
            <div v-for="(line, i) in jForm.lines" :key="i" class="item-box" style="margin-bottom:8px;">
              <div class="form-row">
                <div class="field">
                  <label>Account</label>
                  <select v-model="line.accountId" class="input">
                    <option value="">— Select —</option>
                    <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} · {{ a.name }}</option>
                  </select>
                </div>
                <div class="field"><label>Debit</label><input v-model="line.debit" class="input" type="number" min="0" step="0.01" /></div>
                <div class="field"><label>Credit</label><input v-model="line.credit" class="input" type="number" min="0" step="0.01" /></div>
                <div class="field" style="display:flex;align-items:flex-end;">
                  <button class="btn ghost small danger" type="button" @click="jForm.lines.splice(i, 1)">Remove</button>
                </div>
              </div>
            </div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px;">
              Total Debit: {{ fmt(jForm.lines.reduce((s,l) => s + Number(l.debit||0), 0)) }} ·
              Total Credit: {{ fmt(jForm.lines.reduce((s,l) => s + Number(l.credit||0), 0)) }}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn secondary" @click="showJournal = false">Cancel</button>
          <button class="btn" @click="saveJournal">Post Entry</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const accounts = ref([])
const selectedAccount = ref(null)
const ledger = ref(null)
const ledgerFilters = reactive({ from: '', to: '' })
const showJournal = ref(false)
const jForm = reactive({ date: new Date().toISOString().slice(0, 10), narration: '', lines: [] })

const fmt = (v) => formatMoney(v)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

async function loadAccounts() { accounts.value = await request('/accounts') }

async function viewLedger(a) {
  selectedAccount.value = a
  ledger.value = null
  await loadLedger()
}

async function loadLedger() {
  if (!selectedAccount.value) return
  const params = new URLSearchParams()
  if (ledgerFilters.from) params.append('from', ledgerFilters.from)
  if (ledgerFilters.to) params.append('to', ledgerFilters.to)
  const qs = params.toString() ? '?' + params.toString() : ''
  ledger.value = await request(`/accounts/ledger/${selectedAccount.value.id}${qs}`)
}

function openJournal() {
  Object.assign(jForm, { date: new Date().toISOString().slice(0, 10), narration: '', lines: [] })
  addLine(); addLine()
  showJournal.value = true
}

function addLine() { jForm.lines.push({ accountId: '', debit: '', credit: '' }) }

async function saveJournal() {
  await request('/accounts/journal', { method: 'POST', body: { ...jForm, lines: jForm.lines.filter(l => l.accountId) } })
  showJournal.value = false
  await loadAccounts()
  if (selectedAccount.value) await loadLedger()
}

onMounted(loadAccounts)
</script>

<style scoped>
.danger-text { color: var(--danger); }
</style>
