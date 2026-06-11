<template>
  <div>
    <PageHeader title="Global Settings" subtitle="Invoice, payment and accounting defaults." />

    <div class="max-w-2xl">
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-700">
          <h2 class="text-base font-semibold text-white">Accounting Defaults</h2>
          <p class="text-violet-200 text-sm mt-0.5">Configure how invoices are numbered and payment defaults.</p>
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
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Invoice Number Format</label>
              <input v-model="form.invoiceNumberFormat" :class="INP" placeholder="{PREFIX}/{FY}/{NUMBER}" />
              <p class="mt-1 text-xs text-gray-400">Available: {PREFIX}, {FY}, {NUMBER}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Default Due Days</label>
              <input v-model.number="form.defaultDueDays" type="number" :class="INP" placeholder="7" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Modes</label>
            <input v-model="paymentModesText" :class="INP" placeholder="Cash, Bank Transfer, Cheque, UPI" />
            <p class="mt-1 text-xs text-gray-400">Comma-separated list of accepted payment modes.</p>
          </div>
          <div class="pt-2">
            <button type="submit" class="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              Update Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow'
const form = reactive({ financialYearStartMonth: 4, defaultCurrency: 'INR', invoiceNumberFormat: '{PREFIX}/{FY}/{NUMBER}', defaultDueDays: 7, paymentModes: [] })
const paymentModesText = ref('')
async function load() { const data = await request('/settings'); Object.assign(form, data); paymentModesText.value = (data.paymentModes || []).join(', ') }
async function save() { form.paymentModes = paymentModesText.value.split(',').map(x => x.trim()).filter(Boolean); await request('/settings', { method: 'PUT', body: form }); await load() }
onMounted(load)
</script>
