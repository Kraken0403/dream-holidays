<template>
  <div class="page">
    <div class="page-head"><div><h1>Clients</h1><p class="sub">Customers and billing details.</p></div></div>
    <div class="grid grid-2">
      <MasterFormCard title="Add Client">
        <form class="form" @submit.prevent="save">
          <div class="form-row"><div class="field"><label>Name</label><input v-model="form.name" class="input" required /></div><div class="field"><label>Company Name</label><input v-model="form.companyName" class="input" /></div></div>
          <div class="form-row"><div class="field"><label>Phone</label><input v-model="form.phone" class="input" /></div><div class="field"><label>Email</label><input v-model="form.email" class="input" /></div></div>
          <div class="form-row"><div class="field"><label>GST</label><input v-model="form.gstNumber" class="input" /></div><div class="field"><label>State</label><input v-model="form.state" class="input" /></div></div>
          <div class="field"><label>Billing Address</label><textarea v-model="form.billingAddress" class="input"></textarea></div>
          <button class="btn">Save Client</button>
        </form>
      </MasterFormCard>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Contact</th><th>GST</th><th>State</th></tr></thead>
          <tbody><tr v-for="c in clients" :key="c.id"><td><strong>{{ c.name }}</strong><div class="muted">{{ c.companyName }}</div></td><td>{{ c.phone || c.email || '-' }}</td><td>{{ c.gstNumber || '-' }}</td><td>{{ c.state || '-' }}</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const clients = ref([])
const form = reactive({ name: '', companyName: '', phone: '', email: '', gstNumber: '', state: '', billingAddress: '' })
async function load() { clients.value = await request('/clients') }
async function save() { await request('/clients', { method: 'POST', body: form }); Object.assign(form, { name: '', companyName: '', phone: '', email: '', gstNumber: '', state: '', billingAddress: '' }); await load() }
onMounted(load)
</script>
