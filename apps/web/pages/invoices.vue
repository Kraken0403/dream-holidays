<template>
  <div class="page">
    <div class="page-head"><div><h1>Invoices</h1><p class="sub">Client billing and payment tracking.</p></div></div>
    <div class="toolbar">
      <div class="muted">{{ invoices.length }} invoices</div>
      <button class="btn" type="button" @click="openCreate">Create Invoice</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Invoice</th><th>Client</th><th>Booking</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="i in invoices" :key="i.id">
            <td><strong>{{ i.invoiceNumber }}</strong><div><span class="badge">{{ i.status }}</span></div></td>
            <td>{{ i.client?.name }}</td>
            <td>{{ i.booking?.bookingNumber || '-' }}</td>
            <td class="money">{{ formatMoney(i.grandTotal) }}</td>
            <td class="money">{{ formatMoney(i.paidAmount) }}</td>
            <td class="money">{{ formatMoney(i.outstandingAmount) }}</td>
            <td><button class="btn secondary small" type="button" @click="openPayment(i)">Add Payment</button></td>
          </tr>
          <tr v-if="!invoices.length"><td colspan="7" class="muted">No invoices found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-head"><h2 class="modal-title">Create Invoice</h2><button class="btn ghost small" type="button" @click="showCreate = false">Close</button></div>
        <form class="form" @submit.prevent="saveInvoice">
          <div class="modal-body form">
            <div class="form-row">
              <div class="field"><label>Client</label><select v-model="form.clientId" class="input" required><option value="">Select client</option><option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
              <div class="field"><label>Company</label><select v-model="form.companyId" class="input" required><option value="">Select company</option><option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Booking</label><select v-model="form.bookingId" class="input"><option value="">None</option><option v-for="b in bookings" :key="b.id" :value="b.id">{{ b.bookingNumber }} - {{ b.title }}</option></select></div>
              <div class="field"><label>Invoice Date</label><input v-model="form.invoiceDate" class="input" type="date" required /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Due Date</label><input v-model="form.dueDate" class="input" type="date" /></div>
              <div class="field"><label>Place of Supply</label><input v-model="form.placeOfSupply" class="input" /></div>
            </div>
            <div class="item-box">
              <div class="toolbar" style="margin-bottom:10px;"><strong>Items</strong><button class="btn secondary small" type="button" @click="addInvoiceItem">Add Item</button></div>
              <div v-for="(item, index) in form.items" :key="index" class="item-box" style="background:#fff; margin-bottom:10px;">
                <div class="field"><label>Description</label><input v-model="item.description" class="input" required /></div>
                <div class="form-row">
                  <div class="field"><label>Qty</label><input v-model.number="item.quantity" class="input" type="number" min="1" /></div>
                  <div class="field"><label>Rate</label><input v-model.number="item.rate" class="input" type="number" min="0" /></div>
                </div>
                <div class="form-row">
                  <div class="field"><label>Tax</label><input v-model.number="item.taxAmount" class="input" type="number" min="0" /></div>
                  <div class="field"><label>Total</label><input class="input" :value="formatMoney(itemTotal(item))" disabled /></div>
                </div>
                <button class="btn danger small" type="button" @click="form.items.splice(index, 1)">Remove Item</button>
              </div>
            </div>
          </div>
          <div class="modal-actions"><button class="btn secondary" type="button" @click="showCreate = false">Cancel</button><button class="btn">Save Invoice</button></div>
        </form>
      </div>
    </div>

    <div v-if="paymentInvoice" class="modal-backdrop" @click.self="paymentInvoice = null">
      <div class="modal" style="width:min(520px, 100%);">
        <div class="modal-head"><h2 class="modal-title">Add Payment</h2><button class="btn ghost small" type="button" @click="paymentInvoice = null">Close</button></div>
        <form class="form" @submit.prevent="pay">
          <div class="modal-body form">
            <div class="muted">{{ paymentInvoice.invoiceNumber }} outstanding {{ formatMoney(paymentInvoice.outstandingAmount) }}</div>
            <div class="field"><label>Amount</label><input v-model.number="payment.amount" class="input" type="number" min="1" required /></div>
            <div class="field"><label>Payment Mode</label><input v-model="payment.paymentMode" class="input" /></div>
          </div>
          <div class="modal-actions"><button class="btn secondary" type="button" @click="paymentInvoice = null">Cancel</button><button class="btn">Add Payment</button></div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const invoices = ref([]), clients = ref([]), companies = ref([]), bookings = ref([])
const showCreate = ref(false)
const paymentInvoice = ref(null)
const today = () => new Date().toISOString().slice(0, 10)
const blankItem = () => ({ description: '', quantity: 1, rate: 0, taxAmount: 0 })
const blankForm = () => ({ clientId: '', companyId: '', bookingId: '', invoiceDate: today(), dueDate: '', placeOfSupply: '', items: [blankItem()] })
const form = reactive(blankForm())
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer' })
function itemTotal(item) { return Number(item.quantity || 1) * Number(item.rate || 0) + Number(item.taxAmount || 0) }
function resetForm() { Object.assign(form, blankForm()) }
function addInvoiceItem() { form.items.push(blankItem()) }
function openCreate() { resetForm(); showCreate.value = true }
function openPayment(invoice) { paymentInvoice.value = invoice; Object.assign(payment, { amount: Number(invoice.outstandingAmount || 0), paymentMode: 'Bank Transfer' }) }
async function load() {
  [invoices.value, clients.value, companies.value, bookings.value] = await Promise.all([
    request('/invoices'),
    request('/clients'),
    request('/companies'),
    request('/bookings'),
  ])
}
async function saveInvoice() {
  const payload = JSON.parse(JSON.stringify(form))
  payload.bookingId = payload.bookingId || null
  payload.items = payload.items.map(item => ({ ...item, total: itemTotal(item) }))
  await request('/invoices', { method: 'POST', body: payload })
  showCreate.value = false
  await load()
}
async function pay() {
  if (!paymentInvoice.value) return
  await request(`/invoices/${paymentInvoice.value.id}/payments`, { method: 'POST', body: payment })
  paymentInvoice.value = null
  await load()
}
onMounted(load)
</script>
