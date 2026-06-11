<template>
  <div class="page">
    <div class="page-head">
      <div><h1>Bookings / Trip Files</h1><p class="sub">Create booking first, then generate invoice and vendor payable.</p></div>
    </div>

    <div class="toolbar">
      <div class="muted">{{ bookings.length }} bookings</div>
      <div class="toolbar-actions">
        <button class="btn" type="button" @click="openCreate">Create Booking</button>
      </div>
    </div>

    <div class="card table-wrap">
      <table>
        <thead><tr><th>Booking</th><th>Client</th><th>Dates</th><th>Sale</th><th>Cost</th><th>Margin</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="b in bookings" :key="b.id">
            <td><strong>{{ b.bookingNumber }}</strong><div>{{ b.title }}</div><span class="badge">{{ b.status }}</span></td>
            <td>{{ b.client?.name }}</td>
            <td>
              <div>{{ dateOnly(b.bookingDate) }}</div>
              <div class="muted">{{ dateOnly(b.travelStartDate) }} - {{ dateOnly(b.travelEndDate) }}</div>
            </td>
            <td class="money">{{ formatMoney(b.totalSaleAmount) }}</td>
            <td class="money">{{ formatMoney(b.totalVendorCost) }}</td>
            <td class="money">{{ formatMoney(b.grossMargin) }}</td>
            <td><NuxtLink class="btn secondary small" :to="`/bookings/${b.id}`">Open</NuxtLink></td>
          </tr>
          <tr v-if="!bookings.length"><td colspan="7" class="muted">No bookings found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-head">
          <h2 class="modal-title">Create Booking</h2>
          <button class="btn ghost small" type="button" @click="showModal = false">Close</button>
        </div>
        <form class="form" @submit.prevent="save">
          <div class="modal-body form">
            <div class="form-row">
              <div class="field"><label>Client</label><select v-model="form.clientId" class="input" required><option value="">Select client</option><option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
              <div class="field"><label>Billing Company</label><select v-model="form.companyId" class="input" required><option value="">Select company</option><option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Booking Title</label><input v-model="form.title" class="input" required placeholder="Nitin Patel - Baku Package" /></div>
              <div class="field"><label>Destination</label><input v-model="form.destination" class="input" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Booking Date</label><input v-model="form.bookingDate" class="input" type="date" required /></div>
              <div class="field"><label>Status</label><select v-model="form.status" class="input"><option>DRAFT</option><option>CONFIRMED</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Travel Start</label><input v-model="form.travelStartDate" class="input" type="date" /></div>
              <div class="field"><label>Travel End</label><input v-model="form.travelEndDate" class="input" type="date" /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Passenger Count</label><input v-model.number="form.passengerCount" class="input" type="number" min="1" /></div>
              <div class="field"><label>Client Notes</label><input v-model="form.clientNotes" class="input" /></div>
            </div>

            <div class="item-box">
              <div class="toolbar" style="margin-bottom: 10px;"><strong>Service Items</strong><button class="btn secondary small" type="button" @click="addItem">Add Item</button></div>
              <div v-for="(item, index) in form.serviceItems" :key="index" class="item-box" style="background:#fff; margin-bottom: 10px;">
                <div class="form-row">
                  <div class="field"><label>Category</label><select v-model="item.categoryId" class="input" required><option value="">Select</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent ? c.parent.name + ' / ' : '' }}{{ c.name }}</option></select></div>
                  <div class="field"><label>Vendor</label><select v-model="item.vendorId" class="input"><option value="">None</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option></select></div>
                </div>
                <div class="form-row">
                  <div class="field"><label>Description</label><input v-model="item.description" class="input" required /></div>
                  <div class="field"><label>Service Date</label><input v-model="item.serviceDate" class="input" type="date" /></div>
                </div>
                <div class="form-row">
                  <div class="field"><label>Qty</label><input v-model.number="item.quantity" class="input" type="number" min="1" /></div>
                  <div class="field"><label>Sale Rate</label><input v-model.number="item.saleRate" class="input" type="number" /></div>
                </div>
                <div class="form-row">
                  <div class="field"><label>Vendor Cost</label><input v-model.number="item.vendorCost" class="input" type="number" /></div>
                  <div class="field"><label>Margin Preview</label><input class="input" :value="formatMoney((Number(item.quantity || 1) * Number(item.saleRate || 0)) - Number(item.vendorCost || 0))" disabled /></div>
                </div>
                <button class="btn danger small" type="button" @click="form.serviceItems.splice(index, 1)">Remove Item</button>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn secondary" type="button" @click="showModal = false">Cancel</button>
            <button class="btn">Create Booking</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const bookings = ref([]), clients = ref([]), companies = ref([]), categories = ref([]), vendors = ref([])
const showModal = ref(false)
const today = () => new Date().toISOString().slice(0, 10)
const blankItem = () => ({ categoryId: '', vendorId: '', description: '', serviceDate: '', quantity: 1, saleRate: 0, saleTax: 0, vendorCost: 0, vendorTax: 0 })
const blankForm = () => ({ clientId: '', companyId: '', title: '', destination: '', bookingDate: today(), travelStartDate: '', travelEndDate: '', passengerCount: 1, status: 'DRAFT', clientNotes: '', serviceItems: [blankItem()] })
const form = reactive(blankForm())
function dateOnly(value) { return value ? new Date(value).toLocaleDateString('en-IN') : '-' }
function addItem() { form.serviceItems.push(blankItem()) }
function resetForm() { Object.assign(form, blankForm()) }
function openCreate() { resetForm(); showModal.value = true }
async function load() {
  [bookings.value, clients.value, companies.value, categories.value, vendors.value] = await Promise.all([
    request('/bookings'),
    request('/clients'),
    request('/companies'),
    request('/categories'),
    request('/vendors'),
  ])
}
async function save() {
  const payload = JSON.parse(JSON.stringify(form))
  payload.serviceItems = payload.serviceItems.map(item => ({
    ...item,
    saleTotal: Number(item.quantity || 1) * Number(item.saleRate || 0) + Number(item.saleTax || 0),
    vendorTotal: Number(item.vendorCost || 0) + Number(item.vendorTax || 0),
  }))
  await request('/bookings', { method: 'POST', body: payload })
  showModal.value = false
  resetForm()
  await load()
}
onMounted(load)
</script>
