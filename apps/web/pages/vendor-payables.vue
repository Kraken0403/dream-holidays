<template>
  <div class="page">
    <div class="page-head"><div><h1>Vendor Payables</h1><p class="sub">Vendor bills and payment tracking.</p></div></div>
    <div class="toolbar">
      <div class="muted">{{ bills.length }} vendor bills</div>
      <button class="btn" type="button" @click="openCreate">Create Vendor Bill</button>
    </div>
    <div class="card table-wrap">
      <table>
        <thead><tr><th>Bill</th><th>Vendor</th><th>Booking</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Action</th></tr></thead>
        <tbody>
          <tr v-for="b in bills" :key="b.id">
            <td><strong>{{ b.billNumber }}</strong><div><span class="badge">{{ b.status }}</span></div></td>
            <td>{{ b.vendor?.name }}</td>
            <td>{{ b.booking?.bookingNumber || '-' }}</td>
            <td class="money">{{ formatMoney(b.grandTotal) }}</td>
            <td class="money">{{ formatMoney(b.paidAmount) }}</td>
            <td class="money">{{ formatMoney(b.outstandingAmount) }}</td>
            <td><button class="btn secondary small" type="button" @click="openPayment(b)">Add Payment</button></td>
          </tr>
          <tr v-if="!bills.length"><td colspan="7" class="muted">No vendor bills found.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <div class="modal">
        <div class="modal-head"><h2 class="modal-title">Create Vendor Bill</h2><button class="btn ghost small" type="button" @click="showCreate = false">Close</button></div>
        <form class="form" @submit.prevent="saveBill">
          <div class="modal-body form">
            <div class="form-row">
              <div class="field"><label>Vendor</label><select v-model="form.vendorId" class="input" required><option value="">Select vendor</option><option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option></select></div>
              <div class="field"><label>Booking</label><select v-model="form.bookingId" class="input"><option value="">None</option><option v-for="b in bookings" :key="b.id" :value="b.id">{{ b.bookingNumber }} - {{ b.title }}</option></select></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Vendor Invoice No</label><input v-model="form.vendorInvoiceNo" class="input" /></div>
              <div class="field"><label>Bill Date</label><input v-model="form.billDate" class="input" type="date" required /></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Due Date</label><input v-model="form.dueDate" class="input" type="date" /></div>
              <div class="field"><label>Notes</label><input v-model="form.notes" class="input" /></div>
            </div>
            <div class="item-box">
              <div class="toolbar" style="margin-bottom:10px;"><strong>Items</strong><button class="btn secondary small" type="button" @click="addBillItem">Add Item</button></div>
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
          <div class="modal-actions"><button class="btn secondary" type="button" @click="showCreate = false">Cancel</button><button class="btn">Save Vendor Bill</button></div>
        </form>
      </div>
    </div>

    <div v-if="paymentBill" class="modal-backdrop" @click.self="paymentBill = null">
      <div class="modal" style="width:min(520px, 100%);">
        <div class="modal-head"><h2 class="modal-title">Add Payment</h2><button class="btn ghost small" type="button" @click="paymentBill = null">Close</button></div>
        <form class="form" @submit.prevent="pay">
          <div class="modal-body form">
            <div class="muted">{{ paymentBill.billNumber }} outstanding {{ formatMoney(paymentBill.outstandingAmount) }}</div>
            <div class="field"><label>Amount</label><input v-model.number="payment.amount" class="input" type="number" min="1" required /></div>
            <div class="field"><label>Payment Mode</label><input v-model="payment.paymentMode" class="input" /></div>
          </div>
          <div class="modal-actions"><button class="btn secondary" type="button" @click="paymentBill = null">Cancel</button><button class="btn">Add Payment</button></div>
        </form>
      </div>
    </div>
  </div>
</template>
<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const bills = ref([]), vendors = ref([]), bookings = ref([])
const showCreate = ref(false)
const paymentBill = ref(null)
const today = () => new Date().toISOString().slice(0, 10)
const blankItem = () => ({ description: '', quantity: 1, rate: 0, taxAmount: 0 })
const blankForm = () => ({ vendorId: '', bookingId: '', vendorInvoiceNo: '', billDate: today(), dueDate: '', notes: '', items: [blankItem()] })
const form = reactive(blankForm())
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer' })
function itemTotal(item) { return Number(item.quantity || 1) * Number(item.rate || 0) + Number(item.taxAmount || 0) }
function resetForm() { Object.assign(form, blankForm()) }
function addBillItem() { form.items.push(blankItem()) }
function openCreate() { resetForm(); showCreate.value = true }
function openPayment(bill) { paymentBill.value = bill; Object.assign(payment, { amount: Number(bill.outstandingAmount || 0), paymentMode: 'Bank Transfer' }) }
async function load() {
  [bills.value, vendors.value, bookings.value] = await Promise.all([
    request('/vendor-payables'),
    request('/vendors'),
    request('/bookings'),
  ])
}
async function saveBill() {
  const payload = JSON.parse(JSON.stringify(form))
  payload.bookingId = payload.bookingId || null
  payload.items = payload.items.map(item => ({ ...item, total: itemTotal(item) }))
  await request('/vendor-payables', { method: 'POST', body: payload })
  showCreate.value = false
  await load()
}
async function pay() {
  if (!paymentBill.value) return
  await request(`/vendor-payables/${paymentBill.value.id}/payments`, { method: 'POST', body: payment })
  paymentBill.value = null
  await load()
}
onMounted(load)
</script>
