<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p class="sub">Sales, vendor cost, receivables, payables and cash position.</p>
      </div>
    </div>

    <div class="grid grid-4">
      <div v-for="item in cards" :key="item.label" class="card kpi">
        <div class="label">{{ item.label }}</div>
        <div class="value">{{ formatMoney(item.value) }}</div>
      </div>
    </div>

    <div class="grid grid-3" style="margin-top: 16px;">
      <div class="card kpi">
        <div class="label">Bookings</div>
        <div class="value">{{ data.bookingCount || 0 }}</div>
      </div>
      <div class="card kpi">
        <div class="label">Invoices</div>
        <div class="value">{{ data.invoiceCount || 0 }}</div>
      </div>
      <div class="card kpi">
        <div class="label">Vendor Bills</div>
        <div class="value">{{ data.vendorBillCount || 0 }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const data = ref({})
const cards = computed(() => [
  { label: 'Booking Sales', value: data.value.bookingSale },
  { label: 'Vendor Cost', value: data.value.bookingCost },
  { label: 'Expected Margin', value: data.value.expectedMargin },
  { label: 'Invoice Sales', value: data.value.invoiceSales },
  { label: 'Client Received', value: data.value.clientReceived },
  { label: 'Vendor Paid', value: data.value.vendorPaid },
  { label: 'Receivable', value: data.value.receivable },
  { label: 'Payable', value: data.value.payable },
])

onMounted(async () => {
  data.value = await request('/reports/dashboard')
})
</script>
