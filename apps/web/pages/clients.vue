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
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="c in clients" :key="c.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ c.name }}</div>
                <div class="text-gray-400 text-xs">{{ c.companyName || '' }}</div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ c.phone || c.email || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.gstNumber || '—' }}</td>
              <td class="px-4 py-3 text-gray-600">{{ c.state || '—' }}</td>
            </tr>
            <tr v-if="!clients.length"><td colspan="4" class="px-4 py-10 text-center text-gray-400">No clients yet.</td></tr>
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
const clients = ref([])
const showModal = ref(false)
const editId = ref(null)
const blank = () => ({ name: '', companyName: '', phone: '', email: '', gstNumber: '', state: '', billingAddress: '' })
const form = reactive(blank())
function openCreate() { editId.value = null; Object.assign(form, blank()); showModal.value = true }
async function load() { clients.value = await request('/clients') }
async function save() {
  if (editId.value) {
    await request(`/clients/${editId.value}`, { method: 'PATCH', body: { ...form } })
  } else {
    await request('/clients', { method: 'POST', body: { ...form } })
  }
  showModal.value = false
  await load()
}
onMounted(load)
</script>
