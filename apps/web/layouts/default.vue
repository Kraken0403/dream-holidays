<template>
  <div v-if="isLogin">
    <slot />
  </div>
  <div v-else class="layout">
    <aside class="sidebar">
      <div class="logo">Dream <span>Holidays</span></div>
      <nav class="nav">
        <div class="nav-section">Overview</div>
        <NuxtLink to="/dashboard">Dashboard</NuxtLink>
        <div class="nav-section">Setup</div>
        <NuxtLink to="/companies">Companies</NuxtLink>
        <NuxtLink to="/settings">Settings</NuxtLink>
        <NuxtLink to="/categories">Categories</NuxtLink>
        <NuxtLink to="/vendors">Vendors</NuxtLink>
        <NuxtLink to="/clients">Clients</NuxtLink>
        <div class="nav-section">Operations</div>
        <NuxtLink to="/bookings">Bookings</NuxtLink>
        <NuxtLink to="/invoices">Invoices</NuxtLink>
        <NuxtLink to="/vendor-payables">Vendor Payables</NuxtLink>
        <div class="nav-section">Accounting</div>
        <NuxtLink to="/passbook">Passbook</NuxtLink>
        <NuxtLink to="/payments">Payment Tracking</NuxtLink>
        <NuxtLink to="/accounts">Accounts / Ledger</NuxtLink>
        <NuxtLink to="/reports">Reports</NuxtLink>
      </nav>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <strong>Accounting Module</strong>
          <div class="muted" style="font-size: 12px;">Booking-led travel accounting</div>
        </div>
        <button class="btn secondary" @click="logout">Logout</button>
      </header>
      <slot />
    </main>
  </div>
</template>

<script setup>
const route = useRoute()
const isLogin = computed(() => route.path === '/login')
function logout() {
  const token = useCookie('dh_token')
  token.value = null
  navigateTo('/login')
}
</script>
