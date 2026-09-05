<template>
  <div>
    <PageHeader title="Invoice Settings" subtitle="Configure invoices and proforma invoices, including their live document layout." />
    <SettingsTabs />

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]">
      <form class="space-y-4" @submit.prevent="save">
        <section class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header class="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 text-white">
            <h2 class="font-semibold">Document defaults</h2>
            <p class="mt-0.5 text-xs text-blue-100">Titles, numbering, payment terms and signature.</p>
          </header>
          <div class="grid gap-4 p-5 md:grid-cols-2">
            <div><label :class="LABEL">Invoice title</label><input v-model="form.invoiceTitle" :class="INP" placeholder="Tax Invoice" /></div>
            <div><label :class="LABEL">Proforma title</label><input v-model="form.proformaTitle" :class="INP" placeholder="Proforma Invoice" /></div>
            <div><label :class="LABEL">Invoice number format</label><input v-model="form.invoiceNumberFormat" :class="INP" placeholder="{PREFIX}/{FY}/{NUMBER}" /></div>
            <div><label :class="LABEL">Proforma number format</label><input v-model="form.proformaNumberFormat" :class="INP" placeholder="{PREFIX}/{FY}/{NUMBER}" /></div>
            <div><label :class="LABEL">Default due days</label><input v-model.number="form.defaultDueDays" type="number" min="0" :class="INP" placeholder="7" /></div>
            <div><label :class="LABEL">Payment modes</label><input v-model="paymentModesText" :class="INP" placeholder="Cash, Bank Transfer, UPI" /></div>
            <p class="-mt-2 text-xs text-gray-400 md:col-span-2">Number tokens: {PREFIX}, {FY}, {YEAR}, {NUMBER}. Company prefixes continue to come from My Companies.</p>
            <div class="md:col-span-2"><label :class="LABEL">Default terms and conditions</label><RichTextEditor v-model="form.invoiceTerms" placeholder="Enter and format the terms shown on invoices and proforma invoices" /><p class="mt-1 text-xs text-gray-400">Formatting, lists, alignment and links are preserved on the final document.</p></div>
            <div class="md:col-span-2"><label :class="LABEL">Document footer</label><input v-model="form.invoiceFooter" :class="INP" placeholder="Thank you for your business" /></div>
            <div class="md:col-span-2">
              <label :class="LABEL">Authorized signature</label>
              <div class="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-300 p-3">
                <img v-if="form.authorizedSignatureUrl" :src="assetUrl(form.authorizedSignatureUrl)" alt="Authorized signature" class="h-16 w-40 object-contain object-left" />
                <div v-else class="flex h-16 w-40 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400">No signature uploaded</div>
                <label class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0L8 8m4-4 4 4M4 16v4h16v-4"/></svg>{{ uploading ? 'Uploading...' : 'Upload image' }}
                  <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" :disabled="uploading" @change="uploadSignature" />
                </label>
                <button v-if="form.authorizedSignatureUrl" type="button" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" @click="form.authorizedSignatureUrl = ''"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 7 1 14h10l1-14M4 7h16M9 7V4h6v3"/></svg>Remove</button>
                <p class="w-full text-xs text-gray-400">PNG, JPG or WebP, up to 2 MB.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 class="font-semibold text-gray-900">Document columns</h2><p class="mt-0.5 text-xs text-gray-500">Drag to reorder, rename, align, show, hide, or add mapped columns.</p></div>
            <AppTabs v-model="editorType" :tabs="documentTabs" class="!mb-0" />
          </div>
          <div class="space-y-2">
            <article v-for="column in editedColumns" :key="column.id" draggable="true" class="rounded-lg border border-gray-200 p-3" @dragstart="draggedColumn = column.id" @dragover.prevent @drop="dropColumn(column.id)">
              <div class="flex flex-wrap items-center gap-2">
                <svg class="h-5 w-5 cursor-grab text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"/></svg>
                <input v-model="column.visible" type="checkbox" class="rounded border-gray-300 text-blue-600" />
                <input v-model="column.label" :class="INP + ' min-w-[150px] flex-1 !py-1.5'" placeholder="Column label" />
                <select v-model="column.source" :class="INP + ' w-40 !py-1.5'"><option v-for="source in columnSources" :key="source.id" :value="source.id">{{ source.label }}</option></select>
                <div class="flex rounded-md border border-gray-200 p-0.5"><button v-for="alignment in alignments" :key="alignment.id" type="button" :title="alignment.label" class="rounded p-1.5" :class="column.align === alignment.id ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'" @click="column.align = alignment.id"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" :d="alignment.path"/></svg></button></div>
                <button type="button" title="Delete column" class="rounded-md p-1.5 text-red-500 hover:bg-red-50" @click="deleteColumn(column.id)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 7 1 14h10l1-14M4 7h16M9 7V4h6v3"/></svg></button>
              </div>
            </article>
          </div>
          <button type="button" class="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100" @click="addColumn"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add mapped column</button>
        </section>

        <button type="submit" :disabled="saving" class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3h11l3 3v15H5V3Zm3 0v6h8V3M8 21v-8h8v8"/></svg>{{ saving ? 'Saving...' : 'Save invoice settings' }}</button>
      </form>

      <aside class="xl:sticky xl:top-4 xl:self-start">
        <div class="mb-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div class="mb-2 flex items-center justify-between"><div><h2 class="text-sm font-semibold text-gray-900">Preview data</h2><p class="text-xs text-gray-500">These selections affect the preview only.</p></div><span class="rounded-full bg-green-50 px-2 py-1 text-[10px] font-semibold uppercase text-green-700">Live</span></div><div class="grid gap-2 sm:grid-cols-2"><div><label class="mb-1 block text-[11px] font-semibold text-gray-500">Billing company</label><SearchableSelect v-model="previewCompanyId" :options="companies" placeholder="Select company" /></div><div><label class="mb-1 block text-[11px] font-semibold text-gray-500">Booking</label><SearchableSelect v-model="previewBookingId" :options="bookings" label-key="bookingNumber" secondary-key="title" placeholder="Select booking" /></div></div></div>
        <div class="mb-2 flex items-center justify-between"><div><h2 class="text-sm font-semibold text-gray-900">Exact document preview</h2><p class="text-xs text-gray-500">Same structure and settings used on the single invoice page.</p></div></div>
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-gray-100 p-4 shadow-sm">
          <article class="min-w-[760px] bg-white p-6 text-xs text-gray-800 shadow">
            <header class="flex items-start justify-between gap-8 border-b-2 border-gray-900 pb-4"><div><img v-if="preview.company.logoUrl" :src="assetUrl(preview.company.logoUrl)" class="mb-3 h-14 max-w-44 object-contain object-left" alt="Company logo" /><div v-else class="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{{ previewCompanyInitials }}</div><h2 class="text-xl font-bold">{{ preview.company.legalName || preview.company.name }}</h2><div class="mt-2 leading-5 text-gray-600"><div v-for="line in previewCompanyAddress" :key="line">{{ line }}</div><div v-if="preview.company.phone">Phone: {{ preview.company.phone }}</div><div v-if="preview.company.email">Email: {{ preview.company.email }}</div><div v-if="preview.company.panNumber">PAN: {{ preview.company.panNumber }}</div><div v-if="preview.company.gstNumber" class="font-semibold">GSTIN: {{ preview.company.gstNumber }}</div></div></div><div class="text-right"><div class="text-[10px] font-semibold uppercase text-gray-500">Original for Recipient</div><h1 class="mt-2 text-xl font-bold">{{ previewTitle }}</h1></div></header>
            <div class="grid grid-cols-2 gap-8 border-b py-4"><div><div class="font-semibold uppercase text-gray-500">Bill To</div><div class="mt-2 text-sm font-bold">{{ preview.client.companyName || preview.client.name }}</div><div v-if="preview.client.companyName">{{ preview.client.name }}</div><div class="mt-2 leading-5 text-gray-600"><div v-if="preview.client.billingAddress">{{ preview.client.billingAddress }}</div><div v-if="preview.client.city">{{ preview.client.city }}</div><div v-if="preview.client.state">{{ preview.client.state }}</div><div v-if="preview.client.phone">Phone: {{ preview.client.phone }}</div><div v-if="preview.client.email">Email: {{ preview.client.email }}</div><div v-if="preview.client.panNumber">PAN: {{ preview.client.panNumber }}</div><div v-if="editorType === 'INVOICE'" class="font-semibold">GSTIN/UIN: {{ preview.client.gstNumber || 'Unregistered' }}</div></div></div><div class="grid grid-cols-2 gap-x-4 gap-y-2"><span class="text-gray-500">Document No.</span><strong class="text-right">{{ preview.number }}</strong><span class="text-gray-500">Document Date</span><strong class="text-right">{{ preview.date }}</strong><span class="text-gray-500">Due Date</span><strong class="text-right">{{ preview.due }}</strong><span class="text-gray-500">Booking ID</span><strong class="text-right">{{ preview.bookingNumber }}</strong><template v-if="editorType === 'INVOICE'"><span class="text-gray-500">Place of Supply</span><strong class="text-right">{{ preview.client.state || '-' }}</strong><span class="text-gray-500">Reverse Charge</span><strong class="text-right">No</strong><template v-if="previewIsGst"><span class="text-gray-500">Supply Type</span><strong class="text-right">{{ previewIsIntraState ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)' }}</strong></template></template></div></div>
            <table class="mt-4 w-full border-collapse"><thead><tr class="bg-gray-100"><th v-for="column in previewColumns" :key="column.id" class="border border-gray-300 px-2 py-2" :class="alignmentClass(column.align)">{{ column.label }}</th></tr></thead><tbody><tr v-for="(item, index) in preview.items" :key="index"><td v-for="column in previewColumns" :key="column.id" class="border border-gray-300 px-2 py-2" :class="alignmentClass(column.align)">{{ previewCell(item, column.source, index) }}</td></tr></tbody></table>
            <div class="mt-4 grid grid-cols-2 gap-8"><div><p class="font-semibold uppercase text-gray-500">Amount in words</p><p class="mt-2 font-semibold">{{ amountInWords }}</p><div v-if="previewBank" class="mt-5 leading-5 text-gray-600"><p class="font-semibold uppercase text-gray-500">Bank details</p><div>Bank: {{ previewBank.bankName }}</div><div>Account Name: {{ previewBank.accountName }}</div><div>Account No.: {{ previewBank.accountNumber }}</div><div v-if="previewBank.ifscCode">IFSC: {{ previewBank.ifscCode }}</div><div v-if="previewBank.branch">Branch: {{ previewBank.branch }}</div></div></div><div class="ml-auto w-full max-w-xs space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-500">Subtotal</span><strong>{{ money(preview.subtotal) }}</strong></div><template v-if="editorType === 'INVOICE' && previewIsGst"><div v-if="previewIsIntraState" class="flex justify-between"><span class="text-gray-500">CGST</span><strong>{{ money(preview.tax / 2) }}</strong></div><div v-if="previewIsIntraState" class="flex justify-between"><span class="text-gray-500">SGST</span><strong>{{ money(preview.tax / 2) }}</strong></div><div v-else class="flex justify-between"><span class="text-gray-500">IGST</span><strong>{{ money(preview.tax) }}</strong></div></template><div v-else-if="editorType === 'INVOICE'" class="flex justify-between"><span class="text-gray-500">GST</span><strong>Not charged</strong></div><div class="flex justify-between border-t pt-2 text-base"><strong>Grand Total</strong><strong>{{ money(preview.total) }}</strong></div><template v-if="editorType === 'INVOICE'"><div class="flex justify-between"><span class="text-gray-500">Paid</span><strong class="text-green-700">{{ money(0) }}</strong></div><div class="flex justify-between"><span class="text-gray-500">Outstanding</span><strong class="text-orange-700">{{ money(preview.total) }}</strong></div></template></div></div>
            <div class="mt-6 grid grid-cols-2 gap-8 border-t pt-4"><div class="text-gray-600"><div v-if="form.invoiceTerms" class="invoice-rich-text"><span class="font-semibold text-gray-800">Terms:</span><div class="mt-1" v-html="form.invoiceTerms"></div></div><p v-if="previewIsBillOfSupply" class="mt-3 font-semibold text-gray-800">GST is not charged on this bill of supply.</p></div><div class="text-right"><div class="flex h-16 items-end justify-end"><img v-if="form.authorizedSignatureUrl" :src="assetUrl(form.authorizedSignatureUrl)" class="max-h-14 max-w-44 object-contain" alt="Signature" /></div><div class="mt-2 border-t border-gray-400 pt-2 font-semibold">Authorized Signatory</div><div class="text-gray-500">{{ preview.company.name }}</div></div></div>
            <div v-if="form.invoiceFooter" class="mt-5 border-t border-gray-100 pt-3 text-center text-gray-400">{{ form.invoiceFooter }}</div>
          </article>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const config = useRuntimeConfig()
const toast = useToast()
const { formatDate } = useDateTime()
const INP = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
const LABEL = 'mb-1.5 block text-sm font-medium text-gray-700'
const documentTabs = [{ id: 'INVOICE', label: 'Invoice' }, { id: 'PROFORMA', label: 'Proforma' }]
const columnSources = [{ id: 'index', label: 'Item number' }, { id: 'hsnSac', label: 'HSN/SAC' }, { id: 'description', label: 'Description' }, { id: 'quantity', label: 'Quantity' }, { id: 'rate', label: 'Rate' }, { id: 'taxableValue', label: 'Taxable value' }, { id: 'tax', label: 'Tax' }, { id: 'total', label: 'Line total' }]
const alignments = [{ id: 'left', label: 'Align left', path: 'M4 6h16M4 10h10M4 14h16M4 18h10' }, { id: 'center', label: 'Align center', path: 'M4 6h16M7 10h10M4 14h16M7 18h10' }, { id: 'right', label: 'Align right', path: 'M4 6h16M10 10h10M4 14h16M10 18h10' }]
const defaultInvoiceColumns = () => [column('index', '#', 'center'), column('hsnSac', 'HSN/SAC'), column('description', 'Description'), column('quantity', 'Qty', 'right'), column('rate', 'Rate', 'right'), column('taxableValue', 'Taxable', 'right'), column('tax', 'Tax', 'right'), column('total', 'Total', 'right')]
const defaultProformaColumns = () => [column('index', '#', 'center'), column('description', 'Description'), column('quantity', 'Qty', 'right'), column('rate', 'Rate', 'right'), column('total', 'Amount', 'right')]
const form = reactive({ invoiceTitle: 'Tax Invoice', proformaTitle: 'Proforma Invoice', invoiceNumberFormat: '{PREFIX}/{FY}/{NUMBER}', proformaNumberFormat: '{PREFIX}/{FY}/{NUMBER}', defaultDueDays: 7, paymentModes: ['Cash', 'Bank Transfer', 'Cheque', 'UPI'], invoiceTerms: '', invoiceFooter: '', authorizedSignatureUrl: '', invoiceItemColumns: defaultInvoiceColumns(), proformaItemColumns: defaultProformaColumns() })
const paymentModesText = ref('')
const editorType = ref('INVOICE')
const latestInvoice = ref(null)
const companies = ref([])
const bookings = ref([])
const previewCompanyId = ref('')
const previewBookingId = ref('')
const saving = ref(false)
const uploading = ref(false)
const draggedColumn = ref('')
const editedColumns = computed(() => editorType.value === 'PROFORMA' ? form.proformaItemColumns : form.invoiceItemColumns)
const previewColumns = computed(() => editedColumns.value.filter(item => item.visible !== false && (editorType.value !== 'PROFORMA' || !['hsnSac', 'taxableValue', 'tax'].includes(item.source))))
const previewTitle = computed(() => editorType.value === 'PROFORMA' ? form.proformaTitle : form.invoiceTitle)
const selectedPreviewCompany = computed(() => companies.value.find(item => Number(item.id) === Number(previewCompanyId.value)) || latestInvoice.value?.company || {})
const selectedPreviewBooking = computed(() => bookings.value.find(item => Number(item.id) === Number(previewBookingId.value)) || null)
const preview = computed(() => {
  const booking = selectedPreviewBooking.value
  const fallbackItems = latestInvoice.value?.items || []
  const sourceItems = booking?.serviceItems?.length ? booking.serviceItems : fallbackItems
  const items = sourceItems.map((item, index) => {
    const quantity = Number(item.quantity || 1)
    const rate = Number(item.saleRate ?? item.rate ?? 0)
    const taxableValue = quantity * rate
    const tax = editorType.value === 'PROFORMA' ? 0 : Number(item.saleTax ?? item.taxAmount ?? 0)
    return { index: index + 1, hsnSac: item.hsnSac || '9985', description: item.description || 'Travel services', quantity, rate, taxableValue, tax, total: taxableValue + tax }
  })
  if (!items.length) items.push({ index: 1, hsnSac: '9985', description: 'Travel services', quantity: 1, rate: 12500, taxableValue: 12500, tax: editorType.value === 'PROFORMA' ? 0 : 2250, total: editorType.value === 'PROFORMA' ? 12500 : 14750 })
  const subtotal = items.reduce((sum, item) => sum + item.taxableValue, 0)
  const tax = items.reduce((sum, item) => sum + item.tax, 0)
  const client = booking?.clientSnapshot || booking?.client || latestInvoice.value?.clientSnapshot || latestInvoice.value?.client || { name: 'Sample Client' }
  const company = selectedPreviewCompany.value
  const documentDate = new Date()
  const dueDate = new Date(documentDate); dueDate.setDate(dueDate.getDate() + Number(form.defaultDueDays || 0))
  const prefix = editorType.value === 'PROFORMA' ? company.proformaPrefix || 'PI' : company.invoicePrefix || 'INV'
  return { company: { name: company.name || 'Dream Holidays', ...company }, client, bookingNumber: booking?.bookingNumber || '-', number: latestInvoice.value?.bookingId === booking?.id && latestInvoice.value?.documentType === editorType.value ? latestInvoice.value.invoiceNumber : `${prefix}/2026-27/00001`, date: formatDate(documentDate), due: formatDate(dueDate), items, subtotal, tax, total: subtotal + tax }
})
const previewCompanyAddress = computed(() => [preview.value.company.addressLine1, preview.value.company.addressLine2, preview.value.company.city, preview.value.company.state, preview.value.company.country, preview.value.company.pincode].filter(Boolean))
const previewBank = computed(() => preview.value.company.bankAccounts?.find(item => item.isDefault) || preview.value.company.bankAccounts?.[0] || null)
const amountInWords = computed(() => `${toIndianWords(Math.round(preview.value.total))} Rupees Only`)
const previewIsGst = computed(() => editorType.value === 'INVOICE' && Boolean(preview.value.company.gstNumber) && preview.value.tax > 0)
const previewIsBillOfSupply = computed(() => editorType.value === 'INVOICE' && Boolean(preview.value.company.gstNumber) && preview.value.tax <= 0)
const previewIsIntraState = computed(() => Boolean(preview.value.company.state && preview.value.client.state) && String(preview.value.company.state).trim().toLowerCase() === String(preview.value.client.state).trim().toLowerCase())
const previewCompanyInitials = computed(() => String(preview.value.company.name || 'DH').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase())

function column(source, label, align = 'left') { return { id: `${source}-${Date.now()}-${Math.random()}`, source, label, align, visible: true } }
function alignmentClass(align) { return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left' }
function previewCell(item, source, index) { const value = source === 'index' ? index + 1 : item[source]; return ['rate', 'taxableValue', 'tax', 'total'].includes(source) ? money(value) : value }
function money(value) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0)) }
function assetUrl(path) { if (!path || /^https?:\/\//i.test(path)) return path || ''; const apiOrigin = String(config.public.apiBase || '').replace(/\/api\/?$/, ''); return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}` }
function addColumn() { editedColumns.value.push(column('description', 'New column')) }
function deleteColumn(id) { const index = editedColumns.value.findIndex(item => item.id === id); if (index >= 0) editedColumns.value.splice(index, 1) }
function dropColumn(targetId) { const from = editedColumns.value.findIndex(item => item.id === draggedColumn.value); const to = editedColumns.value.findIndex(item => item.id === targetId); if (from < 0 || to < 0 || from === to) return; const [item] = editedColumns.value.splice(from, 1); editedColumns.value.splice(to, 0, item); draggedColumn.value = '' }
async function load() {
  const [settings, invoices, loadedCompanies, loadedBookings] = await Promise.all([request('/settings'), request('/invoices'), request('/companies'), request('/bookings')])
  Object.assign(form, settings)
  companies.value = loadedCompanies
  bookings.value = loadedBookings
  if (!Array.isArray(form.invoiceItemColumns) || !form.invoiceItemColumns.length) form.invoiceItemColumns = defaultInvoiceColumns()
  if (!Array.isArray(form.proformaItemColumns) || !form.proformaItemColumns.length) form.proformaItemColumns = defaultProformaColumns()
  paymentModesText.value = (form.paymentModes || []).join(', ')
  if (invoices?.[0]) latestInvoice.value = await request(`/invoices/${invoices[0].id}`)
  previewCompanyId.value = latestInvoice.value?.companyId || companies.value[0]?.id || ''
  previewBookingId.value = latestInvoice.value?.bookingId || bookings.value[0]?.id || ''
}
async function save() {
  saving.value = true
  try { form.paymentModes = paymentModesText.value.split(',').map(item => item.trim()).filter(Boolean); await request('/settings', { method: 'PUT', body: form }); toast.success('Invoice settings saved.') } finally { saving.value = false }
}
async function uploadSignature(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const body = new FormData(); body.append('file', file)
  uploading.value = true
  try { const result = await request('/uploads/authorized-signature', { method: 'POST', body }); form.authorizedSignatureUrl = result.url; toast.success('Authorized signature uploaded. Save settings to apply it.') } finally { uploading.value = false; event.target.value = '' }
}
function toIndianWords(value) {
  const number = Math.abs(Number(value || 0)); if (!number) return 'Zero'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const underHundred = n => n < 20 ? ones[n] : [tens[Math.floor(n / 10)], ones[n % 10]].filter(Boolean).join(' ')
  const underThousand = n => [Math.floor(n / 100) ? `${ones[Math.floor(n / 100)]} Hundred` : '', n % 100 ? underHundred(n % 100) : ''].filter(Boolean).join(' ')
  const crore = Math.floor(number / 10000000), lakh = Math.floor((number % 10000000) / 100000), thousand = Math.floor((number % 100000) / 1000), rest = number % 1000
  return [crore ? `${underThousand(crore)} Crore` : '', lakh ? `${underThousand(lakh)} Lakh` : '', thousand ? `${underThousand(thousand)} Thousand` : '', rest ? underThousand(rest) : ''].filter(Boolean).join(' ')
}
onMounted(load)
</script>

<style scoped>
.invoice-rich-text :deep(ul) { list-style: disc; margin-left: 1.25rem; }
.invoice-rich-text :deep(ol) { list-style: decimal; margin-left: 1.25rem; }
.invoice-rich-text :deep(a) { color: #2563eb; text-decoration: underline; }
.invoice-rich-text :deep(p + p) { margin-top: .35rem; }
</style>
