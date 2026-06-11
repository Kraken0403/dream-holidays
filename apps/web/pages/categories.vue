<template>
  <div class="page">
    <div class="page-head"><div><h1>Categories</h1><p class="sub">Service categories and subcategories used in booking items.</p></div></div>
    <div class="grid grid-2">
      <MasterFormCard title="Add Category/Subcategory">
        <form class="form" @submit.prevent="save">
          <div class="field"><label>Name</label><input v-model="form.name" class="input" required /></div>
          <div class="field"><label>Parent Category</label><select v-model="form.parentId" class="input"><option :value="null">None</option><option v-for="c in parents" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
          <button class="btn">Save Category</button>
        </form>
      </MasterFormCard>
      <div class="card table-wrap">
        <table>
          <thead><tr><th>Category</th><th>Subcategories</th></tr></thead>
          <tbody>
            <tr v-for="c in tree" :key="c.id"><td><strong>{{ c.name }}</strong></td><td>{{ (c.children || []).map(x => x.name).join(', ') || '-' }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const tree = ref([])
const parents = computed(() => tree.value)
const form = reactive({ name: '', parentId: null })
async function load() { tree.value = await request('/categories/tree') }
async function save() { await request('/categories', { method: 'POST', body: form }); Object.assign(form, { name: '', parentId: null }); await load() }
onMounted(load)
</script>
