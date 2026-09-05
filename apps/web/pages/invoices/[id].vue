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
        <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500"><span>{{ displayClient?.name || 'Client invoice' }}</span><NuxtLink v-if="invoice?.booking?.id" :to="`/bookings/${invoice.booking.id}`" class="text-blue-600 hover:text-blue-800">{{ invoice.booking.bookingNumber }}</NuxtLink><span v-if="invoice" class="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{{ documentTypeLabel }}</span><span v-if="invoice" :class="statusBadge(invoice.status)" class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold">{{ invoice.status }}</span></div>
      </div>
      <div v-if="invoice" class="flex items-center gap-2">
        <button type="button" :disabled="refreshingFormat" @click="refreshFormat" class="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.4-2L20 8M4 16l2.5 2a7 7 0 0 0 11.4-2"/></svg>{{ refreshingFormat ? 'Refreshing...' : 'Refresh Format' }}</button>
        <button v-if="invoice.documentType === 'INVOICE' && Number(invoice.outstandingAmount) > 0 && invoice.status !== 'CANCELLED'" type="button" @click="openPayment" class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Payment</button>
        <button v-if="invoice.paymentAllocations?.length" type="button" @click="showReceipts = true" class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg>Receipts</button>
        <button v-if="canDeleteInvoice" type="button" @click="openDeleteInvoice" class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg>Delete</button>
        <button v-if="invoice.documentType === 'PROFORMA' && !invoice.convertedInvoice" type="button" @click="convertProforma" class="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m14 5 5 5-5 5M19 10H8a4 4 0 0 0-4 4v5"/></svg>Convert to Invoice</button>
        <button type="button" @click="printInvoice" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 9V3h10v6M7 18H4V9h16v9h-3M7 14h10v7H7v-7Z"/></svg>Print</button>
        <button type="button" @click="downloadPdf" :disabled="exporting" class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>{{ exporting ? 'Exporting...' : 'Export PDF' }}
        </button>
      </div>
    </div>

    <div v-if="invoice?.documentType === 'PROFORMA'" class="no-print mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-800">This is a non-posting proforma invoice. It is not a tax invoice or a demand for payment.</div>
    <div v-else-if="invoice?.cancellationId && invoice.documentType === 'CREDIT_NOTE'" class="no-print mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">This cancellation credit note reverses an original invoice for the linked booking.</div>
    <div v-else-if="invoice?.cancellationId && invoice.status === 'CANCELLED'" class="no-print mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">This original invoice was cancelled and reversed through the booking cancellation workflow.</div>
    <div v-else-if="invoice?.cancellationId" class="no-print mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">This is a separate cancellation charge invoice raised to the client for the linked booking.</div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-3 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Loading invoice...
    </div>

    <div v-else-if="error" class="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
      <p class="font-semibold text-red-700">{{ error }}</p>
      <button type="button" @click="load" class="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors">Try Again</button>
    </div>

    <div v-if="invoice" class="invoice-layout grid items-start gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(260px,1fr)]">
    <section ref="invoiceRef" class="invoice-paper bg-white border border-gray-200 shadow-sm mx-auto text-gray-900">
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
            <h3 class="font-bold text-gray-900">{{ displayClient?.companyName || displayClient?.name }}</h3>
            <p v-if="displayClient?.name && displayClient?.companyName" class="text-sm text-gray-700">{{ displayClient.name }}</p>
            <div class="mt-2 text-xs leading-5 text-gray-600">
              <div v-for="line in clientAddress" :key="line">{{ line }}</div>
              <div v-if="displayClient?.phone">Phone: {{ displayClient.phone }}</div>
              <div v-if="displayClient?.email">Email: {{ displayClient.email }}</div>
              <div v-if="displayClient?.panNumber">PAN: {{ displayClient.panNumber }}</div>
              <div v-if="invoice.documentType !== 'PROFORMA'" class="font-semibold text-gray-800">GSTIN/UIN: {{ displayClient?.gstNumber || 'Unregistered' }}</div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div class="text-gray-500">Document No.</div>
            <div class="font-semibold text-right">{{ invoice.invoiceNumber }}</div>
            <div class="text-gray-500">Document Date</div>
            <div class="font-semibold text-right">{{ dateOnly(invoice.invoiceDate) }}</div>
            <div v-if="invoice.originalInvoice" class="text-gray-500">Reverses</div>
            <div v-if="invoice.originalInvoice" class="font-semibold text-right">{{ invoice.originalInvoice.invoiceNumber }}</div>
            <div class="text-gray-500">Due Date</div>
            <div class="font-semibold text-right">{{ dateOnly(invoice.dueDate) }}</div>
            <div class="text-gray-500">Booking ID</div>
            <div class="font-semibold text-right">{{ invoice.booking?.bookingNumber || '-' }}</div>
            <div v-if="invoice.documentType !== 'PROFORMA'" class="text-gray-500">Place of Supply</div>
            <div v-if="invoice.documentType !== 'PROFORMA'" class="font-semibold text-right">{{ placeOfSupply || '-' }}</div>
            <div v-if="invoice.documentType !== 'PROFORMA'" class="text-gray-500">Reverse Charge</div>
            <div v-if="invoice.documentType !== 'PROFORMA'" class="font-semibold text-right">No</div>
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
                <th v-for="column in activeColumns" :key="column.id || column.source" :class="alignmentClass(column.align)">{{ column.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in invoiceItems" :key="item.id">
                <td v-for="column in activeColumns" :key="column.id || column.source" :class="[alignmentClass(column.align), column.source === 'description' ? 'font-medium text-gray-800' : '', column.source === 'total' ? 'font-semibold' : '']">{{ itemColumnValue(item, column.source) }}</td>
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
              <div v-if="invoice.documentType !== 'PROFORMA' && !isGstInvoice" class="flex justify-between"><span class="text-gray-500">GST</span><span class="font-semibold">Not charged</span></div>
              <div v-if="Number(invoice.roundOff || 0)" class="flex justify-between"><span class="text-gray-500">Round Off</span><span class="font-semibold">{{ money(invoice.roundOff) }}</span></div>
              <div class="flex justify-between border-t border-gray-300 pt-2 text-base"><span class="font-bold">Grand Total</span><span class="font-bold">{{ money(invoice.grandTotal) }}</span></div>
              <div v-if="invoice.documentType !== 'PROFORMA'" class="flex justify-between text-sm"><span class="text-gray-500">Paid</span><span class="font-semibold text-green-700">{{ money(invoice.paidAmount) }}</span></div>
              <div v-if="invoice.documentType !== 'PROFORMA'" class="flex justify-between text-sm"><span class="text-gray-500">Outstanding</span><span class="font-semibold text-orange-700">{{ money(invoice.outstandingAmount) }}</span></div>
            </div>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-8 border-t border-gray-200 pt-4">
          <div class="text-xs leading-5 text-gray-600">
            <p v-if="invoice.notes" class="mb-3"><span class="font-semibold text-gray-800">Notes:</span> {{ invoice.notes }}</p>
            <div v-if="effectiveSettings.invoiceTerms || invoice.terms" class="invoice-rich-text"><span class="font-semibold text-gray-800">Terms:</span><div v-if="effectiveSettings.invoiceTerms" class="mt-1" v-html="effectiveSettings.invoiceTerms"></div><p v-else class="mt-1 whitespace-pre-line">{{ invoice.terms }}</p></div>
            <p v-if="invoice.documentType !== 'PROFORMA' && isBillOfSupply" class="mt-3 font-semibold text-gray-800">GST is not charged on this bill of supply.</p>
          </div>
          <div class="text-right">
            <div class="h-16 flex items-end justify-end">
              <img v-if="effectiveSettings.authorizedSignatureUrl || invoice.company?.signatureUrl" :src="assetUrl(effectiveSettings.authorizedSignatureUrl || invoice.company.signatureUrl)" alt="Authorized signature" class="max-h-14 max-w-[180px] object-contain" />
            </div>
            <div class="mt-3 border-t border-gray-400 pt-2 text-sm font-semibold">Authorized Signatory</div>
            <div class="text-xs text-gray-500">{{ invoice.company?.name }}</div>
          </div>
        </div>
        <p v-if="effectiveSettings.invoiceFooter" class="mt-5 border-t border-gray-100 pt-3 text-center text-[10px] text-gray-400">{{ effectiveSettings.invoiceFooter }}</p>
      </div>
    </section>
    <aside class="no-print space-y-3 xl:sticky xl:top-4">
      <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between"><h2 class="text-sm font-semibold text-gray-900">Document summary</h2><span :class="statusBadge(invoice.status)" class="rounded-full px-2 py-0.5 text-[11px] font-semibold">{{ invoice.status }}</span></div>
        <dl class="space-y-2.5 text-xs">
          <div class="flex justify-between gap-3"><dt class="text-gray-500">Type</dt><dd class="font-semibold text-gray-800">{{ documentTypeLabel }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-gray-500">Document no.</dt><dd class="text-right font-semibold text-gray-800">{{ invoice.invoiceNumber }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-gray-500">Date</dt><dd class="font-semibold text-gray-800">{{ dateOnly(invoice.invoiceDate) }}</dd></div>
          <div class="flex justify-between gap-3"><dt class="text-gray-500">Due</dt><dd class="font-semibold text-gray-800">{{ dateOnly(invoice.dueDate) }}</dd></div>
          <div v-if="invoice.booking" class="flex justify-between gap-3"><dt class="text-gray-500">Booking</dt><dd><NuxtLink :to="`/bookings/${invoice.booking.id}`" class="font-semibold text-blue-600">{{ invoice.booking.bookingNumber }}</NuxtLink></dd></div>
          <div v-if="invoice.convertedFromProforma" class="flex justify-between gap-3"><dt class="text-gray-500">Converted from</dt><dd><NuxtLink :to="`/invoices/${invoice.convertedFromProforma.id}`" class="font-semibold text-violet-600">{{ invoice.convertedFromProforma.invoiceNumber }}</NuxtLink></dd></div>
          <div v-if="invoice.convertedInvoice" class="flex justify-between gap-3"><dt class="text-gray-500">Converted invoice</dt><dd><NuxtLink :to="`/invoices/${invoice.convertedInvoice.id}`" class="font-semibold text-green-600">{{ invoice.convertedInvoice.invoiceNumber }}</NuxtLink></dd></div>
        </dl>
      </section>
      <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="text-sm font-semibold text-gray-900">Client</h2>
        <p class="mt-2 text-sm font-semibold text-gray-900">{{ displayClient?.companyName || displayClient?.name }}</p>
        <p v-if="displayClient?.companyName" class="text-xs text-gray-600">{{ displayClient?.name }}</p>
        <p v-if="displayClient?.email" class="mt-2 break-all text-xs text-gray-500">{{ displayClient.email }}</p>
        <p v-if="displayClient?.phone" class="text-xs text-gray-500">{{ displayClient.phone }}</p>
        <p v-if="clientAddress.length" class="mt-2 text-xs leading-5 text-gray-500">{{ clientAddress.join(', ') }}</p>
      </section>
      <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-500">Total</span><strong>{{ money(invoice.grandTotal) }}</strong></div><div v-if="invoice.documentType !== 'PROFORMA'" class="flex justify-between"><span class="text-gray-500">Paid</span><strong class="text-green-700">{{ money(invoice.paidAmount) }}</strong></div><div v-if="invoice.documentType !== 'PROFORMA'" class="flex justify-between border-t pt-2"><span class="text-gray-500">Outstanding</span><strong class="text-orange-700">{{ money(invoice.outstandingAmount) }}</strong></div></div>
      </section>
    </aside>
    </div>
    <AppModal v-model="showPayment" title="Record Payment" :subtitle="invoice?.invoiceNumber || ''" size="sm" color="green">
      <form id="invoice-detail-payment-form" class="space-y-4" @submit.prevent="recordPayment">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Outstanding: <strong>{{ money(invoice?.outstandingAmount) }}</strong></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Amount</label><input v-model.number="payment.amount" type="number" min="0.01" step="0.01" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Mode</label><input v-model="payment.paymentMode" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="Bank Transfer" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Reference #</label><input v-model="payment.referenceNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="UTR / cheque / transaction ID" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" @change="selectPaymentProof" /></div>
      </form>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showPayment = false">Cancel</button><button type="submit" form="invoice-detail-payment-form" class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Record Payment</button></template>
    </AppModal>

    <AppModal v-model="showReceipts" title="Payment Receipts" :subtitle="invoice?.invoiceNumber || ''" size="md" color="green">
      <div class="space-y-3"><div v-for="allocation in invoice?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4"><div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ money(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ dateOnly(allocation.clientPayment?.paymentDate) }} · {{ allocation.clientPayment?.paymentMode }}<span v-if="allocation.clientPayment?.referenceNumber"> · {{ allocation.clientPayment.referenceNumber }}</span></p></div><a v-if="allocation.clientPayment?.proofUrl" :href="allocation.clientPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View Proof</a></div></div></div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showReceipts = false">Close</button></template>
    </AppModal>

    <AppModal v-model="showDelete" title="Permanently Delete Invoice" :subtitle="invoice?.invoiceNumber || 'Checking linked records…'" size="md" color="red">
      <div v-if="deletePreview" class="space-y-4"><div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This permanently deletes the invoice.</p><p class="mt-1 text-xs leading-5 text-red-700">{{ deletePreview.warning }}</p></div><div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="item in deleteImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div><p class="text-xs leading-5 text-gray-500">Shared payments and system-generated cancellation reversal documents are protected and cannot be removed through individual document deletion.</p></div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked accounting records…</div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showDelete = false">Keep Invoice</button><button type="button" :disabled="deleting || !deletePreview" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="deleteInvoice">{{ deleting ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>
  </div>
</template>

<script setup>
const route = useRoute()
const config = useRuntimeConfig()
const { request } = useApi()
const toast = useToast()
const { formatDate } = useDateTime()

const invoice = ref(null)
const displayClient = computed(() => invoice.value?.clientSnapshot || invoice.value?.client || null)
const loading = ref(true)
const error = ref('')
const exporting = ref(false)
const refreshingFormat = ref(false)
const showPayment = ref(false)
const showReceipts = ref(false)
const paymentProof = ref(null)
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer', referenceNumber: '' })
const showDelete = ref(false)
const deletePreview = ref(null)
const deleting = ref(false)
const invoiceRef = ref(null)
const logoDataUrl = ref('')
const logoFailed = ref(false)
const defaultInvoiceColumns = [
  { id: 'index', source: 'index', label: '#', align: 'center', visible: true },
  { id: 'hsnSac', source: 'hsnSac', label: 'HSN/SAC', align: 'left', visible: true },
  { id: 'description', source: 'description', label: 'Description', align: 'left', visible: true },
  { id: 'quantity', source: 'quantity', label: 'Qty', align: 'right', visible: true },
  { id: 'rate', source: 'rate', label: 'Rate', align: 'right', visible: true },
  { id: 'taxableValue', source: 'taxableValue', label: 'Taxable', align: 'right', visible: true },
  { id: 'tax', source: 'tax', label: 'Tax', align: 'right', visible: true },
  { id: 'total', source: 'total', label: 'Total', align: 'right', visible: true },
]
const defaultProformaColumns = [
  { id: 'index', source: 'index', label: '#', align: 'center', visible: true },
  { id: 'description', source: 'description', label: 'Description', align: 'left', visible: true },
  { id: 'quantity', source: 'quantity', label: 'Qty', align: 'right', visible: true },
  { id: 'rate', source: 'rate', label: 'Rate', align: 'right', visible: true },
  { id: 'total', source: 'total', label: 'Amount', align: 'right', visible: true },
]
const documentSettings = reactive({ invoiceTitle: 'Tax Invoice', proformaTitle: 'Proforma Invoice', invoiceTerms: '', invoiceFooter: '', authorizedSignatureUrl: '', invoiceItemColumns: defaultInvoiceColumns, proformaItemColumns: defaultProformaColumns })
const effectiveSettings = computed(() => ({ ...documentSettings, ...(invoice.value?.formatSettings && typeof invoice.value.formatSettings === 'object' ? invoice.value.formatSettings : {}) }))

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
const statusBadge = (status) => ({ DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-700', PARTIALLY_PAID: 'bg-amber-100 text-amber-700', PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-red-100 text-red-700', CONVERTED: 'bg-violet-100 text-violet-700' }[status] || 'bg-gray-100 text-gray-700')

const companyAddress = computed(() => addressLines(invoice.value?.company, ['addressLine1', 'addressLine2', 'city', 'state', 'country', 'pincode']))
const clientAddress = computed(() => {
  const client = displayClient.value
  if (!client) return []
  return [client.billingAddress, client.city, client.state, client.country, client.pincode].filter(Boolean)
})
const placeOfSupply = computed(() => invoice.value?.placeOfSupply || displayClient.value?.state || '')
const isGstInvoice = computed(() => Boolean(invoice.value?.company?.gstNumber) && Number(invoice.value?.taxAmount || 0) > 0)
const isBillOfSupply = computed(() => Boolean(invoice.value?.company?.gstNumber) && Number(invoice.value?.taxAmount || 0) <= 0)
const documentTypeLabel = computed(() => {
  const item = invoice.value
  if (!item) return 'Invoice'
  if (item.documentType === 'PROFORMA') return 'Proforma'
  if (item.documentType === 'CREDIT_NOTE') return item.cancellationId ? 'Cancellation Credit Note' : 'Credit Note'
  if (item.cancellationId) return item.status === 'CANCELLED' ? 'Cancelled Original Invoice' : 'Cancellation Charge Invoice'
  return 'Invoice'
})
const canDeleteInvoice = computed(() => !(invoice.value?.cancellationId && (invoice.value?.documentType === 'CREDIT_NOTE' || invoice.value?.status === 'CANCELLED')))
const deleteImpactItems = computed(() => {
  const counts = deletePreview.value?.counts || {}
  return [
    { label: 'Items', value: counts.invoiceItems || 0 },
    { label: 'Receipts', value: counts.payments || 0 },
    { label: 'Journal entries', value: counts.journalEntries || 0 },
    { label: 'Stored files', value: counts.storedFiles || 0 },
  ]
})
const documentTitle = computed(() => {
  if (invoice.value?.documentType === 'PROFORMA') return effectiveSettings.value.proformaTitle || 'PROFORMA INVOICE'
  if (invoice.value?.documentType === 'CREDIT_NOTE') return 'CREDIT NOTE'
  return effectiveSettings.value.invoiceTitle || (isGstInvoice.value ? 'TAX INVOICE' : 'INVOICE')
})
const hasSupplyState = computed(() => Boolean(normalize(invoice.value?.company?.state) && normalize(placeOfSupply.value)))
const isIntraState = computed(() => hasSupplyState.value && normalize(invoice.value?.company?.state) === normalize(placeOfSupply.value))
const taxModeLabel = computed(() => isIntraState.value ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)')
const bankAccount = computed(() => invoice.value?.company?.bankAccounts?.[0] || null)
const companyInitials = computed(() => String(invoice.value?.company?.name || 'DH').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase())
const activeColumns = computed(() => {
  const proforma = invoice.value?.documentType === 'PROFORMA'
  const configured = proforma ? effectiveSettings.value.proformaItemColumns : effectiveSettings.value.invoiceItemColumns
  const fallback = proforma ? defaultProformaColumns : defaultInvoiceColumns
  return (Array.isArray(configured) && configured.length ? configured : fallback).filter((column) => column.visible !== false && (!proforma || !['hsnSac', 'taxableValue', 'tax'].includes(column.source)))
})

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
  if (invoice.value.documentType === 'PROFORMA') return []
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
    const [loadedInvoice, settings] = await Promise.all([request(`/invoices/${route.params.id}`), request('/settings')])
    invoice.value = loadedInvoice
    Object.assign(documentSettings, settings)
    prepareLogo()
  } catch (err) {
    invoice.value = null
    error.value = err?.data?.message || err?.message || 'Unable to load this invoice.'
  } finally {
    loading.value = false
  }
}

function alignmentClass(align) {
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
}

function itemColumnValue(item, source) {
  if (source === 'index') return item.index
  if (source === 'description') return item.description
  if (source === 'hsnSac') return item.hsnSac || '-'
  if (source === 'quantity') return formatQty(item.quantity)
  if (source === 'rate') return money(item.rate)
  if (source === 'taxableValue') return money(item.taxableValue)
  if (source === 'tax') return money(item.tax)
  if (source === 'total') return money(item.total)
  return item[source] ?? '-'
}

function openPayment() { paymentProof.value = null; Object.assign(payment, { amount: Number(invoice.value?.outstandingAmount || 0), paymentMode: 'Bank Transfer', referenceNumber: '' }); showPayment.value = true }
function selectPaymentProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; paymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  paymentProof.value = file
}
async function recordPayment() {
  if (!invoice.value) return
  const payload = { ...payment }
  if (paymentProof.value) { const formData = new FormData(); formData.append('file', paymentProof.value); const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData }); payload.proofUrl = uploaded.url; payload.proofOriginalName = uploaded.originalName }
  await request(`/invoices/${invoice.value.id}/payments`, { method: 'POST', body: payload })
  showPayment.value = false
  await load()
  toast.success('Payment recorded.')
}
async function openDeleteInvoice() {
  deletePreview.value = null
  showDelete.value = true
  try { deletePreview.value = await request(`/invoices/${invoice.value.id}/deletion-preview`) }
  catch (error) { showDelete.value = false; toast.error(error?.data?.message || error?.message || 'Unable to inspect linked invoice records.') }
}
async function deleteInvoice() {
  if (!invoice.value || !deletePreview.value) return
  deleting.value = true
  try { await request(`/invoices/${invoice.value.id}`, { method: 'DELETE' }); showDelete.value = false; toast.success('Invoice permanently deleted.'); await navigateTo('/invoices') }
  finally { deleting.value = false }
}

async function convertProforma() {
  if (!window.confirm(`Convert ${invoice.value.invoiceNumber} into a posted invoice? The source proforma will remain available.`)) return
  const converted = await request(`/invoices/${invoice.value.id}/convert`, { method: 'POST', body: {} })
  toast.success(`Invoice ${converted.invoiceNumber} created.`)
  await navigateTo(`/invoices/${converted.id}`)
}

async function refreshFormat() {
  refreshingFormat.value = true
  try {
    invoice.value = await request(`/invoices/${invoice.value.id}/refresh-format`, { method: 'POST' })
    toast.success('Invoice format refreshed from the latest invoice settings. Financial and booking data were unchanged.')
  } finally { refreshingFormat.value = false }
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

.invoice-table th.text-center,
.invoice-table td.text-center {
  text-align: center;
}
.invoice-rich-text :deep(ul) { list-style: disc; margin-left: 1.25rem; }
.invoice-rich-text :deep(ol) { list-style: decimal; margin-left: 1.25rem; }
.invoice-rich-text :deep(a) { color: #2563eb; text-decoration: underline; }
.invoice-rich-text :deep(p + p) { margin-top: .35rem; }

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

  .invoice-layout {
    display: block;
  }
}
</style>
