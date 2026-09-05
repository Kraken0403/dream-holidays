<template>
  <div>
    <PageHeader title="Vendor Payables" subtitle="Vendor bills and payment tracking.">
      <template #actions>
        <button type="button" @click="openCreate"
          class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          Create Vendor Bill
        </button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <TableControls
        :controller="billTable"
        v-model:search="billTable.search.value"
        v-model:page="billTable.page.value"
        v-model:page-size="billTable.pageSize.value"
        :page-size-options="billTable.pageSizeOptions"
        :total="billTable.total.value"
        :filtered="billTable.filtered.value"
        :start="billTable.start.value"
        :end="billTable.end.value"
        :rows="billTable.rows.value"
        table-key="vendor-payables-list"
        :available-columns="[{ key: 'billDate', label: 'Bill date' }, { key: 'dueDate', label: 'Due date' }, { key: 'createdAt', label: 'Created at' }, { key: 'taxAmount', label: 'Tax amount' }, { key: 'vendor.email', label: 'Vendor email' }, { key: 'booking.bookingVersion', label: 'Booking version' }, { key: 'booking.destination', label: 'Booking destination' }]"
        exportable
        :selected-count="billSelection.selectedCount.value"
        :filter-count="[billFilters.status, billFilters.vendorId, billFilters.bookingId, billFilters.from, billFilters.to].filter(Boolean).length"
        :active-filters="billActiveFilters"
        search-placeholder="Search bills, vendors, bookings..."
        @export="billSelection.exportXls"
        @clear-selection="billSelection.clear"
        @remove-filter="removeBillFilter"
      >
        <template #filters>
          <div class="w-full sm:w-44">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select v-model="billFilters.status" :class="INP">
              <option value="">All</option>
              <option v-for="status in billStatuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
          <div class="w-full sm:w-56">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Vendor</label>
            <SearchableSelect v-model="billFilters.vendorId" :options="vendors" allow-all all-label="All vendors" all-value="" />
          </div>
          <div class="w-full sm:w-56">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Booking</label>
            <SearchableSelect v-model="billFilters.bookingId" :options="bookings" label-key="bookingNumber" secondary-key="title" allow-all all-label="All bookings" all-value="" />
          </div>
          <DateRangeFilter
            v-model:preset="billFilters.period"
            v-model:from="billFilters.from"
            v-model:to="billFilters.to"
          />
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="billSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="billSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking ID</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Title</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="b in billTable.rows.value" :key="b.id" class="hover:bg-gray-50 transition-colors">
              <td class="w-10 px-3 py-3"><input type="checkbox" :aria-label="`Select ${b.billNumber}`" :checked="billSelection.isSelected(b)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="billSelection.toggle(b)" /></td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/vendor-payables/${b.id}`" class="font-semibold text-gray-900 hover:text-indigo-600">{{ b.billNumber }}</NuxtLink>
                <div class="mt-1 text-[10px] font-semibold uppercase tracking-wide" :class="billDocumentClass(b)">{{ billDocumentLabel(b) }}</div>
              </td>
              <td class="px-4 py-3"><span :class="statusBadge(b.status)" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">{{ b.status }}</span></td>
              <td class="px-4 py-3 text-gray-700">{{ b.vendor?.name }}</td>
              <td class="px-4 py-3 text-gray-500">{{ b.booking?.bookingNumber || '—' }}</td>
              <td class="px-4 py-3 text-gray-700 max-w-[220px] truncate" :title="b.booking?.title || ''">{{ b.booking?.title || '—' }}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(b.grandTotal) }}</td>
              <td class="px-4 py-3 text-right text-green-600 tabular-nums font-medium">{{ fmt(b.paidAmount) }}</td>
              <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(b.outstandingAmount) > 0 ? 'text-orange-600' : 'text-gray-400'">{{ fmt(b.outstandingAmount) }}</td>
              <td class="px-4 py-3">
                <button v-if="b.paymentAllocations?.length" type="button" @click="openReceipts(b)"
                  class="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg>Receipts</button>
                <button v-if="b.documentType !== 'CREDIT_NOTE' && Number(b.outstandingAmount) > 0" type="button" @click="openPayment(b)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Payment
                </button>
                <NuxtLink :to="`/vendor-payables/${b.id}`" title="Open vendor payable" aria-label="Open vendor payable" class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z"/><circle cx="12" cy="12" r="3"/></svg></NuxtLink>
                <button v-if="canDeleteVendorBill(b)" type="button" title="Delete permanently" aria-label="Delete vendor payable permanently" @click="openDeleteVendorBill(b)" class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg></button>
                <span v-else title="Cancellation reversal documents are protected" class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-300"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10v10H7V10Z"/></svg></span>
              </td>
            </tr>
            <tr v-if="!billTable.filtered.value">
              <td colspan="10" class="px-4 py-10 text-center text-gray-400">No vendor bills found.</td>
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
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Vendor <span class="required-mark">*</span></label>
            <SearchableSelect v-model="form.vendorId" :options="vendors" placeholder="Search vendors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Booking</label>
            <SearchableSelect v-model="form.bookingId" :options="bookings" label-key="bookingNumber" secondary-key="title" placeholder="Search bookings" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Vendor Invoice No</label>
            <input v-model="form.vendorInvoiceNo" :class="INP" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bill Date <span class="required-mark">*</span></label>
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
            <button type="button" @click="addBillItem" class="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Item</button>
          </div>
          <div class="space-y-3">
            <div v-for="(item, index) in form.items" :key="index" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Description <span class="required-mark">*</span></label>
                <input v-model="item.description" placeholder="Bill item description" :class="INP + ' bg-white'" required />
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

    <AppModal v-model="showDeleteVendorBill" title="Permanently Delete Vendor Payable" :subtitle="deleteVendorBillTarget?.billNumber || 'Checking linked records…'" size="md" color="red">
      <div v-if="deleteVendorBillPreview" class="space-y-4">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This permanently removes this vendor payable.</p><p class="mt-1 text-xs leading-5 text-red-700">{{ deleteVendorBillPreview.warning }}</p></div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="item in deleteVendorBillImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div>
        <p class="text-xs leading-5 text-gray-500">Exclusive vendor payments, allocations, journal entries and stored proofs are deleted together. Shared payments and cancellation reversals are protected.</p>
      </div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked accounting records…</div>
      <template #footer><button type="button" @click="showDeleteVendorBill = false" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Keep Payable</button><button type="button" :disabled="deletingVendorBill || !deleteVendorBillPreview" @click="confirmDeleteVendorBill" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{{ deletingVendorBill ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>

    <!-- Payment Modal -->
    <AppModal v-model="showPayment" title="Add Vendor Payment" subtitle="Record payment made to vendor" size="sm" color="green">
      <form v-if="paymentBill" id="vpay-form" @submit.prevent="pay" class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div class="font-semibold text-amber-800">{{ paymentBill.billNumber }}</div>
          <div class="text-amber-700 mt-0.5">Outstanding: <strong>{{ fmt(paymentBill.outstandingAmount) }}</strong></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Amount <span class="required-mark">*</span></label><input v-model.number="payment.amount" type="number" min="1" placeholder="Payment amount" :class="INP" required /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label><input v-model="payment.paymentMode" placeholder="e.g. Bank Transfer" :class="INP" /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" :class="INP" @change="selectPaymentProof" /></div>
      </form>
      <template #footer>
        <button type="button" @click="showPayment = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="vpay-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg">Add Payment</button>
      </template>
    </AppModal>

    <AppModal v-model="showReceipts" title="Payment Receipts" :subtitle="receiptBill?.billNumber || ''" size="md" color="green">
      <div class="space-y-3">
        <div v-for="allocation in receiptBill?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4">
          <div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ formatDate(allocation.vendorPayment?.paymentDate) }} · {{ allocation.vendorPayment?.paymentMode }}<span v-if="allocation.vendorPayment?.referenceNumber"> · {{ allocation.vendorPayment.referenceNumber }}</span></p></div>
            <a v-if="allocation.vendorPayment?.proofUrl" :href="allocation.vendorPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View / Download Proof</a>
          </div>
          <p v-if="allocation.vendorPayment?.proofOriginalName" class="mt-2 text-xs text-gray-400">{{ allocation.vendorPayment.proofOriginalName }}</p>
        </div>
      </div>
      <template #footer><button type="button" @click="showReceipts = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Close</button></template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const route = useRoute()
const toast = useToast()
const { formatMoney } = useMoney()
const { formatDate, todayInput } = useDateTime()
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const bills = ref([]), vendors = ref([]), bookings = ref([])
const billStatuses = ['PENDING', 'PARTIALLY_PAID', 'PAID', 'DISPUTED', 'CANCELLED']
const billFilters = reactive({ status: '', vendorId: '', bookingId: '', period: 'all', from: '', to: '' })
const { periodLabel } = useFilterLabels()
const showDeleteVendorBill = ref(false)
const deleteVendorBillTarget = ref(null)
const deleteVendorBillPreview = ref(null)
const deletingVendorBill = ref(false)
const showCreate = ref(false)
const showPayment = ref(false)
const showReceipts = ref(false)
const paymentBill = ref(null)
const receiptBill = ref(null)
const paymentProof = ref(null)
const today = todayInput
const blankItem = () => ({ description: '', quantity: 1, rate: 0, taxAmount: 0 })
const blankForm = () => ({ vendorId: '', bookingId: '', vendorInvoiceNo: '', billDate: today(), dueDate: '', notes: '', items: [blankItem()] })
const form = reactive(blankForm())
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer' })
const fmt = (v) => formatMoney(v)
const filteredBills = computed(() => bills.value.filter((bill) => {
  if (billFilters.status && bill.status !== billFilters.status) return false
  if (billFilters.vendorId && Number(bill.vendorId) !== Number(billFilters.vendorId)) return false
  if (billFilters.bookingId && Number(bill.bookingId) !== Number(billFilters.bookingId)) return false
  const date = String(bill.billDate || '').slice(0, 10)
  if (billFilters.from && date < billFilters.from) return false
  if (billFilters.to && date > billFilters.to) return false
  return true
}))
const billActiveFilters = computed(() => {
  const chips = []
  if (billFilters.status) chips.push({ key: 'status', label: `Status: ${billFilters.status}` })
  if (billFilters.vendorId) chips.push({ key: 'vendor', label: `Vendor: ${vendors.value.find(item => Number(item.id) === Number(billFilters.vendorId))?.name || billFilters.vendorId}` })
  if (billFilters.bookingId) chips.push({ key: 'booking', label: `Booking: ${bookings.value.find(item => Number(item.id) === Number(billFilters.bookingId))?.bookingNumber || billFilters.bookingId}` })
  const period = periodLabel(billFilters); if (period) chips.push({ key: 'period', label: period })
  return chips
})
const deleteVendorBillImpactItems = computed(() => {
  const counts = deleteVendorBillPreview.value?.counts || {}
  return [
    { label: 'Items', value: counts.billItems || 0 },
    { label: 'Payments', value: counts.payments || 0 },
    { label: 'Journal entries', value: counts.journalEntries || 0 },
    { label: 'Stored files', value: counts.storedFiles || 0 },
  ]
})
const billTable = useTableControls(filteredBills, {
  searchFields: ['billNumber', 'vendorInvoiceNo', 'status', 'vendor.name', 'booking.bookingNumber', 'booking.title'],
})
const billSelection = useListingSelection(billTable, [
  { label: 'Bill', field: 'billNumber' }, { label: 'Vendor Invoice', field: 'vendorInvoiceNo' }, { label: 'Vendor', field: 'vendor.name' },
  { label: 'Booking ID', field: 'booking.bookingNumber' }, { label: 'Booking Title', field: 'booking.title' }, { label: 'Bill Date', field: (row) => formatDate(row.billDate) },
  { label: 'Due Date', field: (row) => formatDate(row.dueDate) }, { label: 'Status', field: 'status' },
  { label: 'Total', field: (row) => fmt(row.grandTotal) }, { label: 'Paid', field: (row) => fmt(row.paidAmount) }, { label: 'Outstanding', field: (row) => fmt(row.outstandingAmount) },
], 'vendor-payables')
function itemTotal(item) { return Number(item.quantity || 1) * Number(item.rate || 0) + Number(item.taxAmount || 0) }
function removeBillFilter(key) { if (key === 'status') billFilters.status = ''; if (key === 'vendor') billFilters.vendorId = ''; if (key === 'booking') billFilters.bookingId = ''; if (key === 'period') Object.assign(billFilters, { period: 'all', from: '', to: '' }) }
function openCreate() { Object.assign(form, blankForm()); showCreate.value = true }
function canDeleteVendorBill(bill) { return !(bill?.cancellationId && (bill.documentType === 'CREDIT_NOTE' || bill.status === 'CANCELLED')) }
async function openDeleteVendorBill(bill) {
  deleteVendorBillTarget.value = bill
  deleteVendorBillPreview.value = null
  showDeleteVendorBill.value = true
  try { deleteVendorBillPreview.value = await request(`/vendor-payables/${bill.id}/deletion-preview`) }
  catch (error) { showDeleteVendorBill.value = false; toast.error(error?.data?.message || error?.message || 'Unable to inspect linked vendor payable records.') }
}
async function confirmDeleteVendorBill() {
  if (!deleteVendorBillTarget.value || !deleteVendorBillPreview.value) return
  deletingVendorBill.value = true
  try {
    await request(`/vendor-payables/${deleteVendorBillTarget.value.id}`, { method: 'DELETE' })
    showDeleteVendorBill.value = false
    billSelection.clear()
    await load()
    toast.success('Vendor payable permanently deleted.')
  } finally { deletingVendorBill.value = false }
}
function openPayment(bill) { paymentBill.value = bill; paymentProof.value = null; Object.assign(payment, { amount: Number(bill.outstandingAmount || 0), paymentMode: 'Bank Transfer' }); showPayment.value = true }
function openReceipts(bill) { receiptBill.value = bill; showReceipts.value = true }
function selectPaymentProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; paymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  paymentProof.value = file
}
function addBillItem() { form.items.push(blankItem()) }
function billDocumentLabel(bill) {
  if (bill.documentType === 'CREDIT_NOTE') return bill.cancellationId ? 'Cancellation Vendor Credit Note' : 'Vendor Credit Note'
  if (bill.cancellationId) return bill.status === 'CANCELLED' ? 'Cancelled Original Vendor Bill' : 'Cancellation Charge Payable'
  return 'Vendor Bill'
}
function billDocumentClass(bill) {
  if (bill.documentType === 'CREDIT_NOTE') return 'text-emerald-600'
  if (bill.cancellationId && bill.status !== 'CANCELLED') return 'text-amber-600'
  if (bill.cancellationId) return 'text-red-500'
  return 'text-gray-400'
}

function statusBadge(s) {
  return { PENDING: 'bg-amber-100 text-amber-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', DISPUTED: 'bg-red-100 text-red-700', CANCELLED: 'bg-gray-100 text-gray-600' }[s] || 'bg-gray-100 text-gray-600'
}
async function load() {
  [bills.value, vendors.value, bookings.value] = await Promise.all([
    request('/vendor-payables'), request('/vendors'), request('/bookings'),
  ])
}
async function saveBill() {
  if (!form.vendorId) return toast.warning('Select a vendor.')
  const payload = JSON.parse(JSON.stringify(form))
  payload.bookingId = payload.bookingId || null
  payload.items = payload.items.map(item => ({ ...item, total: itemTotal(item) }))
  await request('/vendor-payables', { method: 'POST', body: payload })
  showCreate.value = false; await load()
  toast.success('Vendor bill created.')
}
async function pay() {
  if (!paymentBill.value) return
  const payload = { ...payment }
  if (paymentProof.value) {
    const formData = new FormData()
    formData.append('file', paymentProof.value)
    const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData })
    payload.proofUrl = uploaded.url
    payload.proofOriginalName = uploaded.originalName
  }
  await request(`/vendor-payables/${paymentBill.value.id}/payments`, { method: 'POST', body: payload })
  showPayment.value = false; paymentBill.value = null; await load()
  toast.success('Vendor payment recorded.')
}
onMounted(async () => {
  if (route.query.bookingId) billFilters.bookingId = String(route.query.bookingId)
  await load()
})
</script>
