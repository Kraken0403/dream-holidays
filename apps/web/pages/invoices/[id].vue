<template>
  <div>
    <div class="no-print mb-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/invoices" class="hover:text-blue-600 transition-colors">Invoices</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          <span class="text-gray-700 font-medium">{{ invoice?.invoiceNumber || 'Loading...' }}</span>
        </div>
        <h1 class="text-lg font-semibold text-gray-900">{{ invoice?.invoiceNumber || 'Invoice' }}</h1>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500"><span>{{ invoice?.client?.name || 'Client invoice' }}</span><NuxtLink v-if="invoice?.booking?.id" :to="`/bookings/${invoice.booking.id}`" class="text-blue-600 hover:text-blue-800">{{ invoice.booking.bookingNumber }}</NuxtLink><span v-if="invoice" :class="statusBadge(invoice.status)" class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold">{{ invoice.status }}</span></div>
      </div>
      <div v-if="invoice" class="flex items-center gap-2">
        <button type="button" @click="printInvoice" class="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">Print</button>
        <button type="button" @click="downloadPdf" :disabled="exporting" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
          {{ exporting ? 'Exporting...' : 'Export PDF' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-3 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Loading invoice...
    </div>

    <div v-else-if="error" class="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
      <p class="font-semibold text-red-700">{{ error }}</p>
      <button type="button" @click="load" class="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors">Try Again</button>
    </div>

    <div v-if="invoice" class="no-print mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Invoice total</p><p class="mt-1 text-lg font-bold text-gray-900">{{ money(invoice.grandTotal) }}</p></div>
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Paid</p><p class="mt-1 text-lg font-bold text-green-700">{{ money(invoice.paidAmount) }}</p></div>
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Outstanding</p><p class="mt-1 text-lg font-bold" :class="Number(invoice.outstandingAmount) > 0 ? 'text-orange-700' : 'text-green-700'">{{ money(invoice.outstandingAmount) }}</p></div>
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Due date</p><p class="mt-1 text-lg font-bold text-gray-900">{{ dateOnly(invoice.dueDate) }}</p></div>
    </div>

    <section v-if="invoice" ref="invoiceRef" class="invoice-paper bg-white border border-gray-200 shadow-sm mx-auto text-gray-900">
      <div class="p-6">
        <header class="flex items-start justify-between gap-8 border-b-2 border-gray-900 pb-4">
          <div class="min-w-0">
            <img v-if="invoice.company?.logoUrl && !logoFailed" :src="logoDataUrl || assetUrl(invoice.company.logoUrl)" crossorigin="anonymous" alt="Company logo" class="mb-3 h-16 max-w-[190px] object-contain object-left" @error="logoFailed = true" />
            <div v-else class="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">{{ companyInitials }}</div>
            <h2 class="text-xl font-bold leading-tight">{{ invoice.company?.legalName || invoice.company?.name }}</h2>
            <div class="mt-2 text-xs leading-5 text-gray-600">
              <div v-for="line in companyAddress" :key="line">{{ line }}</div>
              <div v-if="invoice.company?.phone">Phone: {{ invoice.company.phone }}</div>
              <div v-if="invoice.company?.email">Email: {{ invoice.company.email }}</div>
              <div v-if="invoice.company?.panNumber">PAN: {{ invoice.company.panNumber }}</div>
              <div v-if="invoice.company?.gstNumber" class="font-semibold text-gray-800">GSTIN: {{ invoice.company.gstNumber }}</div>
            </div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-[11px] font-semibold tracking-wide uppercase text-gray-500">Original for Recipient</div>
            <h1 class="mt-2 text-xl font-bold tracking-normal">{{ documentTitle }}</h1>
          </div>
        </header>

        <div class="grid grid-cols-2 gap-8 border-b border-gray-200 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Bill To</p>
            <h3 class="font-bold text-gray-900">{{ invoice.client?.companyName || invoice.client?.name }}</h3>
            <p v-if="invoice.client?.name && invoice.client?.companyName" class="text-sm text-gray-700">{{ invoice.client.name }}</p>
            <div class="mt-2 text-xs leading-5 text-gray-600">
              <div v-for="line in clientAddress" :key="line">{{ line }}</div>
              <div v-if="invoice.client?.phone">Phone: {{ invoice.client.phone }}</div>
              <div v-if="invoice.client?.email">Email: {{ invoice.client.email }}</div>
              <div v-if="invoice.client?.panNumber">PAN: {{ invoice.client.panNumber }}</div>
              <div class="font-semibold text-gray-800">GSTIN/UIN: {{ invoice.client?.gstNumber || 'Unregistered' }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div class="text-gray-500">Invoice No.</div>
            <div class="font-semibold text-right">{{ invoice.invoiceNumber }}</div>
            <div class="text-gray-500">Invoice Date</div>
            <div class="font-semibold text-right">{{ dateOnly(invoice.invoiceDate) }}</div>
            <div class="text-gray-500">Due Date</div>
            <div class="font-semibold text-right">{{ dateOnly(invoice.dueDate) }}</div>
            <div class="text-gray-500">Booking ID</div>
            <div class="font-semibold text-right">{{ invoice.booking?.bookingNumber || '-' }}</div>
            <div class="text-gray-500">Place of Supply</div>
            <div class="font-semibold text-right">{{ placeOfSupply || '-' }}</div>
            <div class="text-gray-500">Reverse Charge</div>
            <div class="font-semibold text-right">No</div>
            <div v-if="isGstInvoice" class="text-gray-500">Supply Type</div>
            <div v-if="isGstInvoice" class="font-semibold text-right">{{ taxModeLabel }}</div>
          </div>
        </div>

        <div v-if="complianceWarnings.length" class="my-4 border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <div v-for="warning in complianceWarnings" :key="warning">{{ warning }}</div>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full invoice-table text-xs">
            <thead>
              <tr>
                <th class="w-8">#</th>
                <th class="w-20">HSN/SAC</th>
                <th>Description</th>
                <th class="text-right w-16">Qty</th>
                <th class="text-right w-24">Rate</th>
                <th class="text-right w-28">Taxable</th>
                <th v-if="isGstInvoice" class="text-right w-20">GST %</th>
                <th v-if="isGstInvoice && isIntraState" class="text-right w-24">CGST</th>
                <th v-if="isGstInvoice && isIntraState" class="text-right w-24">SGST</th>
                <th v-if="isGstInvoice && !isIntraState" class="text-right w-24">IGST</th>
                <th class="text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoiceItems" :key="item.id">
                <td>{{ item.index }}</td>
                <td>{{ item.hsnSac || '-' }}</td>
                <td class="font-medium text-gray-800">{{ item.description }}</td>
                <td class="text-right">{{ formatQty(item.quantity) }}</td>
                <td class="text-right">{{ money(item.rate) }}</td>
                <td class="text-right">{{ money(item.taxableValue) }}</td>
                <td v-if="isGstInvoice" class="text-right">{{ formatPercent(item.gstRate) }}</td>
                <td v-if="isGstInvoice && isIntraState" class="text-right">{{ money(item.cgst) }}</td>
                <td v-if="isGstInvoice && isIntraState" class="text-right">{{ money(item.sgst) }}</td>
                <td v-if="isGstInvoice && !isIntraState" class="text-right">{{ money(item.igst) }}</td>
                <td class="text-right font-semibold">{{ money(item.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-8">
          <div class="text-xs leading-5 text-gray-600">
            <p class="font-bold uppercase tracking-wide text-gray-500 mb-2">Amount In Words</p>
            <p class="font-semibold text-gray-900">{{ amountInWords }}</p>

            <div v-if="bankAccount" class="mt-5">
              <p class="font-bold uppercase tracking-wide text-gray-500 mb-2">Bank Details</p>
              <div>Bank: {{ bankAccount.bankName }}</div>
              <div>Account Name: {{ bankAccount.accountName }}</div>
              <div>Account No.: {{ bankAccount.accountNumber }}</div>
              <div v-if="bankAccount.ifscCode">IFSC: {{ bankAccount.ifscCode }}</div>
              <div v-if="bankAccount.branch">Branch: {{ bankAccount.branch }}</div>
            </div>
          </div>

          <div class="ml-auto w-full max-w-sm">
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-500">Subtotal</span><span class="font-semibold">{{ money(invoice.subtotal) }}</span></div>
              <div v-if="isGstInvoice && isIntraState" class="flex justify-between"><span class="text-gray-500">CGST</span><span class="font-semibold">{{ money(totalCgst) }}</span></div>
              <div v-if="isGstInvoice && isIntraState" class="flex justify-between"><span class="text-gray-500">SGST</span><span class="font-semibold">{{ money(totalSgst) }}</span></div>
              <div v-if="isGstInvoice && !isIntraState" class="flex justify-between"><span class="text-gray-500">IGST</span><span class="font-semibold">{{ money(totalIgst) }}</span></div>
              <div v-if="!isGstInvoice" class="flex justify-between"><span class="text-gray-500">GST</span><span class="font-semibold">Not charged</span></div>
              <div v-if="Number(invoice.roundOff || 0)" class="flex justify-between"><span class="text-gray-500">Round Off</span><span class="font-semibold">{{ money(invoice.roundOff) }}</span></div>
              <div class="flex justify-between border-t border-gray-300 pt-2 text-base"><span class="font-bold">Grand Total</span><span class="font-bold">{{ money(invoice.grandTotal) }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-gray-500">Paid</span><span class="font-semibold text-green-700">{{ money(invoice.paidAmount) }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-gray-500">Outstanding</span><span class="font-semibold text-orange-700">{{ money(invoice.outstandingAmount) }}</span></div>
            </div>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-8 border-t border-gray-200 pt-4">
          <div class="text-xs leading-5 text-gray-600">
            <p v-if="invoice.notes" class="mb-3"><span class="font-semibold text-gray-800">Notes:</span> {{ invoice.notes }}</p>
            <p v-if="invoice.terms"><span class="font-semibold text-gray-800">Terms:</span> {{ invoice.terms }}</p>
            <p v-if="isBillOfSupply" class="mt-3 font-semibold text-gray-800">GST is not charged on this bill of supply.</p>
          </div>
          <div class="text-right">
            <div class="h-16 flex items-end justify-end">
              <img v-if="invoice.company?.signatureUrl" :src="assetUrl(invoice.company.signatureUrl)" alt="Authorized signature" class="max-h-14 max-w-[180px] object-contain" />
            </div>
            <div class="mt-3 border-t border-gray-400 pt-2 text-sm font-semibold">Authorised Signatory</div>
            <div class="text-xs text-gray-500">{{ invoice.company?.name }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const { request } = useApi()
const { formatDate } = useDateTime()

const invoice = ref(null)
const loading = ref(true)
const error = ref('')
const exporting = ref(false)
const invoiceRef = ref(null)
const logoDataUrl = ref('')
const logoFailed = ref(false)

const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const money = (value) => rupeeFormatter.format(Number(value || 0))
const dateOnly = formatDate
const formatQty = (value) => numberFormatter.format(Number(value || 0))
const formatPercent = (value) => `${numberFormatter.format(value)}%`
const normalize = (value) => String(value || '').trim().toLowerCase()
const statusBadge = (status) => ({ DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-700', PARTIALLY_PAID: 'bg-amber-100 text-amber-700', PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-red-100 text-red-700' }[status] || 'bg-gray-100 text-gray-700')

const companyAddress = computed(() => addressLines(invoice.value?.company, ['addressLine1', 'addressLine2', 'city', 'state', 'country', 'pincode']))
const clientAddress = computed(() => {
  const client = invoice.value?.client
  if (!client) return []
  return [client.billingAddress, client.city, client.state, client.country, client.pincode].filter(Boolean)
})
const placeOfSupply = computed(() => invoice.value?.placeOfSupply || invoice.value?.client?.state || '')
const isGstInvoice = computed(() => Boolean(invoice.value?.company?.gstNumber) && Number(invoice.value?.taxAmount || 0) > 0)
const isBillOfSupply = computed(() => Boolean(invoice.value?.company?.gstNumber) && Number(invoice.value?.taxAmount || 0) <= 0)
const documentTitle = computed(() => isGstInvoice.value ? 'TAX INVOICE' : (isBillOfSupply.value ? 'BILL OF SUPPLY' : 'INVOICE'))
const hasSupplyState = computed(() => Boolean(normalize(invoice.value?.company?.state) && normalize(placeOfSupply.value)))
const isIntraState = computed(() => hasSupplyState.value && normalize(invoice.value?.company?.state) === normalize(placeOfSupply.value))
const taxModeLabel = computed(() => isIntraState.value ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)')
const bankAccount = computed(() => invoice.value?.company?.bankAccounts?.[0] || null)
const companyInitials = computed(() => String(invoice.value?.company?.name || 'DH').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())

const invoiceItems = computed(() => (invoice.value?.items || []).map((item, index) => {
  const quantity = Number(item.quantity || 1)
  const rate = Number(item.rate || 0)
  const taxableValue = quantity * rate
  const tax = Number(item.taxAmount || 0)
  const total = item.total === undefined ? taxableValue + tax : Number(item.total || 0)
  const gstRate = taxableValue > 0 ? (tax / taxableValue) * 100 : 0

  return {
    ...item,
    index: index + 1,
    quantity,
    rate,
    taxableValue,
    tax,
    gstRate,
    cgst: isIntraState.value ? tax / 2 : 0,
    sgst: isIntraState.value ? tax / 2 : 0,
    igst: isIntraState.value ? 0 : tax,
    total,
  }
}))

const totalCgst = computed(() => sum(invoiceItems.value.map((item) => item.cgst)))
const totalSgst = computed(() => sum(invoiceItems.value.map((item) => item.sgst)))
const totalIgst = computed(() => sum(invoiceItems.value.map((item) => item.igst)))
const amountInWords = computed(() => `${toIndianWords(Math.round(Number(invoice.value?.grandTotal || 0)))} Rupees Only`)
const complianceWarnings = computed(() => {
  if (!invoice.value) return []
  const warnings = []
  if (isGstInvoice.value && !placeOfSupply.value) warnings.push('Place of supply is missing. Add it for GST reporting.')
  if (isGstInvoice.value && !hasSupplyState.value) warnings.push('Supplier state or place of supply is missing, so IGST has been assumed.')
  if ((invoice.value.items || []).some((item) => !item.hsnSac)) warnings.push('One or more invoice items are missing HSN/SAC.')
  return warnings
})

async function load() {
  loading.value = true
  error.value = ''
  logoDataUrl.value = ''
  logoFailed.value = false
  try {
    invoice.value = await request(`/invoices/${route.params.id}`)
    prepareLogo()
  } catch (err) {
    invoice.value = null
    error.value = err?.data?.message || err?.message || 'Unable to load this invoice.'
  } finally {
    loading.value = false
  }
}

async function downloadPdf() {
  if (!invoiceRef.value) return
  exporting.value = true
  try {
    await nextTick()
    await prepareLogo()
    await nextTick()
    await waitForImages(invoiceRef.value)
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(invoiceRef.value, { scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#ffffff', letterRendering: true, imageTimeout: 15000 })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
    const margin = 5
    const availableWidth = 210 - (margin * 2)
    const availableHeight = 297 - (margin * 2)
    const naturalHeight = (canvas.height * availableWidth) / canvas.width
    const scaleToPage = Math.min(1, availableHeight / naturalHeight)
    const renderWidth = availableWidth * scaleToPage
    const renderHeight = naturalHeight * scaleToPage
    const offsetX = (210 - renderWidth) / 2
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', offsetX, margin, renderWidth, renderHeight, undefined, 'FAST')
    pdf.save(pdfFileName.value)
  } finally {
    exporting.value = false
  }
}

function printInvoice() {
  window.print()
}

const pdfFileName = computed(() => `${invoice.value?.invoiceNumber || 'invoice'}.pdf`.replace(/[\\/:*?"<>|]+/g, '-'))

function addressLines(source, keys) {
  if (!source) return []
  return keys.map((key) => source[key]).filter(Boolean)
}

function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const apiOrigin = String(config.public.apiBase || '').replace(/\/api\/?$/, '')
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`
}

async function prepareLogo() {
  const path = invoice.value?.company?.logoUrl
  if (!path || logoDataUrl.value || logoFailed.value) return
  try {
    const response = await fetch(assetUrl(path))
    if (!response.ok) throw new Error('Unable to load logo')
    logoDataUrl.value = await blobToDataUrl(await response.blob())
  } catch {
    logoFailed.value = false
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function waitForImages(element) {
  const images = [...element.querySelectorAll('img')]
  await Promise.all(images.map((image) => image.complete
    ? (image.decode ? image.decode().catch(() => {}) : Promise.resolve())
    : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }) })))
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0)
}

function toIndianWords(value) {
  const number = Math.abs(Number(value || 0))
  if (number === 0) return 'Zero'

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const belowHundred = (n) => {
    if (n < 20) return ones[n]
    return [tens[Math.floor(n / 10)], ones[n % 10]].filter(Boolean).join(' ')
  }

  const belowThousand = (n) => {
    const hundred = Math.floor(n / 100)
    const rest = n % 100
    return [hundred ? `${ones[hundred]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ')
  }

  const crore = Math.floor(number / 10000000)
  const lakh = Math.floor((number % 10000000) / 100000)
  const thousand = Math.floor((number % 100000) / 1000)
  const rest = number % 1000

  return [
    crore ? `${belowThousand(crore)} Crore` : '',
    lakh ? `${belowThousand(lakh)} Lakh` : '',
    thousand ? `${belowThousand(thousand)} Thousand` : '',
    rest ? belowThousand(rest) : '',
  ].filter(Boolean).join(' ')
}

onMounted(load)
watch(() => route.params.id, load)
</script>

<style scoped>
.invoice-paper {
  width: min(100%, 210mm);
  min-height: 0;
}

.invoice-table {
  border-collapse: collapse;
}

.invoice-table th {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  color: #374151;
  font-weight: 700;
  padding: 6px;
  text-align: left;
}

.invoice-table td {
  border: 1px solid #d1d5db;
  padding: 6px;
  vertical-align: top;
}

.invoice-table th.text-right,
.invoice-table td.text-right {
  text-align: right;
}

@media print {
  :global(body) {
    background: white;
  }

  .no-print {
    display: none !important;
  }

  .invoice-paper {
    width: 210mm;
    min-height: 0;
    border: 0;
    box-shadow: none;
    margin: 0;
  }
}
</style>
