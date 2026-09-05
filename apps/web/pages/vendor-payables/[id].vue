<template>
  <div>
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div class="mb-1 flex items-center gap-2 text-sm text-gray-500">
          <NuxtLink to="/vendor-payables" class="transition-colors hover:text-indigo-600">Vendor Payables</NuxtLink>
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m9 18 6-6-6-6"/></svg>
          <span class="font-medium text-gray-700">{{ bill?.billNumber || 'Loading…' }}</span>
        </div>
        <h1 class="text-lg font-semibold text-gray-900">{{ bill?.billNumber || 'Vendor Payable' }}</h1>
        <div v-if="bill" class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>{{ bill.vendor?.name }}</span>
          <NuxtLink v-if="bill.booking?.id" :to="`/bookings/${bill.booking.id}`" class="font-semibold text-indigo-600 hover:text-indigo-800">{{ bill.booking.bookingNumber }}</NuxtLink>
          <span v-if="bill.booking?.title">{{ bill.booking.title }}</span>
          <span :class="statusBadge(bill.status)" class="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold">{{ bill.status }}</span>
        </div>
      </div>
      <div v-if="bill" class="flex flex-wrap items-center gap-2">
        <button v-if="bill.documentType === 'BILL' && Number(bill.outstandingAmount) > 0 && bill.status !== 'CANCELLED'" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100" @click="openPayment"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Payment</button>
        <button v-if="bill.paymentAllocations?.length" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100" @click="showReceipts = true"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg>Receipts</button>
        <button v-if="canDelete" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100" @click="openDelete"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg>Delete</button>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400 shadow-sm">Loading vendor payable…</div>
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm"><p class="font-semibold text-red-700">{{ error }}</p><button type="button" class="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" @click="load">Try Again</button></div>

    <template v-if="bill">
      <div v-if="bill.cancellationId && bill.documentType === 'CREDIT_NOTE'" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">This system-generated vendor credit note reverses an original vendor payable for a cancelled booking.</div>
      <div v-else-if="bill.cancellationId && bill.status === 'CANCELLED'" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">This original vendor payable was cancelled and reversed through the booking cancellation workflow.</div>
      <div v-else-if="bill.cancellationId" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">This is a separate vendor cancellation-charge payable for the linked booking.</div>

      <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <div class="space-y-5">
          <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-indigo-700 bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-4"><h2 class="font-semibold text-white">Vendor Bill Items</h2></div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead><tr class="border-b border-gray-100 bg-gray-50"><th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Description</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Qty</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Rate</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Tax</th><th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Total</th></tr></thead>
                <tbody class="divide-y divide-gray-50"><tr v-for="item in bill.items || []" :key="item.id"><td class="px-4 py-3 text-gray-700">{{ item.description }}</td><td class="px-4 py-3 text-right text-gray-600">{{ item.quantity }}</td><td class="px-4 py-3 text-right text-gray-600">{{ fmt(item.rate) }}</td><td class="px-4 py-3 text-right text-gray-600">{{ fmt(item.taxAmount) }}</td><td class="px-4 py-3 text-right font-semibold text-gray-900">{{ fmt(item.total) }}</td></tr><tr v-if="!bill.items?.length"><td colspan="5" class="px-4 py-8 text-center text-gray-400">No bill items.</td></tr></tbody>
              </table>
            </div>
          </section>

          <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div class="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 class="font-semibold text-gray-900">Payment History</h2><p class="mt-0.5 text-xs text-gray-500">Payments allocated to this vendor payable.</p></div><button v-if="bill.documentType === 'BILL' && Number(bill.outstandingAmount) > 0 && bill.status !== 'CANCELLED'" type="button" class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700" @click="openPayment">+ Add Payment</button></div>
            <div v-if="bill.paymentAllocations?.length" class="divide-y divide-gray-100"><div v-for="allocation in bill.paymentAllocations" :key="allocation.id" class="flex flex-wrap items-start justify-between gap-3 px-5 py-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ formatDate(allocation.vendorPayment?.paymentDate) }} · {{ allocation.vendorPayment?.paymentMode }}<span v-if="allocation.vendorPayment?.referenceNumber"> · {{ allocation.vendorPayment.referenceNumber }}</span></p></div><a v-if="allocation.vendorPayment?.proofUrl" :href="allocation.vendorPayment.proofUrl" target="_blank" rel="noopener" class="text-xs font-semibold text-blue-600 hover:text-blue-800">View Proof</a></div></div>
            <div v-else class="px-5 py-8 text-center text-sm text-gray-400">No vendor payments recorded.</div>
          </section>
        </div>

        <aside class="space-y-4 xl:sticky xl:top-5">
          <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-semibold text-gray-900">Payable Summary</h2><span :class="statusBadge(bill.status)" class="rounded-full px-2 py-0.5 text-[11px] font-semibold">{{ bill.status }}</span></div><dl class="space-y-2.5 text-xs"><div class="flex justify-between gap-3"><dt class="text-gray-500">Bill no.</dt><dd class="font-semibold text-gray-800">{{ bill.billNumber }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Vendor invoice</dt><dd class="font-semibold text-gray-800">{{ bill.vendorInvoiceNo || '—' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Bill date</dt><dd class="font-semibold text-gray-800">{{ formatDate(bill.billDate) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Due date</dt><dd class="font-semibold text-gray-800">{{ formatDate(bill.dueDate) }}</dd></div><div v-if="bill.booking" class="flex justify-between gap-3"><dt class="text-gray-500">Booking</dt><dd class="text-right"><NuxtLink :to="`/bookings/${bill.booking.id}`" class="font-semibold text-indigo-600">{{ bill.booking.bookingNumber }}</NuxtLink><p class="mt-0.5 max-w-[180px] text-[10px] text-gray-500">{{ bill.booking.title }}</p></dd></div></dl></section>
          <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 class="text-sm font-semibold text-gray-900">Vendor</h2><p class="mt-2 text-sm font-semibold text-gray-900">{{ bill.vendor?.name }}</p><p v-if="bill.vendor?.email" class="mt-1 text-xs text-gray-500">{{ bill.vendor.email }}</p><p v-if="bill.vendor?.phone" class="text-xs text-gray-500">{{ bill.vendor.phone }}</p></section>
          <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div class="space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-500">Total</span><strong>{{ fmt(bill.grandTotal) }}</strong></div><div class="flex justify-between"><span class="text-gray-500">Paid</span><strong class="text-green-700">{{ fmt(bill.paidAmount) }}</strong></div><div class="flex justify-between border-t pt-2"><span class="text-gray-500">Outstanding</span><strong class="text-orange-700">{{ fmt(bill.outstandingAmount) }}</strong></div></div></section>
          <section v-if="bill.notes" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><h2 class="text-sm font-semibold text-gray-900">Notes</h2><p class="mt-2 whitespace-pre-line text-xs leading-5 text-gray-600">{{ bill.notes }}</p></section>
        </aside>
      </div>
    </template>

    <AppModal v-model="showPayment" title="Add Vendor Payment" :subtitle="bill?.billNumber || ''" size="sm" color="green">
      <form id="vendor-detail-payment-form" class="space-y-4" @submit.prevent="pay">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Outstanding: <strong>{{ fmt(bill?.outstandingAmount) }}</strong></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Amount</label><input v-model.number="payment.amount" type="number" min="0.01" step="0.01" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Mode</label><input v-model="payment.paymentMode" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="Bank Transfer" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Reference #</label><input v-model="payment.referenceNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="UTR / cheque / transaction ID" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" @change="selectProof" /></div>
      </form>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showPayment = false">Cancel</button><button type="submit" form="vendor-detail-payment-form" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Record Payment</button></template>
    </AppModal>

    <AppModal v-model="showReceipts" title="Vendor Payment Receipts" :subtitle="bill?.billNumber || ''" size="md" color="green">
      <div class="space-y-3"><div v-for="allocation in bill?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4"><div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ formatDate(allocation.vendorPayment?.paymentDate) }} · {{ allocation.vendorPayment?.paymentMode }}<span v-if="allocation.vendorPayment?.referenceNumber"> · {{ allocation.vendorPayment.referenceNumber }}</span></p></div><a v-if="allocation.vendorPayment?.proofUrl" :href="allocation.vendorPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View Proof</a></div></div></div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showReceipts = false">Close</button></template>
    </AppModal>

    <AppModal v-model="showDelete" title="Permanently Delete Vendor Payable" :subtitle="bill?.billNumber || 'Checking linked records…'" size="md" color="red">
      <div v-if="deletePreview" class="space-y-4"><div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This permanently deletes the vendor payable.</p><p class="mt-1 text-xs leading-5 text-red-700">{{ deletePreview.warning }}</p></div><div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="item in deleteImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div><p class="text-xs leading-5 text-gray-500">Shared payments and system-generated cancellation reversal documents are protected.</p></div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked accounting records…</div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showDelete = false">Keep Payable</button><button type="button" :disabled="deleting || !deletePreview" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="deleteBill">{{ deleting ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>
  </div>
</template>

<script setup>
const route = useRoute()
const { request } = useApi()
const toast = useToast()
const { formatMoney } = useMoney()
const { formatDate } = useDateTime()

const bill = ref(null)
const loading = ref(true)
const error = ref('')
const showPayment = ref(false)
const showReceipts = ref(false)
const paymentProof = ref(null)
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer', referenceNumber: '' })
const showDelete = ref(false)
const deletePreview = ref(null)
const deleting = ref(false)
const fmt = (value) => formatMoney(value || 0)
const canDelete = computed(() => !(bill.value?.cancellationId && (bill.value?.documentType === 'CREDIT_NOTE' || bill.value?.status === 'CANCELLED')))
const deleteImpactItems = computed(() => {
  const counts = deletePreview.value?.counts || {}
  return [
    { label: 'Items', value: counts.billItems || 0 },
    { label: 'Payments', value: counts.payments || 0 },
    { label: 'Journal entries', value: counts.journalEntries || 0 },
    { label: 'Stored files', value: counts.storedFiles || 0 },
  ]
})

function statusBadge(status) {
  return { PENDING: 'bg-amber-100 text-amber-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', DISPUTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-600' }[status] || 'bg-gray-100 text-gray-600'
}

async function load() {
  loading.value = true
  error.value = ''
  try { bill.value = await request(`/vendor-payables/${route.params.id}`) }
  catch (err) { bill.value = null; error.value = err?.data?.message || err?.message || 'Unable to load this vendor payable.' }
  finally { loading.value = false }
}
function openPayment() { paymentProof.value = null; Object.assign(payment, { amount: Number(bill.value?.outstandingAmount || 0), paymentMode: 'Bank Transfer', referenceNumber: '' }); showPayment.value = true }
function selectProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; paymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  paymentProof.value = file
}
async function pay() {
  if (!bill.value) return
  const payload = { ...payment }
  if (paymentProof.value) {
    const formData = new FormData(); formData.append('file', paymentProof.value)
    const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData })
    payload.proofUrl = uploaded.url; payload.proofOriginalName = uploaded.originalName
  }
  await request(`/vendor-payables/${bill.value.id}/payments`, { method: 'POST', body: payload })
  showPayment.value = false
  await load()
  toast.success('Vendor payment recorded.')
}
async function openDelete() {
  deletePreview.value = null
  showDelete.value = true
  try { deletePreview.value = await request(`/vendor-payables/${bill.value.id}/deletion-preview`) }
  catch (err) { showDelete.value = false; toast.error(err?.data?.message || err?.message || 'Unable to inspect linked vendor payable records.') }
}
async function deleteBill() {
  if (!bill.value || !deletePreview.value) return
  deleting.value = true
  try { await request(`/vendor-payables/${bill.value.id}`, { method: 'DELETE' }); showDelete.value = false; toast.success('Vendor payable permanently deleted.'); await navigateTo('/vendor-payables') }
  finally { deleting.value = false }
}

onMounted(load)
watch(() => route.params.id, load)
</script>
