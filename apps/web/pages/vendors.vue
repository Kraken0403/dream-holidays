<template>
  <div>
    <PageHeader title="Vendors" subtitle="Service provider master with category links.">
      <template #actions>
        <button @click="openCreate" class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Add Vendor
        </button>
      </template>
    </PageHeader>
    <SettingsTabs />

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <TableControls
        v-model:search="vendorTable.search.value"
        v-model:page="vendorTable.page.value"
        v-model:page-size="vendorTable.pageSize.value"
        :page-size-options="vendorTable.pageSizeOptions"
        :total="vendorTable.total.value"
        :filtered="vendorTable.filtered.value"
        :start="vendorTable.start.value"
        :end="vendorTable.end.value"
        exportable
        :selected-count="vendorSelection.selectedCount.value"
        :filter-count="categoryFilter ? 1 : 0"
        search-placeholder="Search vendors, contact, GST..."
        @export="vendorSelection.exportXls"
        @clear-selection="vendorSelection.clear"
      >
        <template #filters>
          <div class="w-full sm:w-56">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select v-model="categoryFilter" :class="INP">
              <option value="">All</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent ? c.parent.name + ' / ' : '' }}{{ c.name }}</option>
            </select>
          </div>
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="vendorSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="vendorSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categories</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">GST</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="v in vendorTable.rows.value" :key="v.id" class="hover:bg-gray-50 transition-colors">
              <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${v.name}`" :checked="vendorSelection.isSelected(v)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="vendorSelection.toggle(v)" /></td>
              <td class="px-4 py-3"><div class="font-semibold text-gray-900">{{ v.name }}</div><div class="text-gray-400 text-xs">{{ v.code || '' }}</div></td>
              <td class="px-4 py-3 text-gray-600">{{ v.phone || v.email || '—' }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  <span v-for="l in v.categoryLinks" :key="l.category.id" class="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">{{ l.category.name }}</span>
                  <span v-if="!v.categoryLinks?.length" class="text-gray-400 text-xs">—</span>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-600">{{ v.gstNumber || '—' }}</td>
            </tr>
            <tr v-if="!vendorTable.filtered.value"><td colspan="5" class="px-4 py-10 text-center text-gray-400">No vendors found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <AppModal v-model="showModal" title="Add Vendor" subtitle="Service provider and category details" size="md" color="violet">
      <form id="vendor-form" @submit.prevent="save" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Name *</label><input v-model="form.name" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Phone</label><input v-model="form.phone" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input v-model="form.email" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
          <div><label class="block text-sm font-medium text-gray-700 mb-1.5">GST</label><input v-model="form.gstNumber" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Categories</label>
          <select v-model="form.categoryIds" multiple class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" style="min-height:120px;">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent ? c.parent.name + ' / ' : '' }}{{ c.name }}</option>
          </select>
          <p class="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showModal = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
        <button type="submit" form="vendor-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Save Vendor</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const vendors = ref([]), categories = ref([])
const categoryFilter = ref('')
const showModal = ref(false)
const form = reactive({ name: '', phone: '', email: '', gstNumber: '', categoryIds: [] })
const filteredVendors = computed(() => {
  if (!categoryFilter.value) return vendors.value
  return vendors.value.filter((vendor) => (vendor.categoryLinks || []).some((link) => Number(link.category?.id) === Number(categoryFilter.value)))
})
const vendorTable = useTableControls(filteredVendors, {
  searchFields: [
    'name',
    'code',
    'phone',
    'email',
    'gstNumber',
    (vendor) => (vendor.categoryLinks || []).map((link) => link.category?.name).join(' '),
  ],
})
const vendorSelection = useListingSelection(vendorTable, [
  { label: 'Vendor', field: 'name' }, { label: 'Code', field: 'code' }, { label: 'Phone', field: 'phone' }, { label: 'Email', field: 'email' },
  { label: 'Categories', field: (row) => (row.categoryLinks || []).map((link) => link.category?.name).join(', ') }, { label: 'GST', field: 'gstNumber' },
], 'vendors')
function openCreate() { Object.assign(form, { name: '', phone: '', email: '', gstNumber: '', categoryIds: [] }); showModal.value = true }
async function load() { vendors.value = await request('/vendors'); categories.value = await request('/categories') }
async function save() {
  await request('/vendors', { method: 'POST', body: { ...form } })
  showModal.value = false
  await load()
  toast.success('Vendor created.')
}
onMounted(load)
</script>
