<template>
  <div>
    <PageHeader title="Clients" subtitle="Customer master — billing contacts and details.">
      <template #actions>
        <button @click="openCreate" class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Add Client
        </button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <TableControls
        v-model:search="clientTable.search.value"
        v-model:page="clientTable.page.value"
        v-model:page-size="clientTable.pageSize.value"
        :page-size-options="clientTable.pageSizeOptions"
        :total="clientTable.total.value"
        :filtered="clientTable.filtered.value"
        :start="clientTable.start.value"
        :end="clientTable.end.value"
        exportable
        :selected-count="clientSelection.selectedCount.value"
        :filter-count="stateFilter ? 1 : 0"
        search-placeholder="Search clients, phone, email..."
        @export="clientSelection.exportXls"
        @clear-selection="clientSelection.clear"
      >
        <template #filters>
          <div class="w-full sm:w-44">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">State</label>
            <select v-model="stateFilter" :class="INP">
              <option value="">All</option>
              <option v-for="state in states" :key="state" :value="state">{{ state }}</option>
            </select>
          </div>
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="clientSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="clientSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in clientTable.rows.value" :key="c.id" class="hover:bg-gray-50 transition-colors">
              <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${c.name}`" :checked="clientSelection.isSelected(c)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="clientSelection.toggle(c)" /></td>
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ c.name }}</div>
                <div class="text-gray-400 text-xs">{{ c.companyName || '' }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ c.phone || c.email || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.gstNumber || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.state || '—' }}</td>
            </tr>
            <tr v-if="!clientTable.filtered.value"><td colspan="5" class="px-4 py-10 text-center text-gray-400">No clients found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal v-model="showModal" :title="editId ? 'Edit Client' : 'Add Client'" subtitle="Client billing contact details" size="md" color="blue">
      <form id="client-form" @submit.prevent="save" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Name *</label><input v-model="form.name" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label><input v-model="form.companyName" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Phone</label><input v-model="form.phone" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input v-model="form.email" type="email" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">GST Number</label><input v-model="form.gstNumber" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">State</label><input v-model="form.state" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" /></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Billing Address</label><textarea v-model="form.billingAddress" rows="2" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"></textarea></div>
      </form>
      <template #footer>
        <button type="button" @click="showModal = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
        <button type="submit" form="client-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">{{ editId ? 'Update' : 'Save Client' }}</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const clients = ref([])
const stateFilter = ref('')
const showModal = ref(false)
const editId = ref(null)
const blank = () => ({ name: '', companyName: '', phone: '', email: '', gstNumber: '', state: '', billingAddress: '' })
const form = reactive(blank())
const states = computed(() => [...new Set(clients.value.map((client) => client.state).filter(Boolean))].sort())
const filteredClients = computed(() => stateFilter.value ? clients.value.filter((client) => client.state === stateFilter.value) : clients.value)
const clientTable = useTableControls(filteredClients, {
  searchFields: ['name', 'companyName', 'phone', 'email', 'gstNumber', 'state'],
})
const clientSelection = useListingSelection(clientTable, [
  { label: 'Name', field: 'name' }, { label: 'Company', field: 'companyName' }, { label: 'Phone', field: 'phone' },
  { label: 'Email', field: 'email' }, { label: 'GST', field: 'gstNumber' }, { label: 'State', field: 'state' }, { label: 'Billing Address', field: 'billingAddress' },
], 'clients')
function openCreate() { editId.value = null; Object.assign(form, blank()); showModal.value = true }
async function load() { clients.value = await request('/clients') }
async function save() {
  const wasEditing = Boolean(editId.value)
  if (editId.value) {
    await request(`/clients/${editId.value}`, { method: 'PATCH', body: { ...form } })
  } else {
    await request('/clients', { method: 'POST', body: { ...form } })
  }
  showModal.value = false
  await load()
  toast.success(wasEditing ? 'Client updated.' : 'Client created.')
}
onMounted(load)
</script>
