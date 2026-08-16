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
      <TableControls
        v-model:search="accountTable.search.value"
        v-model:page="accountTable.page.value"
        v-model:page-size="accountTable.pageSize.value"
        :page-size-options="accountTable.pageSizeOptions"
        :total="accountTable.total.value"
        :filtered="accountTable.filtered.value"
        :start="accountTable.start.value"
        :end="accountTable.end.value"
        exportable
        :selected-count="accountSelection.selectedCount.value"
        :filter-count="accountTypeFilter ? 1 : 0"
        search-placeholder="Search accounts, codes..."
        @export="accountSelection.exportXls"
        @clear-selection="accountSelection.clear"
      >
        <template #filters>
          <div class="w-full sm:w-44">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
            <select v-model="accountTypeFilter" :class="INP">
              <option value="">All</option>
              <option v-for="type in accountTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="accountSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="accountSelection.togglePage" /></th>
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
            <tr v-for="a in accountTable.rows.value" :key="a.id" class="hover:bg-gray-50 transition-colors">
              <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${a.name}`" :checked="accountSelection.isSelected(a)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="accountSelection.toggle(a)" /></td>
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
            <tr v-if="!accountTable.filtered.value">
              <td colspan="8" class="px-4 py-10 text-center text-gray-400">No accounts found.</td>
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
          <DateRangeFilter
            v-model:preset="ledgerFilters.period"
            v-model:from="ledgerFilters.from"
            v-model:to="ledgerFilters.to"
            @change="loadLedger"
          />
        </div>
      </div>

      <div v-if="ledger" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening Balance</p>
          <p class="text-xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(ledger.openingBalance) }}</p>
        </div>
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
        <TableControls
          v-model:search="ledgerTable.search.value"
          v-model:page="ledgerTable.page.value"
          v-model:page-size="ledgerTable.pageSize.value"
          :page-size-options="ledgerTable.pageSizeOptions"
          :total="ledgerTable.total.value"
          :filtered="ledgerTable.filtered.value"
          :start="ledgerTable.start.value"
          :end="ledgerTable.end.value"
          exportable
          :selected-count="ledgerSelection.selectedCount.value"
          search-placeholder="Search ledger rows..."
          @export="ledgerSelection.exportXls"
          @clear-selection="ledgerSelection.clear"
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="ledgerSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="ledgerSelection.togglePage" /></th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Narration</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="row in ledgerTable.rows.value" :key="row.id" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select ledger row" :checked="ledgerSelection.isSelected(row)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="ledgerSelection.toggle(row)" /></td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(row.date) }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{{ row.sourceType }}</span>
                </td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ row.narration }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="row.debit ? 'text-red-600 font-medium' : 'text-gray-300'">{{ row.debit ? fmt(row.debit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="row.credit ? 'text-green-600 font-medium' : 'text-gray-300'">{{ row.credit ? fmt(row.credit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{{ fmt(row.balance) }}</td>
              </tr>
              <tr v-if="!ledgerTable.filtered.value">
                <td colspan="7" class="px-4 py-10 text-center text-gray-400">No transactions in this period.</td>
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
const toast = useToast()
const { formatMoney } = useMoney()
const { formatDate, todayInput } = useDateTime()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const accounts = ref([])
const accountTypeFilter = ref('')
const selectedAccount = ref(null)
const ledger = ref(null)
const ledgerFilters = reactive({ period: 'all', from: '', to: '' })
const showJournal = ref(false)
const jForm = reactive({ date: todayInput(), narration: '', lines: [] })
const fmt = (v) => formatMoney(v)
const fmtDate = formatDate
const accountTypes = computed(() => [...new Set(accounts.value.map((account) => account.type).filter(Boolean))].sort())
const filteredAccounts = computed(() => accountTypeFilter.value ? accounts.value.filter((account) => account.type === accountTypeFilter.value) : accounts.value)
const accountTable = useTableControls(filteredAccounts, {
  searchFields: ['code', 'name', 'type'],
})
const accountSelection = useListingSelection(accountTable, [
  { label: 'Code', field: 'code' }, { label: 'Account', field: 'name' }, { label: 'Type', field: 'type' },
  { label: 'Total Debit', field: (row) => fmt(row.totalDebit) }, { label: 'Total Credit', field: (row) => fmt(row.totalCredit) }, { label: 'Balance', field: (row) => fmt(row.balance) },
], 'accounts')
const ledgerRows = computed(() => ledger.value?.rows || [])
const ledgerTable = useTableControls(ledgerRows, {
  searchFields: ['sourceType', 'narration', (row) => fmtDate(row.date)],
})
const ledgerSelection = useListingSelection(ledgerTable, [
  { label: 'Date', field: (row) => fmtDate(row.date) }, { label: 'Source', field: 'sourceType' }, { label: 'Narration', field: 'narration' },
  { label: 'Debit', field: (row) => fmt(row.debit) }, { label: 'Credit', field: (row) => fmt(row.credit) }, { label: 'Balance', field: (row) => fmt(row.balance) },
], 'account-ledger')

async function loadAccounts() { accounts.value = await request('/accounts') }

async function viewLedger(a) {
  selectedAccount.value = a; ledger.value = null
  ledgerTable.reset()
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
  Object.assign(jForm, { date: todayInput(), narration: '', lines: [] })
  addLine(); addLine()
  showJournal.value = true
}

function addLine() { jForm.lines.push({ accountId: '', debit: '', credit: '' }) }

async function saveJournal() {
  await request('/accounts/journal', { method: 'POST', body: { ...jForm, lines: jForm.lines.filter(l => l.accountId) } })
  showJournal.value = false
  await loadAccounts()
  if (selectedAccount.value) await loadLedger()
  toast.success('Journal entry posted.')
}

onMounted(loadAccounts)
</script>
