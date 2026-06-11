<template>
  <div>
    <PageHeader title="Vendor Payables" subtitle="Vendor bills and payment tracking.">
      <template #actions>
        <button type="button" @click="openCreate"
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Create Vendor Bill
        </button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in bills" :key="b.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ b.billNumber }}</div>
                <span :class="statusBadge(b.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1">{{ b.status }}</span>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ b.vendor?.name }}</td>
              <td class="px-4 py-3 text-gray-500">{{ b.booking?.bookingNumber || '—' }}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(b.grandTotal) }}</td>
              <td class="px-4 py-3 text-right text-green-600 tabular-nums font-medium">{{ fmt(b.paidAmount) }}</td>
              <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(b.outstandingAmount) > 0 ? 'text-orange-600' : 'text-gray-400'">{{ fmt(b.outstandingAmount) }}</td>
              <td class="px-4 py-3">
                <button v-if="Number(b.outstandingAmount) > 0" type="button" @click="openPayment(b)"
                  class="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors">
                  Add Payment
                </button>
              </td>
            </tr>
            <tr v-if="!bills.length">
              <td colspan="7" class="px-4 py-10 text-center text-gray-400">No vendor bills found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Vendor Bill Modal -->
    <AppModal v-model="showCreate" title="Create Vendor Bill" subtitle="Record a bill received from a vendor" size="lg" color="indigo">
      <form id="bill-form" @submit.prevent="saveBill" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Vendor *</label>
            <select v-model="form.vendorId" :class="INP" required>
              <option value="">Select vendor</option>
              <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Booking</label>
            <select v-model="form.bookingId" :class="INP">
              <option value="">None</option>
              <option v-for="b in bookings" :key="b.id" :value="b.id">{{ b.bookingNumber }} — {{ b.title }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Vendor Invoice No</label>
            <input v-model="form.vendorInvoiceNo" :class="INP" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bill Date *</label>
            <input v-model="form.billDate" type="date" :class="INP" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
            <input v-model="form.dueDate" type="date" :class="INP" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
          <input v-model="form.notes" :class="INP" placeholder="Optional notes" />
        </div>

        <!-- Items -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-gray-900">Bill Items</h4>
            <button type="button" @click="addBillItem" class="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
          </div>
          <div class="space-y-3">
            <div v-for="(item, index) in form.items" :key="index" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                <input v-model="item.description" :class="INP + ' bg-white'" required />
              </div>
              <div class="grid grid-cols-4 gap-3 items-end">
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Qty</label><input v-model.number="item.quantity" type="number" min="1" :class="INP + ' bg-white'" /></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Rate</label><input v-model.number="item.rate" type="number" min="0" :class="INP + ' bg-white'" /></div>
                <div><label class="block text-xs font-medium text-gray-600 mb-1">Tax</label><input v-model.number="item.taxAmount" type="number" min="0" :class="INP + ' bg-white'" /></div>
                <div class="flex items-end gap-2">
                  <div class="flex-1"><label class="block text-xs font-medium text-gray-600 mb-1">Total</label>
                    <div :class="INP + ' bg-gray-100 font-semibold text-gray-700'">{{ fmt(itemTotal(item)) }}</div>
                  </div>
                  <button type="button" @click="form.items.splice(index, 1)" class="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showCreate = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="bill-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save Vendor Bill</button>
      </template>
    </AppModal>

    <!-- Payment Modal -->
    <AppModal v-model="showPayment" title="Add Vendor Payment" subtitle="Record payment made to vendor" size="sm" color="green">
      <form v-if="paymentBill" id="vpay-form" @submit.prevent="pay" class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div class="font-semibold text-amber-800">{{ paymentBill.billNumber }}</div>
          <div class="text-amber-700 mt-0.5">Outstanding: <strong>{{ fmt(paymentBill.outstandingAmount) }}</strong></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Amount *</label><input v-model.number="payment.amount" type="number" min="1" :class="INP" required /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label><input v-model="payment.paymentMode" :class="INP" /></div>
      </form>
      <template #footer>
        <button type="button" @click="showPayment = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="vpay-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Add Payment</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const bills = ref([]), vendors = ref([]), bookings = ref([])
const showCreate = ref(false)
const showPayment = ref(false)
const paymentBill = ref(null)
const today = () => new Date().toISOString().slice(0, 10)
const blankItem = () => ({ description: '', quantity: 1, rate: 0, taxAmount: 0 })
const blankForm = () => ({ vendorId: '', bookingId: '', vendorInvoiceNo: '', billDate: today(), dueDate: '', notes: '', items: [blankItem()] })
const form = reactive(blankForm())
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer' })
const fmt = (v) => formatMoney(v)
function itemTotal(item) { return Number(item.quantity || 1) * Number(item.rate || 0) + Number(item.taxAmount || 0) }
function openCreate() { Object.assign(form, blankForm()); showCreate.value = true }
function openPayment(bill) { paymentBill.value = bill; Object.assign(payment, { amount: Number(bill.outstandingAmount || 0), paymentMode: 'Bank Transfer' }); showPayment.value = true }
function addBillItem() { form.items.push(blankItem()) }
function statusBadge(s) {
  return { DRAFT: 'bg-gray-100 text-gray-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700' }[s] || 'bg-gray-100 text-gray-600'
}
async function load() {
  [bills.value, vendors.value, bookings.value] = await Promise.all([
    request('/vendor-payables'), request('/vendors'), request('/bookings'),
  ])
}
async function saveBill() {
  const payload = JSON.parse(JSON.stringify(form))
  payload.bookingId = payload.bookingId || null
  payload.items = payload.items.map(item => ({ ...item, total: itemTotal(item) }))
  await request('/vendor-payables', { method: 'POST', body: payload })
  showCreate.value = false; await load()
}
async function pay() {
  if (!paymentBill.value) return
  await request(`/vendor-payables/${paymentBill.value.id}/payments`, { method: 'POST', body: payment })
  showPayment.value = false; paymentBill.value = null; await load()
}
onMounted(load)
</script>
