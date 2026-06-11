<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Companies</h1><p class="sub">Billing companies from which invoices can be issued.</p></div>
    </div>
    <div class="toolbar">
      <div class="muted">{{ companies.length }} companies</div>
      <button class="btn" type="button" @click="openCreate">Add Company</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Company</th><th>GST</th><th>Prefix</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="c in companies" :key="c.id">
            <td>
              <div style="display:flex; gap:10px; align-items:center;">
                <div class="logo-preview"><img v-if="c.logoUrl" :src="c.logoUrl" :alt="`${c.name} logo`" /><span v-else>{{ c.name?.charAt(0) }}</span></div>
                <div><strong>{{ c.name }}</strong><div class="muted">{{ c.legalName || '-' }}</div></div>
              </div>
            </td>
            <td>{{ c.gstNumber || '-' }}</td>
            <td>{{ c.invoicePrefix }}</td>
            <td><span class="badge">Active</span></td>
          </tr>
          <tr v-if="!companies.length"><td colspan="4" class="muted">No companies found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">Add Company</h2>
          <button class="btn ghost small" type="button" @click="showModal = false">Close</button>
        </div>
        <form class="form" @submit.prevent="save">
          <div class="modal-body form">
            <div class="form-row">
              <div class="field"><label>Name</label><input v-model="form.name" class="input" required /></div>
              <div class="field"><label>Legal Name</label><input v-model="form.legalName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>GST</label><input v-model="form.gstNumber" class="input" /></div>
              <div class="field"><label>Invoice Prefix</label><input v-model="form.invoicePrefix" class="input" required /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Email</label><input v-model="form.email" class="input" type="email" /></div>
              <div class="field"><label>Phone</label><input v-model="form.phone" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Logo</label>
                <input class="input" type="file" accept="image/*" @change="uploadLogo" />
                <div class="muted" style="margin-top:6px;">{{ logoStatus }}</div>
              </div>
              <div class="field">
                <label>Preview</label>
                <div class="logo-preview"><img v-if="form.logoUrl" :src="form.logoUrl" alt="Company logo preview" /><span v-else>Logo</span></div>
              </div>
            </div>
            <div class="field"><label>Address</label><textarea v-model="form.addressLine1" class="input"></textarea></div>
          </div>
          <div class="modal-actions">
            <button class="btn secondary" type="button" @click="showModal = false">Cancel</button>
            <button class="btn">Save Company</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const companies = ref([])
const showModal = ref(false)
const logoStatus = ref('')
const blankForm = () => ({ name: '', legalName: '', gstNumber: '', invoicePrefix: 'DH', email: '', phone: '', addressLine1: '', logoUrl: '' })
const form = reactive(blankForm())
function resetForm() { Object.assign(form, blankForm()); logoStatus.value = '' }
function openCreate() { resetForm(); showModal.value = true }
async function load() { companies.value = await request('/companies') }
async function uploadLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  logoStatus.value = 'Uploading...'
  const body = new FormData()
  body.append('file', file)
  const uploaded = await request('/uploads/company-logo', { method: 'POST', body })
  form.logoUrl = uploaded.url
  logoStatus.value = file.name
}
async function save() {
  await request('/companies', { method: 'POST', body: form })
  showModal.value = false
  resetForm()
  await load()
}
onMounted(load)
</script>
