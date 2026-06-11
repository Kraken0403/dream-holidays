<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ booking?.bookingNumber || 'Booking' }}</h1>
        <p class="sub">{{ booking?.title || 'Loading booking...' }} - {{ booking?.client?.name || '' }}</p>
      </div>
      <div class="toolbar-actions">
        <NuxtLink class="btn secondary" to="/bookings">Back to List</NuxtLink>
        <button class="btn" type="button" :disabled="!booking" @click="createInvoice">Generate Invoice</button>
        <button class="btn secondary" type="button" :disabled="!booking" @click="createVendorBills">Generate Vendor Bills</button>
      </div>
    </div>

    <template v-if="booking">
      <div class="grid grid-4" style="margin-bottom: 16px;">
        <div class="card kpi"><div class="label">Sale</div><div class="value">{{ formatMoney(booking.totalSaleAmount) }}</div></div>
        <div class="card kpi"><div class="label">Vendor Cost</div><div class="value">{{ formatMoney(booking.totalVendorCost) }}</div></div>
        <div class="card kpi"><div class="label">Margin</div><div class="value">{{ formatMoney(booking.grossMargin) }}</div></div>
        <div class="card kpi"><div class="label">Status</div><div class="value" style="font-size:20px;">{{ booking.status }}</div></div>
      </div>

      <div class="card table-wrap">
        <table>
          <thead><tr><th>Service</th><th>Description</th><th>Vendor</th><th>Sale</th><th>Cost</th><th>Margin</th></tr></thead>
          <tbody>
            <tr v-for="item in booking.serviceItems || []" :key="item.id">
              <td>{{ item.category?.parent?.name ? item.category.parent.name + ' / ' : '' }}{{ item.category?.name }}</td>
              <td>{{ item.description }}</td>
              <td>{{ item.vendor?.name || '-' }}</td>
              <td class="money">{{ formatMoney(item.saleTotal) }}</td>
              <td class="money">{{ formatMoney(item.vendorTotal) }}</td>
              <td class="money">{{ formatMoney(item.margin) }}</td>
            </tr>
            <tr v-if="!booking.serviceItems?.length"><td colspan="6" class="muted">No service items found.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="grid grid-2" style="margin-top:16px;">
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Invoices</th><th>Total</th><th>Outstanding</th></tr></thead>
            <tbody>
              <tr v-for="i in booking.invoices || []" :key="i.id"><td>{{ i.invoiceNumber }}</td><td>{{ formatMoney(i.grandTotal) }}</td><td>{{ formatMoney(i.outstandingAmount) }}</td></tr>
              <tr v-if="!booking.invoices?.length"><td colspan="3" class="muted">No invoices generated.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card table-wrap">
          <table>
            <thead><tr><th>Vendor Bills</th><th>Vendor</th><th>Outstanding</th></tr></thead>
            <tbody>
              <tr v-for="v in booking.vendorBills || []" :key="v.id"><td>{{ v.billNumber }}</td><td>{{ v.vendor?.name }}</td><td>{{ formatMoney(v.outstandingAmount) }}</td></tr>
              <tr v-if="!booking.vendorBills?.length"><td colspan="3" class="muted">No vendor bills generated.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <div v-else class="card card-pad muted">Loading booking...</div>
  </div>
</template>
<script setup>
const route = useRoute()
const { request } = useApi()
const { formatMoney } = useMoney()
const booking = ref(null)
async function load() { booking.value = await request(`/bookings/${route.params.id}`) }
async function createInvoice() { await request(`/invoices/from-booking/${route.params.id}`, { method: 'POST', body: {} }); await load() }
async function createVendorBills() { await request(`/vendor-payables/from-booking/${route.params.id}`, { method: 'POST' }); await load() }
onMounted(load)
</script>
