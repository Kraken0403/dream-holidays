<template>
  <div class="page">
    <div class="page-head"><div><h1>Global Settings</h1><p class="sub">Invoice, payment and accounting defaults.</p></div></div>
    <MasterFormCard title="Accounting Defaults">
      <form class="form" @submit.prevent="save">
        <div class="form-row">
          <div class="field"><label>Financial Year Start Month</label><input v-model.number="form.financialYearStartMonth" class="input" type="number" min="1" max="12" /></div>
          <div class="field"><label>Default Currency</label><input v-model="form.defaultCurrency" class="input" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Invoice Number Format</label><input v-model="form.invoiceNumberFormat" class="input" /></div>
          <div class="field"><label>Default Due Days</label><input v-model.number="form.defaultDueDays" class="input" type="number" /></div>
        </div>
        <div class="field"><label>Payment Modes, comma separated</label><input v-model="paymentModesText" class="input" /></div>
        <button class="btn">Update Settings</button>
      </form>
    </MasterFormCard>
  </div>
</template>
<script setup>
const { request } = useApi()
const form = reactive({ financialYearStartMonth: 4, defaultCurrency: 'INR', invoiceNumberFormat: '{PREFIX}/{FY}/{NUMBER}', defaultDueDays: 7, paymentModes: [] })
const paymentModesText = ref('')
async function load() { const data = await request('/settings'); Object.assign(form, data); paymentModesText.value = (data.paymentModes || []).join(', ') }
async function save() { form.paymentModes = paymentModesText.value.split(',').map(x => x.trim()).filter(Boolean); await request('/settings', { method: 'PUT', body: form }); await load() }
onMounted(load)
</script>
