<template>
  <div>
    <PageHeader title="Invoices" subtitle="Client billing and payment tracking.">
      <template #actions>
        <button @click="openCreate" class="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          {{ invoiceTab === 'PROFORMA' ? 'Create Proforma Invoice' : 'Create Invoice' }}
        </button>
      </template>
    </PageHeader>

    <AppTabs v-model="invoiceTab" :tabs="[{ id: 'INVOICE', label: 'Invoices' }, { id: 'PROFORMA', label: 'Proforma Invoices' }]" class="mb-5" />

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <TableControls
        :controller="invoiceTable"
        v-model:search="invoiceTable.search.value"
        v-model:page="invoiceTable.page.value"
        v-model:page-size="invoiceTable.pageSize.value"
        :page-size-options="invoiceTable.pageSizeOptions"
        :total="invoiceTable.total.value"
        :filtered="invoiceTable.filtered.value"
        :start="invoiceTable.start.value"
        :end="invoiceTable.end.value"
        :rows="invoiceTable.rows.value"
        :available-columns="invoiceAdditionalColumns"
        exportable
        :selected-count="invoiceSelection.selectedCount.value"
        :filter-count="[invoiceFilters.status, invoiceFilters.clientId, invoiceFilters.companyId, invoiceFilters.from, invoiceFilters.to].filter(Boolean).length"
        :active-filters="invoiceActiveFilters"
        search-placeholder="Search invoices, clients, bookings..."
        @export="invoiceSelection.exportXls"
        @clear-selection="invoiceSelection.clear"
        @remove-filter="removeInvoiceFilter"
      >
        <template #filters>
          <div class="w-full sm:w-44">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
            <select v-model="invoiceFilters.status" :class="INP">
              <option value="">All</option>
              <option v-for="status in invoiceStatuses" :key="status" :value="status">{{ status }}</option>
            </select>
          </div>
          <div class="w-full sm:w-56">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Client</label>
            <SearchableSelect v-model="invoiceFilters.clientId" :options="clients" secondary-key="companyName" allow-all all-label="All clients" all-value="" />
          </div>
          <div class="w-full sm:w-56">
            <label class="block text-xs font-medium text-gray-600 mb-1.5">Company</label>
            <SearchableSelect v-model="invoiceFilters.companyId" :options="companies" allow-all all-label="All companies" all-value="" />
          </div>
          <DateRangeFilter
            v-model:preset="invoiceFilters.period"
            v-model:from="invoiceFilters.from"
            v-model:to="invoiceFilters.to"
          />
        </template>
      </TableControls>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="w-10 px-3 py-3"><input type="checkbox" aria-label="Select page" :checked="invoiceSelection.pageAllSelected.value" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="invoiceSelection.togglePage" /></th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice Date</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="i in invoiceTable.rows.value" :key="i.id" class="hover:bg-gray-50 transition-colors cursor-pointer" @click="router.push(`/invoices/${i.id}`)">
              <td class="w-10 px-3 py-3" @click.stop><input type="checkbox" :aria-label="`Select ${i.invoiceNumber}`" :checked="invoiceSelection.isSelected(i)" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" @change="invoiceSelection.toggle(i)" /></td>
              <td class="px-4 py-3">
                <NuxtLink :to="`/invoices/${i.id}`" class="font-semibold text-gray-900 hover:text-blue-600" @click.stop>{{ i.invoiceNumber }}</NuxtLink>
                <div class="mt-1 text-[10px] font-semibold uppercase tracking-wide" :class="documentClass(i)">{{ documentLabel(i) }}</div>
              </td>
              <td class="px-4 py-3"><span :class="statusBadge(i.status)" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">{{ i.status }}</span></td>
              <td class="px-4 py-3 text-gray-700">{{ (i.clientSnapshot || i.client)?.name }}</td>
              <td class="px-4 py-3 text-gray-500">{{ i.booking?.bookingNumber || '-' }}</td>
              <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ formatDate(i.invoiceDate) }}</td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(i.grandTotal) }}</td>
              <td class="px-4 py-3 text-right text-green-600 tabular-nums font-medium">{{ fmt(i.paidAmount) }}</td>
              <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(i.outstandingAmount) > 0 ? 'text-orange-600' : 'text-gray-400'">{{ fmt(i.outstandingAmount) }}</td>
              <td class="px-4 py-3">
                <button v-if="i.paymentAllocations?.length" type="button" @click.stop="openReceipts(i)"
                  class="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6"/></svg>Receipts
                </button>
                <button v-if="i.documentType === 'PROFORMA' && !i.convertedInvoice" type="button" @click.stop="convertProforma(i)" class="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m14 5 5 5-5 5M19 10H8a4 4 0 0 0-4 4v5"/></svg>Convert</button>
                <NuxtLink v-if="i.convertedInvoice" :to="`/invoices/${i.convertedInvoice.id}`" class="mr-2 inline-flex items-center gap-1.5 rounded-lg border border-green-200 px-2.5 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50" @click.stop><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/></svg>{{ i.convertedInvoice.invoiceNumber }}</NuxtLink>
                <button v-if="i.documentType === 'INVOICE' && Number(i.outstandingAmount) > 0" type="button" @click.stop="openPayment(i)"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Payment
                </button>
                <button v-if="canDeleteInvoice(i)" type="button" title="Delete permanently" aria-label="Delete invoice permanently" @click.stop="openDeleteInvoice(i)" class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 4v6m4-6v6M9 4h6l1 3H8l1-3Zm-2 3 1 13h8l1-13"/></svg></button>
                <span v-else title="Cancellation reversal documents are protected" class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-300"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M8 10V7a4 4 0 0 1 8 0v3m-9 0h10v10H7V10Z"/></svg></span>
              </td>
            </tr>
            <tr v-if="!invoiceTable.filtered.value"><td colspan="10" class="px-4 py-10 text-center text-gray-400">No {{ invoiceTab === 'PROFORMA' ? 'proforma invoices' : 'invoices' }} found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Invoice Modal -->
    <AppModal v-model="showCreate" :title="documentKind === 'PROFORMA' ? 'Create Proforma Invoice' : 'Create Invoice'" subtitle="Build from an existing booking or enter it manually" size="xl" header-tone="soft-blue" footer-tone="soft-blue">
      <div class="mb-4 flex rounded-lg bg-gray-100 p-1">
        <button type="button" class="flex-1 rounded-md px-3 py-2 text-sm font-semibold" :class="documentKind === 'INVOICE' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'" @click="documentKind = 'INVOICE'">Invoice</button>
        <button type="button" class="flex-1 rounded-md px-3 py-2 text-sm font-semibold" :class="documentKind === 'PROFORMA' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'" @click="documentKind = 'PROFORMA'">Proforma Invoice</button>
      </div>
      <div class="-mx-6 mb-5 border-b border-gray-200 px-6">
        <nav class="flex gap-6" aria-label="Invoice source">
          <button v-for="mode in invoiceModes" :key="mode.id" type="button" @click="setInvoiceMode(mode.id)" class="border-b-2 px-1 py-3 text-sm font-semibold transition-colors" :class="invoiceSource === mode.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'">
            {{ mode.label }}
          </button>
        </nav>
      </div>

      <form id="inv-form" @submit.prevent="saveInvoice" class="space-y-5">
        <section v-if="invoiceSource === 'booking'">
          <label class="mb-1.5 block text-sm font-semibold text-gray-800">Find a booking <span class="required-mark">*</span></label>
          <div class="relative">
            <svg class="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/></svg>
            <input v-model="bookingSearch" type="search" autocomplete="off" placeholder="Type booking number, client, trip or destination…" class="h-10 w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" @focus="bookingSearchOpen = true" @blur="closeBookingSearch" />
            <div v-if="bookingSearchOpen" class="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
              <button v-for="bookingOption in filteredBookingOptions" :key="bookingOption.id" type="button" @mousedown.prevent="selectBooking(bookingOption)" class="block w-full border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-gray-900"><span class="text-blue-700">{{ bookingOption.bookingNumber }}</span> · {{ bookingOption.title }}</div>
                    <div class="mt-1 truncate text-xs text-gray-600">{{ (bookingOption.clientSnapshot || bookingOption.client)?.name }} · {{ bookingOption.company?.name }}</div>
                    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                      <span>Booked {{ formatDate(bookingOption.bookingDate) }}</span>
                      <span v-if="bookingOption.destination">{{ bookingOption.destination }}</span>
                      <span v-if="bookingOption.travelStartDate">Travel {{ formatDate(bookingOption.travelStartDate) }} – {{ formatDate(bookingOption.travelEndDate) }}</span>
                    </div>
                  </div>
                  <div class="flex-shrink-0 text-right"><div class="text-xs font-semibold text-gray-800">{{ fmt(bookingOption.totalSaleAmount) }}</div><div class="mt-1 text-[10px] uppercase tracking-wide text-gray-400">ID {{ bookingOption.id }}</div></div>
                </div>
              </button>
              <div v-if="!filteredBookingOptions.length" class="px-4 py-6 text-center text-sm text-gray-400">No invoice-ready bookings match your search.</div>
            </div>
          </div>

          <div v-if="bookingPreviewLoading" class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">Loading booking details and invoiceable items…</div>
          <div v-else-if="selectedBooking" class="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><div class="text-xs font-semibold uppercase tracking-wide text-blue-600">Selected booking</div><div class="mt-1 font-semibold text-gray-900">{{ selectedBooking.bookingNumber }} · {{ selectedBooking.title }}</div><div class="mt-1 text-xs text-gray-600">{{ (selectedBooking.clientSnapshot || selectedBooking.client)?.name }} · {{ selectedBooking.destination || 'No destination' }} · {{ formatDate(selectedBooking.bookingDate) }}</div></div>
              <button type="button" @click="clearSelectedBooking" class="text-xs font-semibold text-blue-700 hover:text-blue-900">Change booking</button>
            </div>
            <p v-if="selectedBooking.unavailableItemCount" class="mt-3 text-xs text-amber-700">{{ selectedBooking.unavailableItemCount }} previously invoiced item(s) were excluded.</p>
          </div>
        </section>

        <section v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Client <span class="required-mark">*</span></label><SearchableSelect v-model="form.clientId" :options="clients" secondary-key="companyName" placeholder="Search clients" /></div>
          <div><label class="mb-1.5 block text-sm font-medium text-gray-700">Billing Company <span class="required-mark">*</span></label><SearchableSelect v-model="form.companyId" :options="companies" placeholder="Search billing companies" /></div>
        </section>

        <section class="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 md:grid-cols-3">
          <div><label class="mb-1.5 block text-xs font-semibold text-gray-600">Invoice Date <span class="required-mark">*</span></label><input v-model="form.invoiceDate" type="date" :class="INP + ' bg-white'" required /></div>
          <div><label class="mb-1.5 block text-xs font-semibold text-gray-600">Due Date</label><input v-model="form.dueDate" type="date" :class="INP + ' bg-white'" /></div>
          <div><label class="mb-1.5 block text-xs font-semibold text-gray-600">Place of Supply</label><StateSelect v-model="form.placeOfSupply" /></div>
        </section>

        <section class="border-t border-gray-200 pt-6">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div><h4 class="text-base font-semibold text-gray-900">{{ documentKind === 'PROFORMA' ? 'Proforma Items' : 'Invoice Items' }}</h4><p class="mt-0.5 text-xs text-gray-500">{{ form.items.length }} item(s) · {{ fmt(invoiceFormTotal) }} total</p></div>
            <button v-if="invoiceSource === 'manual'" type="button" @click="addInvoiceItem" class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>Add Item</button>
          </div>
          <div v-if="form.items.length" class="space-y-3">
            <article v-for="(item, i) in form.items" :key="item.bookingServiceItemId || item.localId" class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <header class="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2.5"><div class="flex items-center gap-2"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{{ i + 1 }}</span><span class="text-xs font-semibold text-gray-700">Invoice item {{ i + 1 }}</span><span v-if="item.serviceDate" class="text-[11px] text-gray-400">Service {{ formatDate(item.serviceDate) }}</span></div><button type="button" @click="removeInvoiceItem(i)" class="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Remove item"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></header>
              <div class="p-4">
                <div class="mb-3 grid grid-cols-1 gap-3" :class="documentKind === 'PROFORMA' ? '' : 'md:grid-cols-3'"><div :class="documentKind === 'PROFORMA' ? '' : 'md:col-span-2'"><label class="mb-1 block text-xs font-medium text-gray-600">Description <span class="required-mark">*</span></label><input v-model="item.description" :placeholder="documentKind === 'PROFORMA' ? 'Proforma item description' : 'Invoice item description'" :class="INP" required /></div><div v-if="documentKind !== 'PROFORMA'"><label class="mb-1 block text-xs font-medium text-gray-600">HSN/SAC <span class="required-mark">*</span></label><input v-model="item.hsnSac" placeholder="HSN/SAC code" :class="INP" required /></div></div>
                <div class="grid grid-cols-2 items-end gap-3" :class="documentKind === 'PROFORMA' ? 'md:grid-cols-3' : 'md:grid-cols-4'"><div><label class="mb-1 block text-xs font-medium text-gray-600">Qty</label><input v-model.number="item.quantity" type="number" min="0.01" step="0.01" :class="INP" /></div><div><label class="mb-1 block text-xs font-medium text-gray-600">Rate</label><input v-model.number="item.rate" type="number" min="0" step="0.01" :class="INP" /></div><div v-if="documentKind !== 'PROFORMA'"><label class="mb-1 block text-xs font-medium text-gray-600">Tax</label><input v-model.number="item.taxAmount" type="number" min="0" step="0.01" :class="INP" /></div><div><label class="mb-1 block text-xs font-medium text-gray-600">Line Total</label><div class="flex h-[42px] items-center justify-end rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-gray-900">{{ fmt(itemTotal(item)) }}</div></div></div>
              </div>
            </article>
          </div>
          <div v-else class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center"><p class="text-sm font-medium text-gray-600">No invoice items available</p><p class="mt-1 text-xs text-gray-400">Choose another booking or add an item manually.</p></div>
        </section>
      </form>
      <template #footer>
        <div class="mr-auto flex flex-wrap items-center gap-x-5 gap-y-2 pr-4" aria-live="polite">
          <div><div class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Items</div><div class="mt-0.5 text-sm font-bold text-gray-900">{{ form.items.length }}</div></div>
          <div><div class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Subtotal</div><div class="mt-0.5 text-sm font-bold text-gray-900">{{ fmt(invoiceFormSubtotal) }}</div></div>
          <div v-if="documentKind !== 'PROFORMA'"><div class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tax</div><div class="mt-0.5 text-sm font-bold text-gray-900">{{ fmt(invoiceFormTax) }}</div></div>
          <div class="border-l border-blue-200 pl-5"><div class="text-[10px] font-semibold uppercase tracking-wide text-blue-500">Invoice Total</div><div class="mt-0.5 text-base font-extrabold text-blue-700">{{ fmt(invoiceFormTotal) }}</div></div>
          <span v-if="invoiceSource === 'booking' && selectedBooking" class="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100">{{ selectedBooking.bookingNumber }}</span>
        </div>
        <button type="button" @click="showCreate = false" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button type="submit" form="inv-form" :disabled="savingInvoice || !form.items.length || (invoiceSource === 'booking' && !selectedBooking)" class="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{{ savingInvoice ? 'Creating…' : documentKind === 'PROFORMA' ? 'Create Proforma' : 'Create Invoice' }}</button>
      </template>
    </AppModal>

    <AppModal v-model="showDeleteInvoice" title="Permanently Delete Invoice" :subtitle="deleteInvoiceTarget?.invoiceNumber || 'Checking linked records…'" size="md" color="red">
      <div v-if="deleteInvoicePreview" class="space-y-4">
        <div class="rounded-xl border border-red-200 bg-red-50 p-4"><p class="text-sm font-bold text-red-900">This permanently removes this accounting document.</p><p class="mt-1 text-xs leading-5 text-red-700">{{ deleteInvoicePreview.warning }}</p></div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="item in deleteInvoiceImpactItems" :key="item.label" class="rounded-lg border border-gray-200 bg-gray-50 p-3"><p class="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{{ item.label }}</p><p class="mt-1 text-lg font-bold text-gray-900">{{ item.value }}</p></div></div>
        <p class="text-xs leading-5 text-gray-500">Exclusive receipts, allocations, ledger journals and stored payment proofs are deleted with the invoice. Shared payments and system cancellation reversals are protected.</p>
      </div>
      <div v-else class="py-8 text-center text-sm text-gray-500">Checking linked accounting records…</div>
      <template #footer><button type="button" @click="showDeleteInvoice = false" class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Keep Invoice</button><button type="button" :disabled="deletingInvoice || !deleteInvoicePreview" @click="confirmDeleteInvoice" class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{{ deletingInvoice ? 'Deleting…' : 'Delete Permanently' }}</button></template>
    </AppModal>

    <!-- Payment Modal -->
    <AppModal v-model="showPayment" title="Record Payment" subtitle="Apply payment to this invoice" size="sm" color="green">
      <form v-if="paymentInvoice" id="pay-form" @submit.prevent="pay" class="space-y-4">
        <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <div class="font-semibold text-amber-800">{{ paymentInvoice.invoiceNumber }}</div>
          <div class="text-amber-700 mt-0.5">Outstanding: <strong>{{ fmt(paymentInvoice.outstandingAmount) }}</strong></div>
        </div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Amount <span class="required-mark">*</span></label><input v-model.number="payment.amount" placeholder="Payment amount" type="number" min="1" :class="INP" required /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Mode</label><input v-model="payment.paymentMode" placeholder="e.g. Bank Transfer" :class="INP" /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Reference #</label><input v-model="payment.referenceNumber" :class="INP" placeholder="Cheque / UTR / Transaction ID" /></div>
        <div><label class="block text-sm font-medium text-gray-700 mb-1.5">Payment Proof <span class="text-xs font-normal text-gray-400">(optional, max 5 MB)</span></label><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" :class="INP" @change="selectPaymentProof" /></div>
      </form>
      <template #footer>
        <button type="button" @click="showPayment = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Cancel</button>
        <button type="submit" form="pay-form" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Record Payment</button>
      </template>
    </AppModal>

    <AppModal v-model="showReceipts" title="Payment Receipts" :subtitle="receiptInvoice?.invoiceNumber || ''" size="md" color="green">
      <div class="space-y-3">
        <div v-for="allocation in receiptInvoice?.paymentAllocations || []" :key="allocation.id" class="rounded-lg border border-gray-200 p-4">
          <div class="flex items-start justify-between gap-4"><div><p class="font-semibold text-gray-900">{{ fmt(allocation.amount) }}</p><p class="mt-1 text-xs text-gray-500">{{ formatDate(allocation.clientPayment?.paymentDate) }} · {{ allocation.clientPayment?.paymentMode }}<span v-if="allocation.clientPayment?.referenceNumber"> · {{ allocation.clientPayment.referenceNumber }}</span></p></div>
            <a v-if="allocation.clientPayment?.proofUrl" :href="allocation.clientPayment.proofUrl" target="_blank" rel="noopener" class="text-sm font-semibold text-blue-600 hover:text-blue-800">View / Download Proof</a>
          </div>
          <p v-if="allocation.clientPayment?.proofOriginalName" class="mt-2 text-xs text-gray-400">{{ allocation.clientPayment.proofOriginalName }}</p>
        </div>
      </div>
      <template #footer><button type="button" @click="showReceipts = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Close</button></template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const toast = useToast()
const { formatMoney } = useMoney()
const { formatDate, todayInput } = useDateTime()
const router = useRouter()
const route = useRoute()
const invoices = ref([]), clients = ref([]), companies = ref([]), bookings = ref([])
const settings = ref({ defaultDueDays: 7 })
const invoiceTab = ref('INVOICE')
const invoiceStatuses = ['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'CONVERTED']
const invoiceModes = [{ id: 'booking', label: 'From Booking' }, { id: 'manual', label: 'Manual Invoice' }]
const invoiceSource = ref('booking')
const documentKind = ref('INVOICE')
const invoiceFilters = reactive({ status: '', clientId: '', companyId: '', period: 'all', from: '', to: '' })
const { periodLabel } = useFilterLabels()
const showDeleteInvoice = ref(false)
const deleteInvoiceTarget = ref(null)
const deleteInvoicePreview = ref(null)
const deletingInvoice = ref(false)
const showCreate = ref(false)
const showPayment = ref(false)
const showReceipts = ref(false)
const paymentInvoice = ref(null)
const receiptInvoice = ref(null)
const paymentProof = ref(null)
const selectedBooking = ref(null)
const bookingSearch = ref('')
const bookingSearchOpen = ref(false)
const bookingPreviewLoading = ref(false)
const savingInvoice = ref(false)
const INP = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow'
const today = todayInput
const fmt = (v) => formatMoney(v || 0)
let localItemId = 0
const addDays = (date, days) => { const [year, month, day] = date.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day + Number(days || 0))).toISOString().slice(0, 10) }
const defaultDueDate = () => addDays(today(), settings.value.defaultDueDays || 7)
const blankItem = () => ({ localId: `item-${++localItemId}`, bookingServiceItemId: null, serviceDate: '', hsnSac: '9985', description: '', quantity: 1, rate: 0, taxAmount: 0 })
const blankForm = (mode = invoiceSource.value) => ({ clientId: '', companyId: '', bookingId: '', invoiceDate: today(), dueDate: defaultDueDate(), placeOfSupply: '', items: mode === 'manual' ? [blankItem()] : [] })
const form = reactive(blankForm())
const payment = reactive({ amount: '', paymentMode: 'Bank Transfer', referenceNumber: '' })
const filteredInvoices = computed(() => invoices.value.filter((invoice) => {
  if (invoiceTab.value === 'PROFORMA' ? invoice.documentType !== 'PROFORMA' : invoice.documentType === 'PROFORMA') return false
  if (invoiceFilters.status && invoice.status !== invoiceFilters.status) return false
  if (invoiceFilters.clientId && Number(invoice.clientId) !== Number(invoiceFilters.clientId)) return false
  if (invoiceFilters.companyId && Number(invoice.companyId) !== Number(invoiceFilters.companyId)) return false
  const date = String(invoice.invoiceDate || '').slice(0, 10)
  if (invoiceFilters.from && date < invoiceFilters.from) return false
  if (invoiceFilters.to && date > invoiceFilters.to) return false
  return true
}))
const invoiceActiveFilters = computed(() => {
  const chips = []
  if (invoiceFilters.status) chips.push({ key: 'status', label: `Status: ${invoiceFilters.status}` })
  if (invoiceFilters.clientId) chips.push({ key: 'client', label: `Client: ${clients.value.find(item => Number(item.id) === Number(invoiceFilters.clientId))?.name || invoiceFilters.clientId}` })
  if (invoiceFilters.companyId) chips.push({ key: 'company', label: `Company: ${companies.value.find(item => Number(item.id) === Number(invoiceFilters.companyId))?.name || invoiceFilters.companyId}` })
  const period = periodLabel(invoiceFilters); if (period) chips.push({ key: 'period', label: period })
  return chips
})
const deleteInvoiceImpactItems = computed(() => {
  const counts = deleteInvoicePreview.value?.counts || {}
  return [
    { label: 'Items', value: counts.invoiceItems || 0 },
    { label: 'Receipts', value: counts.payments || 0 },
    { label: 'Journal entries', value: counts.journalEntries || 0 },
    { label: 'Stored files', value: counts.storedFiles || 0 },
  ]
})
const invoiceTable = useTableControls(filteredInvoices, {
  searchFields: ['invoiceNumber', 'status', 'client.name', 'client.companyName', 'booking.bookingNumber', 'company.name'],
})
const invoiceSelection = useListingSelection(invoiceTable, [
  { label: 'Invoice', field: 'invoiceNumber' }, { label: 'Client', field: 'client.name' }, { label: 'Booking', field: 'booking.bookingNumber' },
  { label: 'Invoice Date', field: (row) => formatDate(row.invoiceDate) }, { label: 'Due Date', field: (row) => formatDate(row.dueDate) },
  { label: 'Status', field: 'status' }, { label: 'Total', field: (row) => fmt(row.grandTotal) },
  { label: 'Paid', field: (row) => fmt(row.paidAmount) }, { label: 'Outstanding', field: (row) => fmt(row.outstandingAmount) },
], 'invoices')
const invoiceAdditionalColumns = [
  { key: 'createdAt', label: 'Created at', format: (value) => formatDate(value) },
  { key: 'dueDate', label: 'Due date', format: (value) => formatDate(value) },
  { key: 'company.name', label: 'Billing company' },
  { key: 'placeOfSupply', label: 'Place of supply' },
  { key: 'documentType', label: 'Document type' },
  { key: 'booking.title', label: 'Booking title' },
  { key: 'taxAmount', label: 'Tax amount', format: (value) => fmt(value) },
]
const invoiceReadyBookings = computed(() => bookings.value.filter((booking) => !booking.nextVersion && !['INVOICED', 'PAID', 'CLOSED', 'CANCELLED'].includes(booking.status)))
const filteredBookingOptions = computed(() => {
  const query = bookingSearch.value.trim().toLowerCase()
  const options = query ? invoiceReadyBookings.value.filter((booking) => [booking.bookingNumber, booking.title, booking.destination, (booking.clientSnapshot || booking.client)?.name, booking.company?.name, booking.id].some((value) => String(value || '').toLowerCase().includes(query))) : invoiceReadyBookings.value
  return options.slice(0, 30)
})
const invoiceFormSubtotal = computed(() => form.items.reduce((total, item) => total + (Number(item.quantity || 1) * Number(item.rate || 0)), 0))
const invoiceFormTax = computed(() => documentKind.value === 'PROFORMA' ? 0 : form.items.reduce((total, item) => total + Number(item.taxAmount || 0), 0))
const invoiceFormTotal = computed(() => form.items.reduce((total, item) => total + itemTotal(item), 0))

function itemTotal(item) { return Number(item.quantity || 1) * Number(item.rate || 0) + (documentKind.value === 'PROFORMA' ? 0 : Number(item.taxAmount || 0)) }
function removeInvoiceFilter(key) { if (key === 'status') invoiceFilters.status = ''; if (key === 'client') invoiceFilters.clientId = ''; if (key === 'company') invoiceFilters.companyId = ''; if (key === 'period') Object.assign(invoiceFilters, { period: 'all', from: '', to: '' }) }
function resetCreateForm(mode = invoiceSource.value) {
  Object.assign(form, blankForm(mode))
  selectedBooking.value = null
  bookingSearch.value = ''
  bookingSearchOpen.value = false
}
function openCreate() { invoiceSource.value = 'booking'; documentKind.value = invoiceTab.value; resetCreateForm('booking'); showCreate.value = true }
function handleQuickCreate() {
  if (route.query.create === 'invoice') {
    invoiceTab.value = 'INVOICE'
    openCreate()
  } else if (route.query.create === 'proforma') {
    invoiceTab.value = 'PROFORMA'
    openCreate()
  }
}
function setInvoiceMode(mode) { invoiceSource.value = mode; resetCreateForm(mode) }
function closeBookingSearch() { window.setTimeout(() => { bookingSearchOpen.value = false }, 120) }
function clearSelectedBooking() { resetCreateForm('booking'); bookingSearchOpen.value = true }
async function selectBooking(booking) {
  bookingSearchOpen.value = false
  bookingSearch.value = `${booking.bookingNumber} · ${booking.title}`
  selectedBooking.value = null
  form.bookingId = ''
  form.items = []
  bookingPreviewLoading.value = true
  try {
    const preview = await request(`/invoices/from-booking/${booking.id}/preview`)
    selectedBooking.value = preview
    Object.assign(form, {
      clientId: preview.clientId,
      companyId: preview.companyId,
      bookingId: preview.id,
      invoiceDate: today(),
      dueDate: defaultDueDate(),
      placeOfSupply: (preview.clientSnapshot || preview.client)?.state || preview.company?.state || '',
      items: (preview.serviceItems || []).map((item) => ({
        localId: `booking-item-${item.id}`,
        bookingServiceItemId: item.id,
        serviceDate: item.serviceDate || '',
        hsnSac: '9985',
        description: item.description,
        quantity: Number(item.quantity || 1),
        rate: Number(item.saleRate || 0),
        taxAmount: Number(item.saleTax || 0),
      })),
    })
    if (!form.items.length) toast.warning('This booking has no uninvoiced service items. Choose another booking.')
    else toast.success(`${form.items.length} booking item(s) added to the invoice.`)
  } finally {
    bookingPreviewLoading.value = false
  }
}
function canDeleteInvoice(invoice) { return !(invoice?.cancellationId && (invoice.documentType === 'CREDIT_NOTE' || invoice.status === 'CANCELLED')) }
async function openDeleteInvoice(invoice) {
  deleteInvoiceTarget.value = invoice
  deleteInvoicePreview.value = null
  showDeleteInvoice.value = true
  try { deleteInvoicePreview.value = await request(`/invoices/${invoice.id}/deletion-preview`) }
  catch (error) { showDeleteInvoice.value = false; toast.error(error?.data?.message || error?.message || 'Unable to inspect linked invoice records.') }
}
async function confirmDeleteInvoice() {
  if (!deleteInvoiceTarget.value || !deleteInvoicePreview.value) return
  deletingInvoice.value = true
  try {
    await request(`/invoices/${deleteInvoiceTarget.value.id}`, { method: 'DELETE' })
    showDeleteInvoice.value = false
    invoiceSelection.clear()
    await load()
    toast.success('Invoice permanently deleted.')
  } finally { deletingInvoice.value = false }
}
function openPayment(inv) { paymentInvoice.value = inv; paymentProof.value = null; Object.assign(payment, { amount: Number(inv.outstandingAmount || 0), paymentMode: 'Bank Transfer', referenceNumber: '' }); showPayment.value = true }
function openReceipts(inv) { receiptInvoice.value = inv; showReceipts.value = true }
function selectPaymentProof(event) {
  const file = event.target.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; paymentProof.value = null; return toast.error('Payment proof must be 5 MB or smaller.') }
  paymentProof.value = file
}
function addInvoiceItem() { form.items.push(blankItem()); toast.success(`Invoice item ${form.items.length} added.`) }
function removeInvoiceItem(index) { form.items.splice(index, 1) }

function statusBadge(s) {
  return { DRAFT: 'bg-gray-100 text-gray-700', SENT: 'bg-indigo-100 text-indigo-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', OVERDUE: 'bg-red-100 text-red-700', CANCELLED: 'bg-red-100 text-red-700', CONVERTED: 'bg-violet-100 text-violet-700' }[s] || 'bg-gray-100 text-gray-600'
}
function documentLabel(invoice) {
  if (invoice.documentType === 'PROFORMA') return 'Proforma'
  if (invoice.documentType === 'CREDIT_NOTE') return invoice.cancellationId ? 'Cancellation Credit Note' : 'Credit Note'
  if (invoice.cancellationId) return invoice.status === 'CANCELLED' ? 'Cancelled Original Invoice' : 'Cancellation Charge Invoice'
  return 'Invoice'
}
function documentClass(invoice) {
  if (invoice.documentType === 'PROFORMA') return 'text-violet-600'
  if (invoice.documentType === 'CREDIT_NOTE') return 'text-emerald-600'
  if (invoice.cancellationId && invoice.status !== 'CANCELLED') return 'text-amber-600'
  if (invoice.cancellationId) return 'text-red-500'
  return 'text-gray-400'
}

async function load() {
  [invoices.value, clients.value, companies.value, bookings.value, settings.value] = await Promise.all([
    request('/invoices'), request('/clients'), request('/companies'), request('/bookings'), request('/settings'),
  ])
}
async function saveInvoice() {
  if (!form.items.length) return toast.warning('Add at least one invoice item.')
  if (invoiceSource.value === 'booking' && !form.bookingId) return toast.warning('Select a booking first.')
  if (invoiceSource.value === 'manual' && !form.clientId) return toast.warning('Select a client.')
  if (invoiceSource.value === 'manual' && !form.companyId) return toast.warning('Select a billing company.')
  savingInvoice.value = true
  const payload = JSON.parse(JSON.stringify(form))
  payload.documentType = documentKind.value
  payload.items = payload.items.map(i => ({ ...i, taxAmount: documentKind.value === 'PROFORMA' ? 0 : i.taxAmount, total: itemTotal(i) }))
  try {
    const invoice = invoiceSource.value === 'booking'
      ? await request(`/invoices/from-booking/${payload.bookingId}`, { method: 'POST', body: { ...payload, serviceItemIds: payload.items.map((item) => item.bookingServiceItemId).filter(Boolean) } })
      : await request('/invoices', { method: 'POST', body: { ...payload, bookingId: null } })
    showCreate.value = false
    await load()
    toast.success(documentKind.value === 'PROFORMA' ? 'Proforma invoice created.' : 'Invoice created.')
    if (invoice?.id) router.push(`/invoices/${invoice.id}`)
  } finally {
    savingInvoice.value = false
  }
}
async function convertProforma(proforma) {
  if (!window.confirm(`Convert ${proforma.invoiceNumber} into a posted invoice? The proforma will remain available as a converted source document.`)) return
  const invoice = await request(`/invoices/${proforma.id}/convert`, { method: 'POST', body: {} })
  await load()
  toast.success(`Invoice ${invoice.invoiceNumber} created from ${proforma.invoiceNumber}.`)
  if (invoice?.id) router.push(`/invoices/${invoice.id}`)
}
async function pay() {
  if (!paymentInvoice.value) return
  const payload = { ...payment }
  if (paymentProof.value) {
    const formData = new FormData()
    formData.append('file', paymentProof.value)
    const uploaded = await request('/uploads/payment-proof', { method: 'POST', body: formData })
    payload.proofUrl = uploaded.url
    payload.proofOriginalName = uploaded.originalName
  }
  await request(`/invoices/${paymentInvoice.value.id}/payments`, { method: 'POST', body: payload })
  showPayment.value = false
  await load()
  toast.success('Payment recorded.')
}
watch(() => route.query.quickCreate, handleQuickCreate)
onMounted(async () => {
  await load()
  if (route.query.create === 'booking' && route.query.bookingId) {
    openCreate()
    const booking = bookings.value.find((item) => Number(item.id) === Number(route.query.bookingId))
    if (booking) await selectBooking(booking)
  } else {
    handleQuickCreate()
  }
})
</script>
