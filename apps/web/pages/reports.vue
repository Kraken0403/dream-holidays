<template>
  <div>
    <PageHeader title="Reports" subtitle="P&amp;L, trial balance, and account statements." />

    <!-- Tabs -->
    <div class="flex flex-wrap gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
      <button
        v-for="t in tabs" :key="t.id"
        @click="switchTab(t.id)"
        :class="tab === t.id ? 'bg-white text-gray-900 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-md text-sm transition-all"
      >{{ t.label }}</button>
    </div>

    <!-- P&L -->
    <div v-if="tab === 'pl'">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div class="flex flex-wrap items-end gap-3">
          <DateRangeFilter
            v-model:preset="plFilters.period"
            v-model:from="plFilters.from"
            v-model:to="plFilters.to"
            :allow-all="false"
          />
          <button @click="loadPl" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Generate</button>
        </div>
      </div>
      <div v-if="pl">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
            <p class="text-xl font-bold text-green-600 mt-1 tabular-nums">{{ fmt(pl.totalRevenue) }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</p>
            <p class="text-xl font-bold text-red-600 mt-1 tabular-nums">{{ fmt(pl.totalCost) }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Gross Profit</p>
            <p class="text-xl font-bold mt-1 tabular-nums" :class="pl.grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'">{{ fmt(pl.grossProfit) }}</p>
          </div>
          <div class="bg-blue-600 rounded-xl shadow-sm p-4">
            <p class="text-xs font-medium text-blue-200 uppercase tracking-wide">Margin %</p>
            <p class="text-xl font-bold text-white mt-1">{{ pl.marginPct.toFixed(1) }}%</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TableControls
            v-model:search="plTable.search.value"
            v-model:page="plTable.page.value"
            v-model:page-size="plTable.pageSize.value"
            :page-size-options="plTable.pageSizeOptions"
            :total="plTable.total.value"
            :filtered="plTable.filtered.value"
            :start="plTable.start.value"
            :end="plTable.end.value"
            exportable
            :selected-count="plSelection.selectedCount.value"
            search-placeholder="Search categories..."
            @export="plSelection.exportXls"
            @clear-selection="plSelection.clear"
          />
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="bg-gray-50 border-b border-gray-100">
                <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="plSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="plSelection.togglePage" /></th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
              </tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="r in plTable.rows.value" :key="r.name" class="hover:bg-gray-50">
                  <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${r.name}`" :checked="plSelection.isSelected(r)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="plSelection.toggle(r)" /></td>
                  <td class="px-4 py-3 text-gray-800">{{ r.name }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(r.revenue) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-500">{{ fmt(r.cost) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums font-semibold" :class="r.margin >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(r.margin) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-500">{{ r.revenue ? ((r.margin / r.revenue) * 100).toFixed(1) + '%' : '—' }}</td>
                </tr>
                <tr v-if="!plTable.filtered.value">
                  <td colspan="6" class="px-4 py-10 text-center text-gray-400">No categories found.</td>
                </tr>
                <tr class="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td></td>
                  <td class="px-4 py-3 text-gray-900">Total</td>
                  <td class="px-4 py-3 text-right tabular-nums text-green-700">{{ fmt(pl.totalRevenue) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(pl.totalCost) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-900">{{ fmt(pl.grossProfit) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ pl.marginPct.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Trial Balance -->
    <div v-if="tab === 'tb'">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div class="flex flex-wrap items-end gap-3">
          <DateRangeFilter
            v-model:preset="tbFilters.period"
            v-model:from="tbFilters.from"
            v-model:to="tbFilters.to"
          />
          <button @click="loadTb" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Generate</button>
        </div>
      </div>
      <div v-if="tb" class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TableControls
          v-model:search="tbTable.search.value"
          v-model:page="tbTable.page.value"
          v-model:page-size="tbTable.pageSize.value"
          :page-size-options="tbTable.pageSizeOptions"
          :total="tbTable.total.value"
          :filtered="tbTable.filtered.value"
          :start="tbTable.start.value"
          :end="tbTable.end.value"
          exportable
          :selected-count="tbSelection.selectedCount.value"
          search-placeholder="Search accounts..."
          @export="tbSelection.exportXls"
          @clear-selection="tbSelection.clear"
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead><tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="tbSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="tbSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Code</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in tbTable.rows.value" :key="r.code" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${r.name}`" :checked="tbSelection.isSelected(r)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="tbSelection.toggle(r)" /></td>
                <td class="px-4 py-3"><span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ r.code }}</span></td>
                <td class="px-4 py-3 text-gray-800 font-medium">{{ r.name }}</td>
                <td class="px-4 py-3 text-xs text-gray-500 uppercase">{{ r.type }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ r.totalDebit ? fmt(r.totalDebit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ r.totalCredit ? fmt(r.totalCredit) : '—' }}</td>
              </tr>
              <tr v-if="!tbTable.filtered.value">
                <td colspan="6" class="px-4 py-10 text-center text-gray-400">No accounts found.</td>
              </tr>
              <tr class="bg-gray-50 font-bold border-t-2 border-gray-200">
                <td></td>
                <td colspan="3" class="px-4 py-3 text-gray-900">Totals</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-900">{{ fmt(tb.totals.debit) }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-gray-900">{{ fmt(tb.totals.credit) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Client Statement -->
    <div v-if="tab === 'client-stmt'">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[200px]">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Client</label>
            <select v-model="stmtClientId" :class="INP">
              <option value="">— Select Client —</option>
              <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}{{ c.companyName ? ' (' + c.companyName + ')' : '' }}</option>
            </select>
          </div>
          <DateRangeFilter
            v-model:preset="stmtFilters.period"
            v-model:from="stmtFilters.from"
            v-model:to="stmtFilters.to"
          />
          <button @click="loadClientStmt" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Generate</button>
        </div>
      </div>
      <div v-if="clientStmt">
        <div class="grid grid-cols-3 gap-4 mb-5">
          <div class="bg-blue-600 rounded-xl shadow-sm p-4">
            <p class="text-xs font-medium text-blue-200 uppercase tracking-wide">Client</p>
            <p class="text-lg font-bold text-white mt-1">{{ clientStmt.client?.name }}</p>
            <p class="text-blue-200 text-sm">{{ clientStmt.client?.companyName || '' }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening Balance</p>
            <p class="text-xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(clientStmt.openingBalance) }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Closing Balance</p>
            <p class="text-xl font-bold mt-1 tabular-nums" :class="clientStmt.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(clientStmt.closingBalance) }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TableControls
            v-model:search="clientStmtTable.search.value"
            v-model:page="clientStmtTable.page.value"
            v-model:page-size="clientStmtTable.pageSize.value"
            :page-size-options="clientStmtTable.pageSizeOptions"
            :total="clientStmtTable.total.value"
            :filtered="clientStmtTable.filtered.value"
            :start="clientStmtTable.start.value"
            :end="clientStmtTable.end.value"
            exportable
            :selected-count="clientStmtSelection.selectedCount.value"
            search-placeholder="Search statement rows..."
            @export="clientStmtSelection.exportXls"
            @clear-selection="clientStmtSelection.clear"
          />
          <div class="overflow-x-auto">
            <table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="clientStmtSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="clientStmtSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(r, i) in clientStmtTable.rows.value" :key="i" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select statement row" :checked="clientStmtSelection.isSelected(r)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="clientStmtSelection.toggle(r)" /></td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(r.date) }}</td>
                <td class="px-4 py-3"><span :class="r.type === 'Invoice' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ r.type }}</span></td>
                <td class="px-4 py-3 text-xs text-gray-400">{{ r.ref || '—' }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ r.description || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="r.debit ? 'text-red-600 font-medium' : 'text-gray-300'">{{ r.debit ? fmt(r.debit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="r.credit ? 'text-green-600 font-medium' : 'text-gray-300'">{{ r.credit ? fmt(r.credit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{{ fmt(r.balance) }}</td>
              </tr>
              <tr v-if="!clientStmtTable.filtered.value"><td colspan="8" class="px-4 py-10 text-center text-gray-400">No transactions.</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
    </div>

    <!-- Vendor Statement -->
    <div v-if="tab === 'vendor-stmt'">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
        <div class="flex flex-wrap items-end gap-3">
          <div class="min-w-[200px]">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Vendor</label>
            <select v-model="stmtVendorId" :class="INP">
              <option value="">— Select Vendor —</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <DateRangeFilter
            v-model:preset="stmtFilters.period"
            v-model:from="stmtFilters.from"
            v-model:to="stmtFilters.to"
          />
          <button @click="loadVendorStmt" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg">Generate</button>
        </div>
      </div>
      <div v-if="vendorStmt">
        <div class="grid grid-cols-3 gap-4 mb-5">
          <div class="bg-indigo-600 rounded-xl shadow-sm p-4">
            <p class="text-xs font-medium text-indigo-200 uppercase tracking-wide">Vendor</p>
            <p class="text-lg font-bold text-white mt-1">{{ vendorStmt.vendor?.name }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Opening Balance</p>
            <p class="text-xl font-bold text-gray-900 mt-1 tabular-nums">{{ fmt(vendorStmt.openingBalance) }}</p>
          </div>
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Closing Balance</p>
            <p class="text-xl font-bold mt-1 tabular-nums" :class="vendorStmt.closingBalance < 0 ? 'text-red-600' : 'text-gray-900'">{{ fmt(vendorStmt.closingBalance) }}</p>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <TableControls
            v-model:search="vendorStmtTable.search.value"
            v-model:page="vendorStmtTable.page.value"
            v-model:page-size="vendorStmtTable.pageSize.value"
            :page-size-options="vendorStmtTable.pageSizeOptions"
            :total="vendorStmtTable.total.value"
            :filtered="vendorStmtTable.filtered.value"
            :start="vendorStmtTable.start.value"
            :end="vendorStmtTable.end.value"
            exportable
            :selected-count="vendorStmtSelection.selectedCount.value"
            search-placeholder="Search statement rows..."
            @export="vendorStmtSelection.exportXls"
            @clear-selection="vendorStmtSelection.clear"
          />
          <div class="overflow-x-auto">
            <table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="vendorStmtSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="vendorStmtSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
            </tr></thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="(r, i) in vendorStmtTable.rows.value" :key="i" class="hover:bg-gray-50">
                <td class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select statement row" :checked="vendorStmtSelection.isSelected(r)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="vendorStmtSelection.toggle(r)" /></td>
                <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ fmtDate(r.date) }}</td>
                <td class="px-4 py-3"><span :class="r.type === 'Bill' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">{{ r.type }}</span></td>
                <td class="px-4 py-3 text-xs text-gray-400">{{ r.ref || '—' }}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">{{ r.description || '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="r.debit ? 'text-red-600 font-medium' : 'text-gray-300'">{{ r.debit ? fmt(r.debit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums" :class="r.credit ? 'text-green-600 font-medium' : 'text-gray-300'">{{ r.credit ? fmt(r.credit) : '—' }}</td>
                <td class="px-4 py-3 text-right tabular-nums font-bold text-gray-900">{{ fmt(r.balance) }}</td>
              </tr>
              <tr v-if="!vendorStmtTable.filtered.value"><td colspan="8" class="px-4 py-10 text-center text-gray-400">No transactions.</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const { formatMoney } = useMoney()
const { formatDate } = useDateTime()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'
const tabs = [{ id: 'pl', label: 'P&L' }, { id: 'tb', label: 'Trial Balance' }, { id: 'client-stmt', label: 'Client Statement' }, { id: 'vendor-stmt', label: 'Vendor Statement' }]
const tab = ref('pl')
const fmt = (v) => formatMoney(v)
const fmtDate = formatDate

const pl = ref(null)
const plFilters = reactive({ period: 'financial_year', from: '', to: '' })
const plRows = computed(() => pl.value?.breakdown || [])
const plTable = useTableControls(plRows, {
  searchFields: ['name'],
})
const plSelection = useListingSelection(plTable, [
  { label: 'Category', field: 'name' }, { label: 'Revenue', field: (row) => fmt(row.revenue) }, { label: 'Cost', field: (row) => fmt(row.cost) },
  { label: 'Margin', field: (row) => fmt(row.margin) }, { label: 'Margin %', field: (row) => row.revenue ? `${((row.margin / row.revenue) * 100).toFixed(1)}%` : '' },
], 'profit-and-loss')
async function loadPl() {
  const qs = new URLSearchParams()
  if (plFilters.from) qs.append('from', plFilters.from)
  if (plFilters.to) qs.append('to', plFilters.to)
  pl.value = await request(`/reports/pl${qs.toString() ? '?' + qs : ''}`)
}

const tb = ref(null)
const tbFilters = reactive({ period: 'all', from: '', to: '' })
const tbRows = computed(() => tb.value?.rows || [])
const tbTable = useTableControls(tbRows, {
  searchFields: ['code', 'name', 'type'],
})
const tbSelection = useListingSelection(tbTable, [
  { label: 'Code', field: 'code' }, { label: 'Account', field: 'name' }, { label: 'Type', field: 'type' },
  { label: 'Debit', field: (row) => fmt(row.totalDebit) }, { label: 'Credit', field: (row) => fmt(row.totalCredit) },
], 'trial-balance')
async function loadTb() {
  const qs = new URLSearchParams()
  if (tbFilters.from) qs.append('from', tbFilters.from)
  if (tbFilters.to) qs.append('to', tbFilters.to)
  tb.value = await request(`/reports/trial-balance${qs.toString() ? '?' + qs : ''}`)
}

const clients = ref([]), stmtClientId = ref(''), clientStmt = ref(null), stmtFilters = reactive({ period: 'all', from: '', to: '' })
const clientStmtRows = computed(() => clientStmt.value?.rows || [])
const clientStmtTable = useTableControls(clientStmtRows, {
  searchFields: ['type', 'ref', 'description', (row) => fmtDate(row.date)],
})
const statementColumns = [
  { label: 'Date', field: (row) => fmtDate(row.date) }, { label: 'Type', field: 'type' }, { label: 'Reference', field: 'ref' },
  { label: 'Description', field: 'description' }, { label: 'Debit', field: (row) => fmt(row.debit) },
  { label: 'Credit', field: (row) => fmt(row.credit) }, { label: 'Balance', field: (row) => fmt(row.balance) },
]
const clientStmtSelection = useListingSelection(clientStmtTable, statementColumns, 'client-statement')
async function loadClients() { clients.value = await request('/reports/clients') }
async function loadClientStmt() {
  if (!stmtClientId.value) return
  const qs = new URLSearchParams()
  if (stmtFilters.from) qs.append('from', stmtFilters.from)
  if (stmtFilters.to) qs.append('to', stmtFilters.to)
  clientStmt.value = await request(`/reports/client-statement/${stmtClientId.value}${qs.toString() ? '?' + qs : ''}`)
  clientStmtTable.reset()
  toast.success('Client statement generated.')
}

const vendors = ref([]), stmtVendorId = ref(''), vendorStmt = ref(null)
const vendorStmtRows = computed(() => vendorStmt.value?.rows || [])
const vendorStmtTable = useTableControls(vendorStmtRows, {
  searchFields: ['type', 'ref', 'description', (row) => fmtDate(row.date)],
})
const vendorStmtSelection = useListingSelection(vendorStmtTable, statementColumns, 'vendor-statement')
async function loadVendors() { vendors.value = await request('/reports/vendors') }
async function loadVendorStmt() {
  if (!stmtVendorId.value) return
  const qs = new URLSearchParams()
  if (stmtFilters.from) qs.append('from', stmtFilters.from)
  if (stmtFilters.to) qs.append('to', stmtFilters.to)
  vendorStmt.value = await request(`/reports/vendor-statement/${stmtVendorId.value}${qs.toString() ? '?' + qs : ''}`)
  vendorStmtTable.reset()
  toast.success('Vendor statement generated.')
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
  toast.success('CSV report downloaded.')
}

function exportReport(type) {
  const suffix = `${plFilters.from || stmtFilters.from || 'all'}-${plFilters.to || stmtFilters.to || 'all'}`
  if (type === 'pl') {
    downloadCsv(`profit-and-loss-${suffix}.csv`, ['Category', 'Revenue', 'Cost', 'Margin', 'Margin %'],
      plTable.filteredRows.value.map((row) => [row.name, row.revenue, row.cost, row.margin, row.revenue ? ((row.margin / row.revenue) * 100).toFixed(2) : 0]))
  } else if (type === 'tb') {
    downloadCsv(`trial-balance-${tbFilters.from || 'all'}-${tbFilters.to || 'all'}.csv`, ['Code', 'Account', 'Type', 'Debit', 'Credit'],
      tbTable.filteredRows.value.map((row) => [row.code, row.name, row.type, row.totalDebit, row.totalCredit]))
  } else {
    const statement = type === 'client' ? clientStmt.value : vendorStmt.value
    const table = type === 'client' ? clientStmtTable : vendorStmtTable
    downloadCsv(`${type}-statement-${stmtFilters.from || 'all'}-${stmtFilters.to || 'all'}.csv`, ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      table.filteredRows.value.map((row) => [fmtDate(row.date), row.type, row.ref, row.description, row.debit, row.credit, row.balance]))
  }
}

function switchTab(t) { tab.value = t; if (t === 'tb' && !tb.value) loadTb() }
onMounted(async () => { await Promise.all([loadClients(), loadVendors(), loadPl()]) })
</script>
