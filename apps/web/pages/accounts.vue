<template>
  <div>
    <PageHeader title="Accounts / Ledger" subtitle="Chart of accounts and journal entry ledger.">
      <template #actions>
        <button @click="openJournal"
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Manual Entry
        </button>
      </template>
    </PageHeader>

    <!-- Chart of Accounts -->
    <div v-if="!selectedAccount" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Debit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Credit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="a in accounts" :key="a.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-700">{{ a.code }}</span>
              </td>
              <td class="px-4 py-3 font-semibold text-gray-900">{{ a.name }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs uppercase">{{ a.type }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(a.totalDebit) }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(a.totalCredit) }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-bold" :class="a.balance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(a.balance) }}</td>
              <td class="px-4 py-3">
                <button @click="viewLedger(a)" class="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors">
                  View Ledger
                </button>
              </td>
            </tr>
            <tr v-if="!accounts.length">
              <td colspan="7" class="px-4 py-10 text-center text-gray-400">No accounts found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Ledger detail -->
    <div v-if="selectedAccount">
      <div class="flex items-center gap-3 mb-5">
        <button @click="selectedAccount = null; ledger = null"
          class="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/></svg>
          Back to Accounts
        </button>
        <div class="h-4 w-px bg-gray-300" />
        <div>
          <span class="font-semibold text-gray-900 text-lg">{{ selectedAccount.name }}</span>
          <span class="ml-2 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ selectedAccount.code }}</span>
        </div>
      </div>

      <!-- Date filters -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div class="flex flex-wrap items-end gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">From</label>
            <input v-model="ledgerFilters.from" type="date" :class="INP" @change="loadLedger" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1.5">To</label>
            <input v-model="ledgerFilters.to" type="date" :class="INP" @change="loadLedger" />
          </div>
        </div>
      </div>

      <div v-if="ledger" class="grid grid-cols-3 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Debit</p>
          <p class="text-xl font-bold text-red-600 mt-1 tabular-nums">{{ fmt(ledger.totalDebit) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Credit</p>
          <p class="text-xl font-bold text-green-600 mt-1 tabular-nums">{{ fmt(ledger.totalCredit) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance</p>
          <p class="text-xl font-bold mt-1 tabular-nums" :class="ledger.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(ledger.closingBalance) }}</p>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Narration</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in ledger?.rows || []" :key="row.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(row.date) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{{ row.sourceType }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ row.narration }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="row.debit ? 'text-red-600 font-medium' : 'text-gray-300'">{{ row.debit ? fmt(row.debit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="row.credit ? 'text-green-600 font-medium' : 'text-gray-300'">{{ row.credit ? fmt(row.credit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{{ fmt(row.balance) }}</td>
              </tr>
              <tr v-if="!ledger?.rows?.length">
                <td colspan="6" class="px-4 py-10 text-center text-gray-400">No transactions in this period.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Manual Journal Modal -->
    <AppModal v-model="showJournal" title="Manual Journal Entry" subtitle="Post a manual debit/credit entry" size="lg" color="indigo">
      <form id="journal-form" @submit.prevent="saveJournal" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
            <input v-model="jForm.date" type="date" :class="INP" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Narration *</label>
            <input v-model="jForm.narration" :class="INP" placeholder="Description of the entry" required />
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-900">Journal Lines</h4>
            <button type="button" @click="addLine" class="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Line</button>
          </div>
          <div class="space-y-3">
            <div v-for="(line, i) in jForm.lines" :key="i" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="grid grid-cols-3 gap-3">
                <div class="col-span-1">
                  <label class="block text-xs font-medium text-gray-600 mb-1">Account</label>
                  <select v-model="line.accountId" :class="INP + ' bg-white'" required>
                    <option value="">— Select —</option>
                    <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.code }} · {{ a.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Debit</label>
                  <input v-model="line.debit" type="number" min="0" step="0.01" :class="INP + ' bg-white'" placeholder="0" />
                </div>
                <div class="flex gap-2 items-end">
                  <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-600 mb-1">Credit</label>
                    <input v-model="line.credit" type="number" min="0" step="0.01" :class="INP + ' bg-white'" placeholder="0" />
                  </div>
                  <button type="button" @click="jForm.lines.splice(i, 1)" class="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-3 text-xs text-gray-500 flex gap-4">
            <span>Total Debit: <strong>{{ fmt(jForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0)) }}</strong></span>
            <span>Total Credit: <strong>{{ fmt(jForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0)) }}</strong></span>
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showJournal = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="journal-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Post Entry</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
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
  selectedAccount.value = a; ledger.value = null
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
