<template>
  <div class="page">
    <div class="page-head"><div><h1>Vendors</h1><p class="sub">Vendor master with linked service categories.</p></div></div>
    <div class="grid grid-2">
      <MasterFormCard title="Add Vendor">
        <form class="form" @submit.prevent="save">
          <div class="form-row"><div class="field"><label>Name</label><input v-model="form.name" class="input" required /></div><div class="field"><label>Phone</label><input v-model="form.phone" class="input" /></div></div>
          <div class="form-row"><div class="field"><label>Email</label><input v-model="form.email" class="input" /></div><div class="field"><label>GST</label><input v-model="form.gstNumber" class="input" /></div></div>
          <div class="field"><label>Categories</label><select v-model="form.categoryIds" multiple class="input" style="min-height: 130px;"><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent ? c.parent.name + ' / ' : '' }}{{ c.name }}</option></select></div>
          <button class="btn">Save Vendor</button>
        </form>
      </MasterFormCard>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Vendor</th><th>Contact</th><th>Categories</th></tr></thead>
          <tbody><tr v-for="v in vendors" :key="v.id"><td><strong>{{ v.name }}</strong></td><td>{{ v.phone || v.email || '-' }}</td><td>{{ v.categoryLinks?.map(x => x.category.name).join(', ') }}</td></tr></tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const vendors = ref([])
const categories = ref([])
const form = reactive({ name: '', phone: '', email: '', gstNumber: '', categoryIds: [] })
async function load() { vendors.value = await request('/vendors'); categories.value = await request('/categories') }
async function save() { await request('/vendors', { method: 'POST', body: form }); Object.assign(form, { name: '', phone: '', email: '', gstNumber: '', categoryIds: [] }); await load() }
onMounted(load)
</script>
