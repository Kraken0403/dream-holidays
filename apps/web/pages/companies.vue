<template>
  <div>
    <PageHeader title="My Companies" subtitle="Billing entities from which invoices are issued.">
      <template #actions>
        <button type="button" @click="openCreate"
          class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Add Company
        </button>
      </template>
    </PageHeader>
    <SettingsTabs />

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <TableControls
        :controller="companyTable"
        v-model:search="companyTable.search.value"
        v-model:page="companyTable.page.value"
        v-model:page-size="companyTable.pageSize.value"
        :page-size-options="companyTable.pageSizeOptions"
        :total="companyTable.total.value"
        :filtered="companyTable.filtered.value"
        :start="companyTable.start.value"
        :end="companyTable.end.value"
        :rows="companyTable.rows.value"
        :available-columns="[{ key: 'legalName', label: 'Legal name' }, { key: 'gstNumber', label: 'GST number' }, { key: 'panNumber', label: 'PAN number' }, { key: 'email', label: 'Email' }, { key: 'state', label: 'State' }, { key: 'createdAt', label: 'Created at' }]"
        :filter-count="statusFilter ? 1 : 0"
        :active-filters="companyActiveFilters"
        exportable
        search-placeholder="Search companies, GST, PAN..."
        @export="companyExport.exportXls"
        @remove-filter="statusFilter = ''"
      >
        <template #filters>
          <div class="w-full sm:w-40">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select v-model="statusFilter" :class="INP">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST / PAN</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Prefix</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bank Accounts</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in companyTable.rows.value" :key="c.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0 overflow-hidden">
                    <img v-if="c.logoUrl" :src="c.logoUrl" :alt="`${c.name} logo`" class="w-full h-full object-contain" />
                    <span v-else>{{ c.name?.charAt(0) }}</span>
                  </div>
                  <div>
                    <div class="font-semibold text-gray-900">{{ c.name }}</div>
                    <div class="text-xs text-gray-400">{{ c.legalName || '' }}</div>
                    <div class="text-xs text-gray-400">{{ c.email || '' }}{{ c.phone ? ' · ' + c.phone : '' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-gray-700">{{ c.gstNumber || '—' }}</div>
                <div class="text-xs text-gray-400">{{ c.panNumber || '' }}</div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{{ c.invoicePrefix }}</span>
              </td>
              <td class="px-4 py-3">
                <div v-if="c.bankAccounts?.length" class="text-xs text-gray-600 space-y-0.5">
                  <div v-for="b in c.bankAccounts" :key="b.id">{{ b.bankName }} · ···{{ String(b.accountNumber || '').slice(-4) }}</div>
                </div>
                <span v-else class="text-gray-400 text-xs">—</span>
              </td>
              <td class="px-4 py-3">
                <span :class="c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {{ c.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button type="button" @click="openEdit(c)" class="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m15.2 5.2 3.6 3.6M4 20l4.5-1 10.3-10.2a2.55 2.55 0 0 0-3.6-3.6L5 15.5 4 20Z"/></svg>Edit</button>
                  <button type="button" @click="deactivate(c)" class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>Deactivate</button>
                </div>
              </td>
            </tr>
            <tr v-if="!companyTable.filtered.value">
              <td colspan="6" class="px-4 py-10 text-center text-gray-400">No companies found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Company Modal -->
    <AppModal v-model="showModal" :title="editId ? 'Edit Company' : 'Add Company'" subtitle="Configure billing entity details and bank accounts" size="xl" color="blue">
      <form id="co-form" @submit.prevent="save" class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Name <span class="required-mark">*</span></label><input v-model="form.name" placeholder="Company name" :class="INP" required /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Legal Name</label><input v-model="form.legalName" :class="INP" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">GST Number</label><input v-model="form.gstNumber" :class="INP" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">PAN Number</label><input v-model="form.panNumber" :class="INP" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input v-model="form.email" type="email" :class="INP" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Phone</label><input v-model="form.phone" :class="INP" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Invoice Prefix <span class="required-mark">*</span></label><input v-model="form.invoicePrefix" :class="INP" required placeholder="DH" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Proforma Prefix</label><input v-model="form.proformaPrefix" :class="INP" placeholder="PI" /></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Address</label><textarea v-model="form.addressLine1" :class="INP" rows="2"></textarea></div>
        <div class="grid grid-cols-4 gap-3">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">City</label><input v-model="form.city" :class="INP" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">State</label><StateSelect v-model="form.state" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Country</label><input v-model="form.country" :class="INP" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label><input v-model="form.pincode" :class="INP" /></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Invoice Terms</label><textarea v-model="form.invoiceTerms" :class="INP" rows="2" placeholder="e.g. Payment due within 30 days."></textarea></div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
          <input type="file" accept="image/*" @change="uploadLogo" :class="INP" />
          <p class="mt-1 text-xs text-gray-400">{{ logoStatus }}</p>
        </div>

        <!-- Bank Accounts -->
        <div class="border-t border-gray-200 pt-5">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-sm font-semibold text-gray-900">Bank Accounts</h4>
            <button type="button" @click="addBank" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Bank</button>
          </div>
          <div v-for="(b, i) in form.bankAccounts" :key="i" class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Bank Name</label><input v-model="b.bankName" :class="INP + ' bg-white'" /></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Name</label><input v-model="b.accountName" :class="INP + ' bg-white'" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div><label class="block text-xs font-medium text-gray-600 mb-1">Account Number</label><input v-model="b.accountNumber" :class="INP + ' bg-white'" /></div>
              <div><label class="block text-xs font-medium text-gray-600 mb-1">IFSC Code</label><input v-model="b.ifscCode" :class="INP + ' bg-white'" /></div>
            </div>
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input type="checkbox" v-model="b.isDefault" @change="setDefault(i)" class="rounded" />
                Set as default
              </label>
              <button type="button" @click="removeBank(i)" class="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>Remove</button>
            </div>
          </div>
          <p v-if="!form.bankAccounts.length" class="text-sm text-gray-400">No bank accounts added.</p>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showModal = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="co-form" :disabled="saving" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg">
          {{ saving ? 'Saving…' : editId ? 'Update Company' : 'Save Company' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const companies = ref([])
const statusFilter = ref('')
const showModal = ref(false)
const editId = ref(null)
const saving = ref(false)
const logoStatus = ref('')
const filteredCompanies = computed(() => {
  if (!statusFilter.value) return companies.value
  const active = statusFilter.value === 'active'
  return companies.value.filter((company) => Boolean(company.active) === active)
})
const companyActiveFilters = computed(() => statusFilter.value ? [{ key: 'status', label: `Status: ${statusFilter.value === 'active' ? 'Active' : 'Inactive'}` }] : [])
const companyTable = useTableControls(filteredCompanies, {
  searchFields: ['name', 'legalName', 'email', 'phone', 'gstNumber', 'panNumber', 'invoicePrefix'],
})
const companyExport = useListingSelection(companyTable, [
  { key: 'name', label: 'Company', field: row => [row.name, row.legalName, row.email, row.phone].filter(Boolean).join(' — ') },
  { key: 'taxIds', label: 'GST / PAN', field: row => [row.gstNumber, row.panNumber].filter(Boolean).join(' / ') },
  { key: 'invoicePrefix', label: 'Invoice Prefix', field: 'invoicePrefix' },
  { key: 'bankAccounts', label: 'Bank Accounts', field: row => (row.bankAccounts || []).map(account => `${account.bankName} · ${account.accountNumber}`).join(', ') },
  { key: 'active', label: 'Status', field: row => row.active ? 'Active' : 'Inactive' },
], 'companies')

const blankForm = () => ({
  name: '', legalName: '', gstNumber: '', panNumber: '',
  invoicePrefix: 'DH', proformaPrefix: 'PI',
  email: '', phone: '', addressLine1: '', city: '', state: '',
  country: 'India', pincode: '', invoiceTerms: '', logoUrl: '',
  bankAccounts: [],
})
const form = reactive(blankForm())

function resetForm() { Object.assign(form, blankForm()); logoStatus.value = ''; editId.value = null }
function openCreate() { resetForm(); showModal.value = true }
function openEdit(c) {
  resetForm(); editId.value = c.id
  Object.assign(form, {
    name: c.name || '', legalName: c.legalName || '', gstNumber: c.gstNumber || '',
    panNumber: c.panNumber || '', invoicePrefix: c.invoicePrefix || 'DH',
    proformaPrefix: c.proformaPrefix || 'PI', email: c.email || '',
    phone: c.phone || '', addressLine1: c.addressLine1 || '',
    city: c.city || '', state: c.state || '', country: c.country || 'India',
    pincode: c.pincode || '', invoiceTerms: c.invoiceTerms || '',
    logoUrl: c.logoUrl || '',
    bankAccounts: (c.bankAccounts || []).map(b => ({ ...b })),
  })
  showModal.value = true
}
function addBank() { form.bankAccounts.push({ bankName: '', accountName: '', accountNumber: '', ifscCode: '', branch: '', isDefault: false }) }
function removeBank(i) { form.bankAccounts.splice(i, 1) }
function setDefault(i) { form.bankAccounts.forEach((b, idx) => { b.isDefault = idx === i }) }
async function load() { companies.value = await request('/companies') }
async function uploadLogo(event) {
  const file = event.target.files?.[0]; if (!file) return
  logoStatus.value = 'Uploading…'
  const body = new FormData(); body.append('file', file)
  const uploaded = await request('/uploads/company-logo', { method: 'POST', body })
  form.logoUrl = uploaded.url; logoStatus.value = file.name
  toast.success('Company logo uploaded.')
}
async function deactivate(c) {
  if (!confirm(`Deactivate "${c.name}"?`)) return
  await request(`/companies/${c.id}`, { method: 'DELETE' }); await load()
  toast.success('Company deactivated.')
}
async function save() {
  saving.value = true
  const wasEditing = Boolean(editId.value)
  try {
    if (editId.value) { await request(`/companies/${editId.value}`, { method: 'PATCH', body: { ...form } }) }
    else { await request('/companies', { method: 'POST', body: { ...form } }) }
    showModal.value = false; resetForm(); await load()
    toast.success(wasEditing ? 'Company updated.' : 'Company created.')
  } finally { saving.value = false }
}
onMounted(load)
</script>
