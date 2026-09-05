<template>
  <div>
    <PageHeader title="Global Settings" subtitle="Application-wide accounting and display defaults." />
    <SettingsTabs />

    <div class="max-w-2xl">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-700">
          <h2 class="text-base font-semibold text-white">Accounting Defaults</h2>
          <p class="text-violet-200 text-sm mt-0.5">Configure application-wide currency, financial year and date display.</p>
        </div>
        <form @submit.prevent="save" class="px-6 py-5 space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Financial Year Start Month</label>
              <input v-model.number="form.financialYearStartMonth" type="number" min="1" max="12" :class="INP" placeholder="4 = April" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Default Currency</label>
              <input v-model="form.defaultCurrency" :class="INP" placeholder="INR" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Date Format</label>
            <select v-model="form.dateFormat" :class="INP">
              <option value="DD/MM/YYYY">DD/MM/YYYY — 05/09/2026</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY — 09/05/2026</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD — 2026-09-05</option>
              <option value="DD MMM YYYY">DD MMM YYYY — 05 Sep 2026</option>
              <option value="MMM DD, YYYY">MMM DD, YYYY — Sep 05, 2026</option>
            </select>
            <p class="mt-1 text-xs text-gray-400">Used for every displayed date throughout the application.</p>
          </div>
          <div class="pt-2">
            <button type="submit" class="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-violet-700">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3h11l3 3v15H5V3Zm3 0v6h8V3M8 21v-8h8v8"/></svg> Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow'
const form = reactive({ financialYearStartMonth: 4, defaultCurrency: 'INR', dateFormat: 'DD/MM/YYYY' })
const globalSettings = useState('global-settings', () => ({ dateFormat: 'DD/MM/YYYY' }))
async function load() { const data = await request('/settings'); Object.assign(form, data) }
async function save() {
  await request('/settings', { method: 'PUT', body: form })
  await load()
  globalSettings.value = { ...globalSettings.value, ...form }
  toast.success('Settings updated.')
}
onMounted(load)
</script>
