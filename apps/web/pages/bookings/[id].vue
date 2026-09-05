<template>
  <div>
    <!-- Breadcrumb + actions -->
    <div class="mb-4 flex flex-wrap items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <div class="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <NuxtLink to="/bookings" class="hover:text-blue-600 transition-colors">My Bookings</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
          <span class="text-gray-700 font-medium">{{ booking?.bookingNumber || 'Loading…' }}</span>
        </div>
        <h1 class="text-lg font-semibold text-gray-900">{{ booking?.title || '…' }}</h1>
        <div v-if="booking" class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500"><span>{{ clientDetails?.name }}</span><span>{{ booking.company?.name }}</span><span>Booked {{ dateOnly(booking.bookingDate) }}</span><span>{{ booking.passengerCount }} passenger(s)</span></div>
      </div>
      <div v-if="booking" class="flex flex-wrap items-center gap-2">
        <span :class="statusClass(booking.status)" class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">{{ booking.status }}</span>
        <button v-if="booking.status !== 'CANCELLED' && !booking.nextVersion" type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100" @click="editBooking"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m15.2 5.2 3.6 3.6M4 20l4.5-1 10.3-10.2a2.55 2.55 0 0 0-3.6-3.6L5 15.5 4 20Z"/></svg>Edit Booking</button>
        <div ref="actionsMenuRef" class="relative">
          <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50" @click.stop="actionsOpen = !actionsOpen">
            Actions
            <svg class="h-3.5 w-3.5 transition-transform" :class="actionsOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>
          </button>
          <div v-if="actionsOpen" class="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl" @click.stop>
            <button v-if="!booking.nextVersion" type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-violet-700 hover:bg-violet-50" @click="runAction(createNewVersion)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>{{ booking.status === 'CANCELLED' ? 'Create Replacement' : 'Create' }} v{{ Number(booking.bookingVersion || 1) + 1 }}</button>
            <button v-if="booking.nextVersion" type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-violet-700 hover:bg-violet-50" @click="runAction(openNextVersion)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m9 18 6-6-6-6"/></svg>Open {{ booking.nextVersion.bookingNumber }}</button>
            <div class="my-1 border-t border-gray-100"></div>
            <button v-if="booking.status !== 'CANCELLED' && !booking.nextVersion && !hasInvoice" type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50" @click="runAction(createInvoice)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Generate Invoice</button>
            <button v-if="hasInvoice" type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50" @click="runAction(viewLatestInvoice)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z"/><circle cx="12" cy="12" r="3"/></svg>View Latest Invoice</button>
            <button v-if="hasInvoice && !booking.nextVersion && booking.status === 'PARTIALLY_INVOICED'" type="button" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50" @click="runAction(createInvoice)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Generate Remaining Invoice</button>
            <button v-if="booking.status !== 'CANCELLED' && (!booking.nextVersion || hasVendorBills)" type="button" :disabled="creatingPayables" class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50" @click="runAction(handleVendorPayables)"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M3 7h18v13H3zM3 11h18"/></svg>{{ creatingPayables ? 'Generating…' : hasVendorBills ? 'View Vendor Payables' : 'Generate Vendor Payables' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
      <svg class="w-10 h-10 mx-auto mb-3 text-gray-200 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Loading booking…
    </div>

    <div v-else-if="error" class="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center">
      <p class="font-semibold text-red-700">{{ error }}</p>
      <button type="button" @click="load" class="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors">Try Again</button>
    </div>

    <template v-if="booking">
      <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,3.1fr)_minmax(360px,1.25fr)]">
        <div class="min-w-0">

      <div v-if="booking.cancellation" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-xl"><p class="text-xs font-bold uppercase tracking-wide text-red-600">Cancellation recorded</p><p class="mt-1 font-semibold text-red-900">{{ booking.cancellation.reason }}</p><p class="mt-1 text-xs text-red-700">{{ dateOnly(booking.cancellation.cancelledAt) }} · Original invoices/payables were reversed; cancellation charges are separate accounting documents.</p></div>
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-right text-sm sm:grid-cols-5"><div><p class="text-xs text-red-600">Invoices reversed</p><p class="font-bold text-red-900">{{ fmt(booking.cancellation.reversedInvoiceTotal) }}</p></div><div><p class="text-xs text-red-600">Vendor bills reversed</p><p class="font-bold text-red-900">{{ fmt(booking.cancellation.reversedVendorBillTotal) }}</p></div><div><p class="text-xs text-red-600">Client cancellation fee</p><p class="font-bold text-red-900">{{ fmt(booking.cancellation.clientChargeTotal) }}</p></div><div><p class="text-xs text-red-600">Vendor cancellation cost</p><p class="font-bold text-red-900">{{ fmt(cancellationVendorChargeTotal) }}</p></div><div><p class="text-xs text-red-600">Cancellation margin</p><p class="font-bold" :class="cancellationMargin >= 0 ? 'text-green-700' : 'text-red-900'">{{ fmt(cancellationMargin) }}</p></div></div>
        </div>
        <div class="mt-4 grid gap-3 border-t border-red-200 pt-4 md:grid-cols-2">
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-white/70 p-3"><div><p class="text-xs font-semibold text-gray-800">Client cancellation invoice</p><p class="mt-0.5 text-xs text-gray-500">{{ Number(booking.cancellation.clientChargeTotal || 0) <= 0 ? 'No client cancellation fee recorded' : cancellationChargeInvoice ? cancellationChargeInvoice.invoiceNumber : 'Charge recorded, invoice not posted' }}</p></div><div class="flex gap-2"><button v-if="cancellationChargeInvoice" type="button" class="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" @click="router.push(`/invoices/${cancellationChargeInvoice.id}`)">View</button><button v-if="pendingClientCancellationInvoice" type="button" :disabled="postingCancellationCharges" class="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="postCancellationCharges('client')">Post Invoice</button></div></div>
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-white/70 p-3"><div><p class="text-xs font-semibold text-gray-800">Vendor cancellation payables</p><p class="mt-0.5 text-xs text-gray-500">{{ cancellationVendorChargeTotal <= 0 ? 'No vendor cancellation cost recorded' : cancellationVendorBills.length ? `${cancellationVendorBills.length} cancellation payable(s) posted` : 'Charges recorded, payables not posted' }}</p></div><div class="flex gap-2"><button v-if="cancellationVendorBills.length" type="button" class="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50" @click="router.push({ path: '/vendor-payables', query: { bookingId: booking.id } })">View</button><button v-if="pendingVendorCancellationBills" type="button" :disabled="postingCancellationCharges" class="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="postCancellationCharges('vendor')">Post Payables</button></div></div>
        </div>
      </div>

      <!-- Service items -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div class="flex items-center justify-between border-b border-teal-700 bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-4">
          <h2 class="font-semibold text-white">Service Items</h2>
          <span class="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">{{ booking.serviceItems?.length || 0 }} items</span>
        </div>
        <TableControls
          :controller="serviceItemsTable"
          :fill-viewport="false"
          v-model:search="serviceItemsTable.search.value"
          v-model:page="serviceItemsTable.page.value"
          v-model:page-size="serviceItemsTable.pageSize.value"
          :page-size-options="serviceItemsTable.pageSizeOptions"
          :total="serviceItemsTable.total.value"
          :filtered="serviceItemsTable.filtered.value"
          :start="serviceItemsTable.start.value"
          :end="serviceItemsTable.end.value"
          :rows="serviceItemsTable.rows.value"
          :available-columns="[{ key: 'serviceDate', label: 'Service date' }, { key: 'quantity', label: 'Quantity' }, { key: 'saleTax', label: 'Sale tax' }, { key: 'vendorTax', label: 'Vendor tax' }]"
          search-placeholder="Search service items..."
        />
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="item in serviceItemsTable.rows.value" :key="item.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-700">
                  <span class="text-xs text-gray-400">{{ item.category?.parent?.name ? item.category.parent.name + ' / ' : '' }}</span>
                  <span class="font-medium">{{ item.category?.name }}</span>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ item.description }}</td>
                <td class="px-4 py-3 text-gray-600">{{ item.vendor?.name || '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(item.saleTotal) }}</td>
                <td class="px-4 py-3 text-right text-gray-500 tabular-nums">{{ fmt(item.vendorTotal) }}</td>
                <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(item.margin) >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(item.margin) }}</td>
              </tr>
              <tr v-if="!serviceItemsTable.filtered.value">
                <td colspan="6" class="px-4 py-8 text-center text-gray-400">No service items.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Accounting documents stacked for full-width tables -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="border-b border-blue-700 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4">
            <h2 class="font-semibold text-white">Invoices</h2>
          </div>
          <TableControls
            :controller="bookingInvoicesTable"
            :fill-viewport="false"
            v-model:search="bookingInvoicesTable.search.value"
            v-model:page="bookingInvoicesTable.page.value"
            v-model:page-size="bookingInvoicesTable.pageSize.value"
            :page-size-options="bookingInvoicesTable.pageSizeOptions"
            :total="bookingInvoicesTable.total.value"
            :filtered="bookingInvoicesTable.filtered.value"
            :start="bookingInvoicesTable.start.value"
            :end="bookingInvoicesTable.end.value"
            :rows="bookingInvoicesTable.rows.value"
            :available-columns="[{ key: 'invoiceDate', label: 'Invoice date' }, { key: 'dueDate', label: 'Due date' }, { key: 'taxAmount', label: 'Tax amount' }, { key: 'createdAt', label: 'Created at' }]"
            search-placeholder="Search invoices..."
          />
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th></tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="i in bookingInvoicesTable.rows.value" :key="i.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-800"><NuxtLink :to="`/invoices/${i.id}`" class="hover:text-blue-600">{{ i.invoiceNumber }}</NuxtLink><div class="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{{ bookingInvoiceLabel(i) }}</div></td>
                  <td class="px-4 py-3"><span class="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{{ i.status }}</span></td>
                  <td class="px-4 py-3 text-right tabular-nums text-gray-700">{{ fmt(i.grandTotal) }}</td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold" :class="Number(i.outstandingAmount) > 0 ? 'text-orange-600' : 'text-green-600'">{{ fmt(i.outstandingAmount) }}</td>
                  <td class="px-4 py-3"><div class="flex justify-end gap-1.5">
                    <button v-if="i.paymentAllocations?.length" type="button" title="Payment receipts" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100" @click="openInvoiceReceipts(i)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg></button>
                    <button v-if="i.documentType === 'INVOICE' && Number(i.outstandingAmount) > 0 && i.status !== 'CANCELLED'" type="button" title="Add payment" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50" @click="openInvoicePayment(i)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg></button>
                    <button v-if="canDeleteInvoice(i)" type="button" title="Delete invoice permanently" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50" @click="openDocumentDelete('invoice', i)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg></button>
                    <span v-else title="Cancellation reversal documents are protected" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-300"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10v10H7V10Z"/></svg></span>
                  </div></td>
                </tr>
                <tr v-if="!bookingInvoicesTable.filtered.value"><td colspan="5" class="px-4 py-6 text-center text-gray-400 text-sm">No invoices generated yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="border-b border-violet-700 bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-4">
            <h2 class="font-semibold text-white">Vendor Bills</h2>
          </div>
          <TableControls
            :controller="bookingVendorBillsTable"
            :fill-viewport="false"
            v-model:search="bookingVendorBillsTable.search.value"
            v-model:page="bookingVendorBillsTable.page.value"
            v-model:page-size="bookingVendorBillsTable.pageSize.value"
            :page-size-options="bookingVendorBillsTable.pageSizeOptions"
            :total="bookingVendorBillsTable.total.value"
            :filtered="bookingVendorBillsTable.filtered.value"
            :start="bookingVendorBillsTable.start.value"
            :end="bookingVendorBillsTable.end.value"
            :rows="bookingVendorBillsTable.rows.value"
            :available-columns="[{ key: 'billDate', label: 'Bill date' }, { key: 'dueDate', label: 'Due date' }, { key: 'taxAmount', label: 'Tax amount' }, { key: 'createdAt', label: 'Created at' }]"
            search-placeholder="Search vendor bills..."
          />
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill #</th><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th><th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th><th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th></tr></thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="v in bookingVendorBillsTable.rows.value" :key="v.id" class="hover:bg-gray-50">
                  <td class="px-4 py-3 font-medium text-gray-800"><NuxtLink :to="`/vendor-payables/${v.id}`" class="hover:text-indigo-600">{{ v.billNumber }}</NuxtLink><div class="mt-0.5 text-[10px] uppercase tracking-wide text-gray-400">{{ bookingBillLabel(v) }}</div></td>
                  <td class="px-4 py-3"><span class="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{{ v.status }}</span></td>
                  <td class="px-4 py-3 text-gray-600">{{ v.vendor?.name }}</td>
                  <td class="px-4 py-3 text-right tabular-nums font-bold" :class="Number(v.outstandingAmount) > 0 ? 'text-orange-600' : 'text-green-600'">{{ fmt(v.outstandingAmount) }}</td>
                  <td class="px-4 py-3"><div class="flex justify-end gap-1.5">
                    <button v-if="v.paymentAllocations?.length" type="button" title="Payment receipts" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100" @click="openVendorReceipts(v)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg></button>
                    <button v-if="v.documentType === 'BILL' && Number(v.outstandingAmount) > 0 && v.status !== 'CANCELLED'" type="button" title="Add payment" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50" @click="openVendorPayment(v)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg></button>
                    <button v-if="canDeleteVendorBill(v)" type="button" title="Delete vendor payable permanently" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 hover:bg-red-50" @click="openDocumentDelete('vendor', v)"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg></button>
                    <span v-else title="Cancellation reversal documents are protected" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-300"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10v10H7V10Z"/></svg></span>
                  </div></td>
                </tr>
                <tr v-if="!bookingVendorBillsTable.filtered.value"><td colspan="5" class="px-4 py-6 text-center text-gray-400 text-sm">No vendor bills yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-violet-700 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4"><div><h2 class="font-semibold text-white">Booking Version Series</h2><p class="mt-0.5 text-xs text-violet-100">v1, v2, v3 are separate booking records. Accounting documents stay attached to the booking version that created them.</p></div><button v-if="!booking.nextVersion" type="button" class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50" @click="createNewVersion"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>{{ booking.status === 'CANCELLED' ? 'Create Replacement' : 'Create' }} v{{ Number(booking.bookingVersion || 1) + 1 }}</button></div>
        <div class="flex flex-wrap gap-2 border-b border-gray-100 p-4">
          <NuxtLink v-for="series in booking.seriesVersions" :key="series.id" :to="`/bookings/${series.id}`" class="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors" :class="series.id === booking.id ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'"><span>v{{ series.bookingVersion }}</span><span class="ml-1.5 text-[10px] font-medium opacity-70">{{ series.bookingNumber }}</span><span class="ml-2 rounded-full px-1.5 py-0.5 text-[9px]" :class="statusClass(series.status)">{{ series.status }}</span></NuxtLink>
        </div>
        <div class="border-b border-amber-700 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3"><h3 class="text-sm font-semibold text-white">Audit / Change History</h3><p class="mt-0.5 text-xs text-amber-50">These are immutable revisions inside {{ booking.bookingNumber }}, not separate booking versions.</p></div>
        <div class="divide-y divide-gray-100">
          <details v-for="version in booking.versions" :key="version.id" class="group px-5 py-3 text-sm"><summary class="flex cursor-pointer list-none items-start justify-between gap-4"><div><span class="font-semibold text-gray-900">Revision {{ version.version }}</span><span class="ml-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{{ version.changeType }}</span><p v-if="version.changeNote" class="mt-1 text-xs text-gray-600">{{ version.changeNote }}</p></div><div class="flex items-center gap-2"><time class="whitespace-nowrap text-xs text-gray-400">{{ dateOnly(version.createdAt) }}</time><svg class="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg></div></summary><div class="mt-3 grid gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-3"><div><span class="text-gray-400">Status</span><p class="font-semibold text-gray-800">{{ version.snapshot?.status || '-' }}</p></div><div><span class="text-gray-400">Destination</span><p class="font-semibold text-gray-800">{{ version.snapshot?.destination || '-' }}</p></div><div><span class="text-gray-400">Total sale</span><p class="font-semibold text-gray-800">{{ fmt(version.snapshot?.totalSaleAmount) }}</p></div></div></details>
        </div>
      </div>
        </div>

        <aside class="xl:sticky xl:top-5">
          <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div class="border-b border-indigo-700 bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3"><h2 class="text-sm font-semibold text-white">Booking Summary</h2><p class="mt-0.5 text-[10px] text-indigo-100">{{ booking.bookingNumber }} · Booking v{{ booking.bookingVersion || 1 }} · Audit revision {{ booking.currentVersion }}</p></div>
            <div class="space-y-2 p-3">
              <section v-for="sectionKey in summarySectionOrder" :key="sectionKey" draggable="true" class="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm" @dragstart="startSummaryDrag(sectionKey)" @dragover.prevent @drop="dropSummarySection(sectionKey)">
                <button type="button" class="flex w-full items-center justify-between gap-3 bg-gray-50 px-3 py-2.5 text-left" @click="toggleSummarySection(sectionKey)">
                  <span class="flex min-w-0 items-center gap-2">
                    <span class="cursor-grab text-gray-300" title="Drag to reorder" @click.stop><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01"/></svg></span>
                    <span class="truncate text-[11px] font-bold uppercase tracking-wide text-gray-600">{{ summarySectionLabel(sectionKey) }}</span>
                  </span>
                  <svg class="h-4 w-4 flex-none text-gray-400 transition-transform" :class="summaryCollapsed[sectionKey] ? '' : 'rotate-180'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m6 9 6 6 6-6"/></svg>
                </button>
                <div v-show="!summaryCollapsed[sectionKey]" class="px-3 py-3 text-[11px]">
                  <template v-if="sectionKey === 'booking'">
                    <dl class="space-y-2"><div class="flex items-center justify-between gap-3"><dt class="text-gray-500">Status</dt><dd><span class="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{{ booking.status }}</span></dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Booked</dt><dd class="text-right font-medium text-gray-800">{{ dateOnly(booking.bookingDate) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Destination</dt><dd class="text-right font-medium text-gray-800">{{ booking.destination || '—' }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Travel</dt><dd class="text-right font-medium text-gray-800">{{ dateOnly(booking.travelStartDate) }} – {{ dateOnly(booking.travelEndDate) }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Passengers</dt><dd class="font-medium text-gray-800">{{ booking.passengerCount }}</dd></div><div class="flex justify-between gap-3"><dt class="text-gray-500">Billing company</dt><dd class="text-right font-medium text-gray-800">{{ booking.company?.name || '—' }}</dd></div></dl>
                    <div v-if="booking.notes" class="mt-3 border-t border-gray-100 pt-2"><p class="font-semibold uppercase tracking-wide text-gray-400">Notes</p><p class="mt-1 whitespace-pre-line leading-4 text-gray-600">{{ booking.notes }}</p></div>
                  </template>
                  <template v-else-if="sectionKey === 'client'">
                    <p class="font-semibold text-gray-900">{{ clientDetails?.name }}</p><p v-if="clientDetails?.companyName" class="mt-0.5 text-gray-600">{{ clientDetails.companyName }}</p><p v-if="clientDetails?.phone" class="mt-1 text-gray-600">{{ clientDetails.phone }}</p><p v-if="clientDetails?.email" class="break-all text-gray-600">{{ clientDetails.email }}</p><p v-if="clientDetails?.gstNumber" class="mt-1 text-gray-500">GST: {{ clientDetails.gstNumber }}</p><p v-if="clientDetails?.billingAddress" class="mt-2 whitespace-pre-line leading-4 text-gray-500">{{ clientDetails.billingAddress }}<span v-if="clientDetails?.state">, {{ clientDetails.state }}</span></p>
                  </template>
                  <template v-else>
                    <dl class="space-y-2"><div class="flex justify-between"><dt class="text-gray-500">Sale</dt><dd class="font-semibold text-gray-900">{{ fmt(booking.totalSaleAmount) }}</dd></div><div class="flex justify-between"><dt class="text-gray-500">Vendor cost</dt><dd class="font-semibold text-gray-900">{{ fmt(booking.totalVendorCost) }}</dd></div><div class="flex justify-between border-t border-gray-100 pt-2"><dt class="font-medium text-gray-700">Gross margin</dt><dd class="font-bold" :class="Number(booking.grossMargin) >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(booking.grossMargin) }}</dd></div><div v-if="booking.status === 'CANCELLED'" class="mt-2 rounded-md bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-700">Original booking margin is reversed in reporting. Cancellation margin is accounted separately.</div></dl>
                  </template>
                </div>
              </section>
            </div>
          </div>
          <button v-if="booking.status !== 'CANCELLED' && !booking.nextVersion" type="button" class="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100" @click="openCancellation"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></svg>Cancel Booking</button>
          <button type="button" class="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" @click="openDeleteBooking"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg>Delete Permanently</button>
        </aside>
      </div>
    </template>

    <AppModal v-model="showDelete" title="Permanently Delete Booking" :subtitle="booking ? `${booking.bookingNumber} · ${booking.title || 'Untitled booking'}` : ''" size="md" color="red">
      <div v-if="deletePreview" class="space-y-4">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This is a complete pipeline deletion.</p><p class="mt-1 text-xs leading-5 text-red-700">It permanently removes this booking from records together with linked invoices/credit notes, vendor payables/credit notes, payments and allocations, journal entries, cancellation records, booking history and stored proofs/attachments. This cannot be undone.</p></div>
        <div v-if="deletePreview.deletesWholeSeries" class="rounded-xl border border-violet-200 bg-violet-50 p-4"><p class="text-sm font-semibold text-violet-900">The complete booking version series will be deleted.</p><p class="mt-1 text-xs text-violet-700">All related v1/v2/v3 records are removed together to avoid disconnected accounting history.</p><div class="mt-2 flex flex-wrap gap-1.5"><span v-for="item in deletePreview.series" :key="item.id" class="rounded-full border border-violet-200 bg-white px-2 py-1 text-[11px] font-semibold text-violet-700">{{ item.bookingNumber }}</span></div></div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3"><div v-for="item in deleteImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div>
        <p class="text-xs leading-5 text-gray-500">If a payment is shared with another booking, deletion is blocked until that payment is split. Unrelated accounting data will not be removed.</p>
      </div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked booking and accounting records…</div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showDelete = false">Keep Booking</button><button type="button" :disabled="deleting || !deletePreview" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="deleteBookingPermanently">{{ deleting ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>

    <AppModal v-model="showDocumentDelete" :title="deleteDocumentKind === 'invoice' ? 'Permanently Delete Invoice' : 'Permanently Delete Vendor Payable'" :subtitle="deleteDocumentTarget ? (deleteDocumentTarget.invoiceNumber || deleteDocumentTarget.billNumber) : 'Checking linked records…'" size="md" color="red">
      <div v-if="deleteDocumentPreview" class="space-y-4">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This permanently deletes the accounting document.</p><p class="mt-1 text-xs leading-5 text-red-700">{{ deleteDocumentPreview.warning }}</p></div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="item in documentDeleteImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div>
        <p class="text-xs leading-5 text-gray-500">System-generated cancellation reversal documents are intentionally protected. If a payment is shared with another document, deletion is blocked rather than damaging unrelated accounting records.</p>
      </div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked accounting records…</div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showDocumentDelete = false">Keep Document</button><button type="button" :disabled="deletingDocument || !deleteDocumentPreview" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" @click="confirmDocumentDelete">{{ deletingDocument ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>

    <AppModal v-model="showInvoicePayment" title="Record Client Payment" :subtitle="paymentInvoice?.invoiceNumber || ''" size="sm" color="green">
      <form id="booking-invoice-payment-form" class="space-y-4" @submit.prevent="recordInvoicePayment">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Outstanding: <strong>{{ fmt(paymentInvoice?.outstandingAmount) }}</strong></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Amount</label><input v-model.number="invoicePayment.amount" type="number" min="0.01" step="0.01" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Mode</label><input v-model="invoicePayment.paymentMode" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="Bank Transfer" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Reference #</label><input v-model="invoicePayment.referenceNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="UTR / cheque / transaction ID" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" @change="selectInvoicePaymentProof" /></div>
      </form>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showInvoicePayment = false">Cancel</button><button type="submit" form="booking-invoice-payment-form" class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Record Payment</button></template>
    </AppModal>

    <AppModal v-model="showVendorPayment" title="Record Vendor Payment" :subtitle="paymentVendorBill?.billNumber || ''" size="sm" color="green">
      <form id="booking-vendor-payment-form" class="space-y-4" @submit.prevent="recordVendorPayment">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Outstanding: <strong>{{ fmt(paymentVendorBill?.outstandingAmount) }}</strong></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Amount</label><input v-model.number="vendorPayment.amount" type="number" min="0.01" step="0.01" required class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Mode</label><input v-model="vendorPayment.paymentMode" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="Bank Transfer" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Reference #</label><input v-model="vendorPayment.referenceNumber" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="UTR / cheque / transaction ID" /></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" @change="selectVendorPaymentProof" /></div>
      </form>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showVendorPayment = false">Cancel</button><button type="submit" form="booking-vendor-payment-form" class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Record Payment</button></template>
    </AppModal>

    <AppModal v-model="showInvoiceReceipts" title="Client Payment Receipts" :subtitle="receiptInvoice?.invoiceNumber || ''" size="md" color="green">
      <div class="space-y-3"><div v-for="allocation in receiptInvoice?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4"><div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ dateOnly(allocation.clientPayment?.paymentDate) }} · {{ allocation.clientPayment?.paymentMode }}<span v-if="allocation.clientPayment?.referenceNumber"> · {{ allocation.clientPayment.referenceNumber }}</span></p></div><a v-if="allocation.clientPayment?.proofUrl" :href="allocation.clientPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View Proof</a></div></div></div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showInvoiceReceipts = false">Close</button></template>
    </AppModal>

    <AppModal v-model="showVendorReceipts" title="Vendor Payment Receipts" :subtitle="receiptVendorBill?.billNumber || ''" size="md" color="green">
      <div class="space-y-3"><div v-for="allocation in receiptVendorBill?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4"><div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ dateOnly(allocation.vendorPayment?.paymentDate) }} · {{ allocation.vendorPayment?.paymentMode }}<span v-if="allocation.vendorPayment?.referenceNumber"> · {{ allocation.vendorPayment.referenceNumber }}</span></p></div><a v-if="allocation.vendorPayment?.proofUrl" :href="allocation.vendorPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View Proof</a></div></div></div>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showVendorReceipts = false">Close</button></template>
    </AppModal>

    <AppModal v-model="showCancellation" title="Cancel Booking" subtitle="Reverse posted documents and record cancellation charges" size="lg" color="red">
      <form id="cancel-booking-form" class="space-y-5" @submit.prevent="cancelBooking">
        <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Invoices and vendor bills will be reversed with linked credit notes. Existing receipts or payments will remain as account credits until actually refunded or adjusted.</div>
        <div class="grid gap-3 md:grid-cols-2"><section class="rounded-lg border border-gray-200 p-3"><h3 class="text-sm font-semibold text-gray-900">Invoices to reverse</h3><div v-if="activeBookingInvoices.length" class="mt-2 space-y-1"><div v-for="invoice in activeBookingInvoices" :key="invoice.id" class="flex justify-between gap-3 text-xs"><span>{{ invoice.invoiceNumber }}</span><strong>{{ fmt(invoice.grandTotal) }}</strong></div></div><p v-else class="mt-2 text-xs text-gray-500">No posted invoices exist for this booking.</p></section><section class="rounded-lg border border-gray-200 p-3"><h3 class="text-sm font-semibold text-gray-900">Vendor payables to reverse</h3><div v-if="activeVendorBills.length" class="mt-2 space-y-1"><div v-for="bill in activeVendorBills" :key="bill.id" class="flex justify-between gap-3 text-xs"><span>{{ bill.billNumber }} · {{ bill.vendor?.name }}</span><strong>{{ fmt(bill.grandTotal) }}</strong></div></div><p v-else class="mt-2 text-xs text-gray-500">No vendor payables exist for this booking.</p></section></div>
        <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Cancellation Reason <span class="required-mark">*</span></label><textarea v-model="cancelForm.reason" rows="3" placeholder="Explain why this booking is being cancelled" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" required></textarea></div>
        <div><div class="mb-2 flex items-center justify-between gap-3"><h3 class="text-sm font-semibold text-gray-900">Charge to Client</h3><label class="flex items-center gap-2 text-xs font-semibold text-gray-600"><input v-model="cancelForm.generateClientChargeInvoice" type="checkbox" class="rounded border-gray-300 text-red-600 focus:ring-red-500" />Generate cancellation invoice now</label></div><div class="grid grid-cols-2 gap-4"><div><label class="mb-1.5 block text-xs font-medium text-gray-600">Fee before tax</label><input v-model.number="cancelForm.clientChargeSubtotal" type="number" min="0" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div><div><label class="mb-1.5 block text-xs font-medium text-gray-600">Tax</label><input v-model.number="cancelForm.clientChargeTax" type="number" min="0" step="0.01" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div></div><p class="mt-2 text-xs text-gray-500">If unchecked, the charge remains recorded on the cancellation and can be posted later from this booking.</p></div>
        <div><div class="mb-2 flex flex-wrap items-center justify-between gap-3"><h3 class="text-sm font-semibold text-gray-900">Vendor Cancellation Charges</h3><div class="flex items-center gap-4"><label class="flex items-center gap-2 text-xs font-semibold text-gray-600"><input v-model="cancelForm.generateVendorChargeBills" type="checkbox" class="rounded border-gray-300 text-red-600 focus:ring-red-500" />Generate payables now</label><button type="button" class="text-xs font-semibold text-blue-600" @click="addVendorCharge">+ Add vendor</button></div></div><div v-if="cancelForm.vendorCharges.length" class="space-y-3"><div v-for="(charge, index) in cancelForm.vendorCharges" :key="index" class="grid gap-3 rounded-lg bg-gray-50 p-3 md:grid-cols-2"><div><label class="mb-1 block text-xs font-medium text-gray-600">Vendor <span class="required-mark">*</span></label><SearchableSelect v-model="charge.vendorId" :options="bookingVendors" placeholder="Search vendors" /></div><div><label class="mb-1 block text-xs font-medium text-gray-600">Cancellation fee</label><input v-model.number="charge.subtotal" type="number" min="0" step="0.01" placeholder="Enter fee before tax" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div><div><label class="mb-1 block text-xs font-medium text-gray-600">Tax amount</label><input v-model.number="charge.taxAmount" type="number" min="0" step="0.01" placeholder="Enter tax amount" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div><div><label class="mb-1 block text-xs font-medium text-gray-600">Notes</label><div class="flex gap-2"><input v-model="charge.notes" placeholder="Optional charge notes" class="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /><button type="button" class="rounded-lg px-3 text-red-500 hover:bg-red-50" aria-label="Remove vendor charge" @click="cancelForm.vendorCharges.splice(index, 1)">×</button></div></div></div></div><p v-else class="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-xs text-gray-500">No vendor cancellation charges.</p><p class="mt-2 text-xs text-gray-500">If unchecked, vendor charges remain recorded and can be converted to payables later.</p></div>
        <div class="grid grid-cols-3 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm"><div><p class="text-xs text-gray-500">Client cancellation charge</p><p class="mt-1 font-bold text-gray-900">{{ fmt(cancelClientChargeTotal) }}</p></div><div><p class="text-xs text-gray-500">Vendor cancellation cost</p><p class="mt-1 font-bold text-gray-900">{{ fmt(cancelVendorChargeTotal) }}</p></div><div><p class="text-xs text-gray-500">Cancellation margin</p><p class="mt-1 font-bold" :class="cancelMargin >= 0 ? 'text-green-700' : 'text-red-600'">{{ fmt(cancelMargin) }}</p></div></div>
      </form>
      <template #footer><button type="button" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700" @click="showCancellation = false">Keep Booking</button><button type="submit" form="cancel-booking-form" :disabled="cancelling" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{{ cancelling ? 'Cancelling…' : 'Confirm Cancellation' }}</button></template>
    </AppModal>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()
const { request } = useApi()
const { formatDate } = useDateTime()
const toast = useToast()
const { formatMoney } = useMoney()
const booking = ref(null)
const clientDetails = computed(() => booking.value?.clientSnapshot || booking.value?.client || null)
const loading = ref(true)
const error = ref('')
const fmt = (v) => formatMoney(v || 0)
const dateOnly = formatDate
const serviceItems = computed(() => booking.value?.serviceItems || [])
const bookingInvoices = computed(() => booking.value?.invoices || [])
const bookingVendorBills = computed(() => booking.value?.vendorBills || [])
const activeBookingInvoices = computed(() => bookingInvoices.value.filter((invoice) => invoice.documentType === 'INVOICE' && invoice.status !== 'CANCELLED'))
const activeVendorBills = computed(() => bookingVendorBills.value.filter((bill) => bill.documentType === 'BILL' && bill.status !== 'CANCELLED'))
const hasInvoice = computed(() => activeBookingInvoices.value.length > 0)
const hasVendorBills = computed(() => activeVendorBills.value.length > 0)
const latestInvoice = computed(() => activeBookingInvoices.value[0] || null)
const actionsOpen = ref(false)
const actionsMenuRef = ref(null)
const summarySectionOrder = ref(['booking', 'client', 'financials'])
const summaryCollapsed = reactive({ booking: false, client: false, financials: false })
const draggedSummarySection = ref(null)
const SUMMARY_ORDER_KEY = 'dream-holidays:booking-summary-order:v1'
const showDocumentDelete = ref(false)
const deleteDocumentKind = ref('invoice')
const deleteDocumentTarget = ref(null)
const deleteDocumentPreview = ref(null)
const deletingDocument = ref(false)
const showInvoicePayment = ref(false)
const showVendorPayment = ref(false)
const paymentInvoice = ref(null)
const paymentVendorBill = ref(null)
const invoicePaymentProof = ref(null)
const vendorPaymentProof = ref(null)
const invoicePayment = reactive({ amount: '', paymentMode: 'Bank Transfer', referenceNumber: '' })
const vendorPayment = reactive({ amount: '', paymentMode: 'Bank Transfer', referenceNumber: '' })
const showInvoiceReceipts = ref(false)
const showVendorReceipts = ref(false)
const receiptInvoice = ref(null)
const receiptVendorBill = ref(null)
const creatingPayables = ref(false)
const showDelete = ref(false)
const deletePreview = ref(null)
const deleting = ref(false)
const showCancellation = ref(false)
const cancelling = ref(false)
const postingCancellationCharges = ref(false)
const cancelForm = reactive({ reason: '', clientChargeSubtotal: 0, clientChargeTax: 0, generateClientChargeInvoice: true, generateVendorChargeBills: true, vendorCharges: [] })
const bookingVendors = computed(() => {
  const values = (booking.value?.serviceItems || []).map((item) => item.vendor).filter(Boolean)
  return [...new Map(values.map((vendor) => [vendor.id, vendor])).values()]
})
const cancellationVendorChargeTotal = computed(() => (booking.value?.cancellation?.vendorCharges || []).reduce((sum, charge) => sum + Number(charge.total || 0), 0))
const cancellationMargin = computed(() => Number(booking.value?.cancellation?.clientChargeTotal || 0) - cancellationVendorChargeTotal.value)
const cancellationChargeInvoice = computed(() => (booking.value?.cancellation?.invoices || []).find((invoice) => invoice.documentType === 'INVOICE' && invoice.status !== 'CANCELLED') || null)
const cancellationVendorBills = computed(() => (booking.value?.cancellation?.vendorBills || []).filter((bill) => bill.documentType === 'BILL' && bill.status !== 'CANCELLED'))
const pendingClientCancellationInvoice = computed(() => Number(booking.value?.cancellation?.clientChargeTotal || 0) > 0 && !cancellationChargeInvoice.value)
const pendingVendorCancellationBills = computed(() => cancellationVendorChargeTotal.value > 0 && !cancellationVendorBills.value.length)
const cancelClientChargeTotal = computed(() => Number(cancelForm.clientChargeSubtotal || 0) + Number(cancelForm.clientChargeTax || 0))
const cancelVendorChargeTotal = computed(() => cancelForm.vendorCharges.reduce((sum, charge) => sum + Number(charge.subtotal || 0) + Number(charge.taxAmount || 0), 0))
const cancelMargin = computed(() => cancelClientChargeTotal.value - cancelVendorChargeTotal.value)
const documentDeleteImpactItems = computed(() => {
  const counts = deleteDocumentPreview.value?.counts || {}
  return deleteDocumentKind.value === 'invoice'
    ? [
        { label: 'Items', value: counts.invoiceItems || 0 },
        { label: 'Receipts', value: counts.payments || 0 },
        { label: 'Journal entries', value: counts.journalEntries || 0 },
        { label: 'Stored files', value: counts.storedFiles || 0 },
      ]
    : [
        { label: 'Items', value: counts.billItems || 0 },
        { label: 'Payments', value: counts.payments || 0 },
        { label: 'Journal entries', value: counts.journalEntries || 0 },
        { label: 'Stored files', value: counts.storedFiles || 0 },
      ]
})
const deleteImpactItems = computed(() => {
  const counts = deletePreview.value?.counts || {}
  return [
    { label: 'Bookings', value: counts.bookings || 0 },
    { label: 'Invoices', value: counts.invoices || 0 },
    { label: 'Vendor payables', value: counts.vendorBills || 0 },
    { label: 'Payments', value: Number(counts.clientPayments || 0) + Number(counts.vendorPayments || 0) },
    { label: 'Journal entries', value: counts.journalEntries || 0 },
    { label: 'Stored files', value: counts.storedFiles || 0 },
  ]
})
const serviceItemsTable = useTableControls(serviceItems, {
  searchFields: ['description', 'category.name', 'category.parent.name', 'vendor.name'],
})
const bookingInvoicesTable = useTableControls(bookingInvoices, {
  searchFields: ['invoiceNumber', 'status'],
})
const bookingVendorBillsTable = useTableControls(bookingVendorBills, {
  searchFields: ['billNumber', 'status', 'vendor.name'],
})

function summarySectionLabel(key) { return { booking: 'Booking Detail', client: 'Client Details', financials: 'Financials' }[key] || key }
function toggleSummarySection(key) { summaryCollapsed[key] = !summaryCollapsed[key] }
function startSummaryDrag(key) { draggedSummarySection.value = key }
function dropSummarySection(targetKey) {
  const sourceKey = draggedSummarySection.value
  draggedSummarySection.value = null
  if (!sourceKey || sourceKey === targetKey) return
  const next = [...summarySectionOrder.value]
  const sourceIndex = next.indexOf(sourceKey)
  const targetIndex = next.indexOf(targetKey)
  if (sourceIndex < 0 || targetIndex < 0) return
  next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, sourceKey)
  summarySectionOrder.value = next
  if (import.meta.client) localStorage.setItem(SUMMARY_ORDER_KEY, JSON.stringify(next))
}
function loadSummaryOrder() {
  if (!import.meta.client) return
  try {
    const saved = JSON.parse(localStorage.getItem(SUMMARY_ORDER_KEY) || '[]')
    const validKeys = ['booking', 'client', 'financials']
    if (Array.isArray(saved) && saved.length === validKeys.length && validKeys.every(key => saved.includes(key))) summarySectionOrder.value = saved
  } catch {}
}
function closeActionsOnOutsideClick(event) {
  if (actionsMenuRef.value && !actionsMenuRef.value.contains(event.target)) actionsOpen.value = false
}
function runAction(action) { actionsOpen.value = false; return action?.() }
function openNextVersion() { if (booking.value?.nextVersion?.id) router.push(`/bookings/${booking.value.nextVersion.id}`) }
function canDeleteInvoice(invoice) { return !(invoice?.cancellationId && (invoice.documentType === 'CREDIT_NOTE' || invoice.status === 'CANCELLED')) }
function canDeleteVendorBill(bill) { return !(bill?.cancellationId && (bill.documentType === 'CREDIT_NOTE' || bill.status === 'CANCELLED')) }
function openInvoicePayment(invoice) { paymentInvoice.value = invoice; invoicePaymentProof.value = null; Object.assign(invoicePayment, { amount: Number(invoice.outstandingAmount || 0), paymentMode: 'Bank Transfer', referenceNumber: '' }); showInvoicePayment.value = true }
function openVendorPayment(bill) { paymentVendorBill.value = bill; vendorPaymentProof.value = null; Object.assign(vendorPayment, { amount: Number(bill.outstandingAmount || 0), paymentMode: 'Bank Transfer', referenceNumber: '' }); showVendorPayment.value = true }
function openInvoiceReceipts(invoice) { receiptInvoice.value = invoice; showInvoiceReceipts.value = true }
function openVendorReceipts(bill) { receiptVendorBill.value = bill; showVendorReceipts.value = true }
function selectInvoicePaymentProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; invoicePaymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  invoicePaymentProof.value = file
}
function selectVendorPaymentProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; vendorPaymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  vendorPaymentProof.value = file
}
async function recordInvoicePayment() {
  if (!paymentInvoice.value) return
  const payload = { ...invoicePayment }
  if (invoicePaymentProof.value) {
    const formData = new FormData(); formData.append('file', invoicePaymentProof.value)
    const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData })
    payload.proofUrl = uploaded.url; payload.proofOriginalName = uploaded.originalName
  }
  await request(`/invoices/${paymentInvoice.value.id}/payments`, { method: 'POST', body: payload })
  showInvoicePayment.value = false; await load(); toast.success('Client payment recorded.')
}
async function recordVendorPayment() {
  if (!paymentVendorBill.value) return
  const payload = { ...vendorPayment }
  if (vendorPaymentProof.value) {
    const formData = new FormData(); formData.append('file', vendorPaymentProof.value)
    const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData })
    payload.proofUrl = uploaded.url; payload.proofOriginalName = uploaded.originalName
  }
  await request(`/vendor-payables/${paymentVendorBill.value.id}/payments`, { method: 'POST', body: payload })
  showVendorPayment.value = false; await load(); toast.success('Vendor payment recorded.')
}
async function openDocumentDelete(kind, document) {
  deleteDocumentKind.value = kind
  deleteDocumentTarget.value = document
  deleteDocumentPreview.value = null
  showDocumentDelete.value = true
  const base = kind === 'invoice' ? '/invoices' : '/vendor-payables'
  try { deleteDocumentPreview.value = await request(`${base}/${document.id}/deletion-preview`) }
  catch (error) { showDocumentDelete.value = false; toast.error(error?.data?.message || error?.message || 'Unable to inspect linked accounting records.') }
}
async function confirmDocumentDelete() {
  if (!deleteDocumentTarget.value || !deleteDocumentPreview.value) return
  deletingDocument.value = true
  const base = deleteDocumentKind.value === 'invoice' ? '/invoices' : '/vendor-payables'
  try {
    await request(`${base}/${deleteDocumentTarget.value.id}`, { method: 'DELETE' })
    showDocumentDelete.value = false
    await load()
    toast.success(deleteDocumentKind.value === 'invoice' ? 'Invoice permanently deleted.' : 'Vendor payable permanently deleted.')
  } finally { deletingDocument.value = false }
}

function bookingInvoiceLabel(invoice) {
  if (invoice.documentType === 'PROFORMA') return invoice.cancellationId ? 'CANCELLED PROFORMA' : 'PROFORMA'
  if (invoice.documentType === 'CREDIT_NOTE') return invoice.cancellationId ? 'CANCELLATION CREDIT NOTE' : 'CREDIT NOTE'
  if (invoice.cancellationId) return invoice.status === 'CANCELLED' ? 'CANCELLED ORIGINAL INVOICE' : 'CANCELLATION CHARGE INVOICE'
  return 'INVOICE'
}
function bookingBillLabel(bill) {
  if (bill.documentType === 'CREDIT_NOTE') return bill.cancellationId ? 'CANCELLATION VENDOR CREDIT NOTE' : 'VENDOR CREDIT NOTE'
  if (bill.cancellationId) return bill.status === 'CANCELLED' ? 'CANCELLED ORIGINAL VENDOR BILL' : 'CANCELLATION CHARGE PAYABLE'
  return 'VENDOR BILL'
}

function statusClass(s) {
  const map = { DRAFT: 'bg-gray-100 text-gray-700', CONFIRMED: 'bg-blue-100 text-blue-700', PARTIALLY_INVOICED: 'bg-indigo-100 text-indigo-700', INVOICED: 'bg-purple-100 text-purple-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
  return map[s] || 'bg-gray-100 text-gray-600'
}

async function load() {
  loading.value = true
  error.value = ''
  booking.value = null
  try {
    booking.value = await request(`/bookings/${route.params.id}`)
  } catch (err) {
    error.value = err?.data?.message || err?.message || 'Unable to load this booking.'
  } finally {
    loading.value = false
  }
}
function createInvoice() { router.push({ path: '/invoices', query: { create: 'booking', bookingId: route.params.id } }) }
function editBooking() { router.push({ path: '/bookings', query: { edit: route.params.id } }) }
function createNewVersion() { router.push({ path: '/bookings', query: { version: route.params.id } }) }
async function openDeleteBooking() {
  deletePreview.value = null
  showDelete.value = true
  try {
    deletePreview.value = await request(`/bookings/${route.params.id}/deletion-preview`)
  } catch (error) {
    showDelete.value = false
    toast.error(error?.data?.message || error?.message || 'Unable to inspect linked booking records.')
  }
}
async function deleteBookingPermanently() {
  if (!deletePreview.value) return
  deleting.value = true
  try {
    const result = await request(`/bookings/${route.params.id}`, { method: 'DELETE' })
    showDelete.value = false
    toast.success(`${result.counts?.bookings || 1} booking record(s) and the linked accounting pipeline were permanently deleted.`)
    await router.push('/bookings')
  } finally {
    deleting.value = false
  }
}
function viewLatestInvoice() { if (latestInvoice.value?.id) router.push(`/invoices/${latestInvoice.value.id}`) }
function openCancellation() { Object.assign(cancelForm, { reason: '', clientChargeSubtotal: 0, clientChargeTax: 0, generateClientChargeInvoice: true, generateVendorChargeBills: true, vendorCharges: [] }); showCancellation.value = true }
function addVendorCharge() { cancelForm.vendorCharges.push({ vendorId: '', subtotal: 0, taxAmount: 0, notes: '' }) }
async function cancelBooking() {
  if (cancelForm.vendorCharges.some(charge => !charge.vendorId)) return toast.warning('Select a vendor for every cancellation charge.')
  const vendorIds = cancelForm.vendorCharges.filter(charge => Number(charge.subtotal || 0) + Number(charge.taxAmount || 0) > 0).map(charge => Number(charge.vendorId))
  if (new Set(vendorIds).size !== vendorIds.length) return toast.warning('Add each vendor only once. Combine multiple cancellation charges for the same vendor into one row.')
  cancelling.value = true
  try {
    await request(`/bookings/${route.params.id}/cancel`, { method: 'POST', body: JSON.parse(JSON.stringify(cancelForm)) })
    showCancellation.value = false
    await load()
    toast.success('Booking cancelled. Reversals and selected cancellation-charge documents were posted.')
  } finally {
    cancelling.value = false
  }
}
async function postCancellationCharges(type) {
  postingCancellationCharges.value = true
  try {
    await request(`/bookings/${route.params.id}/cancellation/post-charges`, {
      method: 'POST',
      body: { clientInvoice: type === 'client', vendorBills: type === 'vendor' },
    })
    await load()
    toast.success(type === 'client' ? 'Cancellation charge invoice posted.' : 'Vendor cancellation payables posted.')
  } finally {
    postingCancellationCharges.value = false
  }
}

async function createVendorBills() {
  creatingPayables.value = true
  try {
    const created = await request(`/vendor-payables/from-booking/${route.params.id}`, { method: 'POST' })
    await load()
    toast.success(`${created.length} vendor payable(s) generated.`)
  } finally {
    creatingPayables.value = false
  }
}
function handleVendorPayables() {
  if (hasVendorBills.value) router.push({ path: '/vendor-payables', query: { bookingId: route.params.id } })
  else createVendorBills()
}
onMounted(() => { loadSummaryOrder(); document.addEventListener('click', closeActionsOnOutsideClick); load() })
onBeforeUnmount(() => document.removeEventListener('click', closeActionsOnOutsideClick))
watch(() => route.params.id, () => { actionsOpen.value = false; load() })
</script>
