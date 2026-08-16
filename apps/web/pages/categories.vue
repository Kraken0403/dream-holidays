<template>
  <div>
    <PageHeader title="Categories" subtitle="Service categories and subcategories used in booking items." />
    <SettingsTabs />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Add Form -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600">
          <h2 class="text-base font-semibold text-white">Add Category / Subcategory</h2>
          <p class="text-emerald-100 text-sm mt-0.5">Leave parent empty to create a top-level category.</p>
        </div>
        <form @submit.prevent="save" class="px-6 py-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input v-model="form.name" :class="INP" required placeholder="e.g. Hotel, Air Ticket, Visa" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Parent Category</label>
            <select v-model="form.parentId" :class="INP">
              <option :value="null">None (top-level)</option>
              <option v-for="c in parents" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <button type="submit" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            Save Category
          </button>
        </form>
      </div>

      <!-- Tree Table -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-900">All Categories</h2>
          <span class="text-sm text-gray-500">{{ tree.length }} top-level</span>
        </div>
        <TableControls
          v-model:search="categoryTable.search.value"
          v-model:page="categoryTable.page.value"
          v-model:page-size="categoryTable.pageSize.value"
          :page-size-options="categoryTable.pageSizeOptions"
          :total="categoryTable.total.value"
          :filtered="categoryTable.filtered.value"
          :start="categoryTable.start.value"
          :end="categoryTable.end.value"
          search-placeholder="Search categories..."
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subcategories</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="c in categoryTable.rows.value" :key="c.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 font-semibold text-gray-900">{{ c.name }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1.5" v-if="(c.children || []).length">
                    <span v-for="sub in c.children" :key="sub.id"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {{ sub.name }}
                    </span>
                  </div>
                  <span v-else class="text-gray-400 text-xs">No subcategories</span>
                </td>
              </tr>
              <tr v-if="!categoryTable.filtered.value">
                <td colspan="2" class="px-4 py-10 text-center text-gray-400">No categories yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow'
const tree = ref([])
const parents = computed(() => tree.value)
const form = reactive({ name: '', parentId: null })
const categoryTable = useTableControls(tree, {
  searchFields: ['name', (category) => (category.children || []).map((child) => child.name).join(' ')],
})
async function load() { tree.value = await request('/categories/tree') }
async function save() {
  await request('/categories', { method: 'POST', body: form })
  Object.assign(form, { name: '', parentId: null })
  await load()
  toast.success('Category saved.')
}
onMounted(load)
</script>
