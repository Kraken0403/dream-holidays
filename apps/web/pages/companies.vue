<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Companies</h1><p class="sub">Billing entities from which invoices are issued.</p></div>
      <button class="btn" type="button" @click="openCreate">+ Add Company</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead>
          <tr><th>Company</th><th>GST / PAN</th><th>Prefix</th><th>Bank Accounts</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in companies" :key="c.id">
            <td>
              <div style="display:flex;gap:10px;align-items:center;">
                <div class="logo-preview"><img v-if="c.logoUrl" :src="c.logoUrl" :alt="`${c.name} logo`" /><span v-else>{{ c.name?.charAt(0) }}</span></div>
                <div>
                  <strong>{{ c.name }}</strong>
                  <div class="muted">{{ c.legalName || '' }}</div>
                  <div class="muted" style="font-size:12px;">{{ c.email || '' }} {{ c.phone ? '· ' + c.phone : '' }}</div>
                </div>
              </div>
            </td>
            <td>
              <div>{{ c.gstNumber || '—' }}</div>
              <div class="muted">{{ c.panNumber || '' }}</div>
            </td>
            <td>
              <span class="badge">{{ c.invoicePrefix }}</span>
            </td>
            <td>
              <div v-if="c.bankAccounts?.length" style="font-size:13px;">
                <div v-for="b in c.bankAccounts" :key="b.id">{{ b.bankName }} · {{ b.accountNumber }}</div>
              </div>
              <span v-else class="muted">—</span>
            </td>
            <td><span class="badge" :class="c.active ? '' : 'badge-danger'">{{ c.active ? 'Active' : 'Inactive' }}</span></td>
            <td>
              <div class="inline-form">
                <button class="btn ghost small" type="button" @click="openEdit(c)">Edit</button>
                <button class="btn ghost small danger" type="button" @click="deactivate(c)">Deactivate</button>
              </div>
            </td>
          </tr>
          <tr v-if="!companies.length"><td colspan="6" class="muted" style="text-align:center;padding:32px;">No companies found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">{{ editId ? 'Edit Company' : 'Add Company' }}</h2>
          <button class="btn ghost small" type="button" @click="showModal = false">Close</button>
        </div>
        <form class="form" @submit.prevent="save">
          <div class="modal-body form">
            <div class="form-row">
              <div class="field"><label>Name *</label><input v-model="form.name" class="input" required /></div>
              <div class="field"><label>Legal Name</label><input v-model="form.legalName" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>GST Number</label><input v-model="form.gstNumber" class="input" /></div>
              <div class="field"><label>PAN Number</label><input v-model="form.panNumber" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Email</label><input v-model="form.email" class="input" type="email" /></div>
              <div class="field"><label>Phone</label><input v-model="form.phone" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Invoice Prefix *</label><input v-model="form.invoicePrefix" class="input" required /></div>
              <div class="field"><label>Proforma Prefix</label><input v-model="form.proformaPrefix" class="input" /></div>
            </div>
            <div class="field"><label>Address</label><textarea v-model="form.addressLine1" class="input" rows="2"></textarea></div>
            <div class="form-row">
              <div class="field"><label>City</label><input v-model="form.city" class="input" /></div>
              <div class="field"><label>State</label><input v-model="form.state" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Country</label><input v-model="form.country" class="input" /></div>
              <div class="field"><label>Pincode</label><input v-model="form.pincode" class="input" /></div>
            </div>
            <div class="field"><label>Invoice Terms</label><textarea v-model="form.invoiceTerms" class="input" rows="2" placeholder="e.g. Payment due within 30 days."></textarea></div>
            <div class="form-row">
              <div class="field">
                <label>Logo</label>
                <input class="input" type="file" accept="image/*" @change="uploadLogo" />
                <div class="muted" style="margin-top:6px;">{{ logoStatus }}</div>
              </div>
              <div class="field">
                <label>Preview</label>
                <div class="logo-preview" style="width:80px;height:80px;"><img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo" /><span v-else>Logo</span></div>
              </div>
            </div>

            <!-- Bank Accounts -->
            <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                <strong style="font-size:14px;">Bank Accounts</strong>
                <button class="btn ghost small" type="button" @click="addBank">+ Add Bank</button>
              </div>
              <div v-for="(b, i) in form.bankAccounts" :key="i" class="item-box" style="margin-bottom:10px;">
                <div class="form-row" style="margin-bottom:8px;">
                  <div class="field"><label>Bank Name</label><input v-model="b.bankName" class="input" /></div>
                  <div class="field"><label>Account Name</label><input v-model="b.accountName" class="input" /></div>
                </div>
                <div class="form-row" style="margin-bottom:8px;">
                  <div class="field"><label>Account Number</label><input v-model="b.accountNumber" class="input" /></div>
                  <div class="field"><label>IFSC Code</label><input v-model="b.ifscCode" class="input" /></div>
                </div>
                <div class="form-row">
                  <div class="field"><label>Branch</label><input v-model="b.branch" class="input" /></div>
                  <div class="field" style="display:flex;align-items:flex-end;gap:12px;">
                    <label style="display:flex;gap:8px;align-items:center;cursor:pointer;">
                      <input type="checkbox" v-model="b.isDefault" @change="setDefault(i)" />
                      Default
                    </label>
                    <button class="btn ghost small danger" type="button" @click="removeBank(i)">Remove</button>
                  </div>
                </div>
              </div>
              <div v-if="!form.bankAccounts.length" class="muted" style="font-size:13px;">No bank accounts added.</div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn secondary" type="button" @click="showModal = false">Cancel</button>
            <button class="btn" :disabled="saving">{{ saving ? 'Saving…' : editId ? 'Update Company' : 'Save Company' }}</button>
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
const editId = ref(null)
const saving = ref(false)
const logoStatus = ref('')

const blankForm = () => ({
  name: '', legalName: '', gstNumber: '', panNumber: '',
  invoicePrefix: 'DH', proformaPrefix: 'PI',
  email: '', phone: '', addressLine1: '', city: '', state: '',
  country: 'India', pincode: '', invoiceTerms: '', logoUrl: '',
  bankAccounts: [],
})
const form = reactive(blankForm())

function resetForm() { Object.assign(form, blankForm()); logoStatus.value = ''; editId.value = null }

function openCreate() { resetForm(); showModal.value = true }

function openEdit(c) {
  resetForm()
  editId.value = c.id
  Object.assign(form, {
    name: c.name || '', legalName: c.legalName || '', gstNumber: c.gstNumber || '',
    panNumber: c.panNumber || '', invoicePrefix: c.invoicePrefix || 'DH',
    proformaPrefix: c.proformaPrefix || 'PI', email: c.email || '',
    phone: c.phone || '', addressLine1: c.addressLine1 || '',
    city: c.city || '', state: c.state || '', country: c.country || 'India',
    pincode: c.pincode || '', invoiceTerms: c.invoiceTerms || '',
    logoUrl: c.logoUrl || '',
    bankAccounts: (c.bankAccounts || []).map(b => ({ ...b })),
  })
  showModal.value = true
}

function addBank() {
  form.bankAccounts.push({ bankName: '', accountName: '', accountNumber: '', ifscCode: '', branch: '', isDefault: false })
}

function removeBank(i) { form.bankAccounts.splice(i, 1) }

function setDefault(i) {
  form.bankAccounts.forEach((b, idx) => { b.isDefault = idx === i })
}

async function load() { companies.value = await request('/companies') }

async function uploadLogo(event) {
  const file = event.target.files?.[0]
  if (!file) return
  logoStatus.value = 'Uploading…'
  const body = new FormData()
  body.append('file', file)
  const uploaded = await request('/uploads/company-logo', { method: 'POST', body })
  form.logoUrl = uploaded.url
  logoStatus.value = file.name
}

async function deactivate(c) {
  if (!confirm(`Deactivate "${c.name}"?`)) return
  await request(`/companies/${c.id}`, { method: 'DELETE' })
  await load()
}

async function save() {
  saving.value = true
  try {
    if (editId.value) {
      await request(`/companies/${editId.value}`, { method: 'PATCH', body: { ...form } })
    } else {
      await request('/companies', { method: 'POST', body: { ...form } })
    }
    showModal.value = false
    resetForm()
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
