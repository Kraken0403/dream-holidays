<template>
  <div v-if="isLogin"><slot /></div>
  <div v-else class="flex min-h-screen bg-gray-50">
    <aside
      class="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white transition-all duration-200"
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        sidebarCollapsed ? 'md:w-16 md:border-blue-800 md:bg-blue-700' : 'md:w-64'
      ]"
    >
      <div class="flex h-14 items-center border-b px-3" :class="sidebarCollapsed ? 'md:justify-center md:border-blue-600' : 'gap-3 border-gray-200'">
        <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-600 text-white shadow-sm" :class="sidebarCollapsed ? 'md:bg-white md:text-blue-700' : ''">
          <img v-if="sidebarCompany?.logoUrl" :src="sidebarCompany.logoUrl" :alt="`${sidebarCompanyName} logo`" class="h-full w-full bg-white object-contain" />
          <span v-else class="text-xs font-bold">{{ sidebarCompanyInitials }}</span>
        </div>
        <div class="min-w-0" :class="sidebarCollapsed ? 'md:hidden' : ''">
          <div class="truncate text-sm font-bold leading-tight text-gray-900">{{ sidebarCompanyName }}</div>
          <div class="text-[11px] text-gray-400">Accounting Suite</div>
        </div>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        <NavGroup label="Operations" :open="openGroup === 'operations'" :collapsed="sidebarCollapsed" @toggle="toggleGroup('operations')">
          <template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25m-4.5-13.5h16.5m0 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5M9 12l2-2 2 1 3-4"/></svg></template>
          <NavItem to="/dashboard" label="Dashboard" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9M5 10v10h14V10M9 21v-6h6v6"/></svg></template></NavItem>
          <NavItem to="/bookings" label="My Bookings" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M2 12h20"/></svg></template></NavItem>
          <NavItem to="/clients" label="Clients" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm13 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></template></NavItem>
          <NavItem to="/invoices" label="Invoices" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8m-8 4h8"/></svg></template></NavItem>
          <NavItem to="/vendor-payables" label="Vendor Payables" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 7h20v13H2zM2 11h20M6 16h4"/></svg></template></NavItem>
        </NavGroup>

        <NavGroup label="Accounting" :open="openGroup === 'accounting'" :collapsed="sidebarCollapsed" @toggle="toggleGroup('accounting')">
          <template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M5 10v9m4-9v9m6-9v9m4-9v9M2 21h20M12 3l9 5H3l9-5z"/></svg></template>
          <NavItem to="/passbook" label="Passbook" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zm0 0A2.5 2.5 0 006.5 22H20v-5"/></svg></template></NavItem>
          <NavItem to="/payments" label="Payment Tracking" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 6h20v12H2zM6 12h.01M18 12h.01M12 15a3 3 0 100-6 3 3 0 000 6z"/></svg></template></NavItem>
          <NavItem to="/accounts" label="Accounts / Ledger" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4h16v16H4zM8 8h8M8 12h8m-8 4h5"/></svg></template></NavItem>
          <NavItem to="/reports" label="Reports" :collapsed="sidebarCollapsed"><template #icon><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 19V9m5 10V5m5 14v-7m5 7V3"/></svg></template></NavItem>
        </NavGroup>
      </nav>

      <div class="border-t px-2 py-2" :class="sidebarCollapsed ? 'md:border-blue-600' : 'border-gray-200 bg-gray-50'">
        <div class="flex items-center" :class="sidebarCollapsed ? 'md:flex-col md:gap-2' : 'justify-between gap-2'">
          <button type="button" title="User account" class="flex min-w-0 items-center gap-2">
            <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white" :class="sidebarCollapsed ? 'md:bg-white md:text-blue-700' : ''">DH</span>
            <span class="min-w-0 text-left" :class="sidebarCollapsed ? 'md:hidden' : ''"><span class="block truncate text-xs font-semibold text-gray-800">Admin</span><span class="block truncate text-[10px] text-gray-400">admin@dreamholidays.local</span></span>
          </button>
          <button @click="logout" title="Logout" class="rounded-md p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700" :class="sidebarCollapsed ? 'md:text-white/80 md:hover:bg-white/15 md:hover:text-white' : ''">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <div v-if="sidebarOpen" class="fixed inset-0 z-30 bg-gray-900/40 md:hidden" @click="sidebarOpen = false" />

    <div class="flex min-w-0 flex-1 flex-col transition-all duration-200" :class="sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'">
      <header class="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button class="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800" :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="toggleSidebar">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>
        </button>
        <div class="relative min-w-0 max-w-xl flex-1">
          <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"/></svg>
          <input v-model="globalSearch" type="search" placeholder="Search pages" class="h-9 w-full rounded-full border border-gray-300 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500" @focus="searchFocused = true" @blur="closeSearch" />
          <div v-if="searchFocused && globalSearch" class="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <NuxtLink v-for="item in searchResults" :key="item.to" :to="item.to" class="block px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700" @click="globalSearch = ''">{{ item.label }}</NuxtLink>
            <div v-if="!searchResults.length" class="px-3 py-3 text-xs text-gray-400">No page found</div>
          </div>
        </div>
        <div class="relative">
          <button type="button" title="Quick create" class="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700" @click="quickCreateOpen = !quickCreateOpen">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>
          </button>
          <div v-if="quickCreateOpen" class="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
            <div class="border-b border-gray-100 px-3 py-2"><p class="text-[10px] font-bold uppercase tracking-wide text-gray-400">Quick create</p></div>
            <button v-for="item in quickCreateItems" :key="item.label" type="button" class="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700" @click="openQuickCreate(item)">
              <span>{{ item.label }}</span><span class="text-xs text-gray-300">+</span>
            </button>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-1">
          <NuxtLink to="/settings" title="Settings" class="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15.75A3.75 3.75 0 1012 8.25a3.75 3.75 0 000 7.5zM19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V21h-4v-.08A1.7 1.7 0 008.97 19.4a1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.52-1.03H3v-4h.08A1.7 1.7 0 004.6 8.94a1.7 1.7 0 00-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 001.88.34A1.7 1.7 0 0010 3.05V3h4v.05a1.7 1.7 0 001.03 1.52 1.7 1.7 0 001.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 00-.34 1.88 1.7 1.7 0 001.52 1.03H21v4h-.08A1.7 1.7 0 0019.4 15z"/></svg>
          </NuxtLink>
          <button type="button" title="User account" class="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 21a7.5 7.5 0 0115 0"/></svg>
          </button>
        </div>
      </header>
      <main class="flex-1 p-4"><slot /></main>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const { request } = useApi()
const globalSettings = useState('global-settings', () => ({ dateFormat: 'DD/MM/YYYY' }))
const isLogin = computed(() => route.path === '/login')
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const globalSearch = ref('')
const searchFocused = ref(false)
const quickCreateOpen = ref(false)
const sidebarCompany = ref(null)
const sidebarCompanyName = computed(() => sidebarCompany.value?.name || 'Dream Holidays')
const sidebarCompanyInitials = computed(() => sidebarCompanyName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'DH')

const pages = [
  { label: 'Dashboard', to: '/dashboard' }, { label: 'My Bookings', to: '/bookings' }, { label: 'Clients', to: '/clients' },
  { label: 'Invoices', to: '/invoices' }, { label: 'Vendor Payables', to: '/vendor-payables' }, { label: 'Passbook', to: '/passbook' },
  { label: 'Payment Tracking', to: '/payments' }, { label: 'Accounts / Ledger', to: '/accounts' }, { label: 'Reports', to: '/reports' },
  { label: 'Global Settings', to: '/settings' }, { label: 'Invoice Settings', to: '/invoice-settings' }, { label: 'My Companies', to: '/companies' }, { label: 'Categories', to: '/categories' }, { label: 'Vendors', to: '/vendors' },
]
const quickCreateItems = [
  { label: 'Booking', path: '/bookings', create: 'booking' },
  { label: 'Client', path: '/clients', create: 'client' },
  { label: 'Vendor', path: '/vendors', create: 'vendor' },
  { label: 'Invoice', path: '/invoices', create: 'invoice' },
  { label: 'Proforma Invoice', path: '/invoices', create: 'proforma' },
  { label: 'Company', path: '/companies', create: 'company' },
]
const searchResults = computed(() => pages.filter((item) => item.label.toLowerCase().includes(globalSearch.value.trim().toLowerCase())).slice(0, 8))

function groupForPath(path) {
  if (['/passbook', '/payments', '/accounts', '/reports'].some((prefix) => path.startsWith(prefix))) return 'accounting'
  if (['/', '/dashboard', '/bookings', '/clients', '/invoices', '/vendor-payables'].some((prefix) => path === prefix || (prefix !== '/' && path.startsWith(prefix)))) return 'operations'
  return null
}
const openGroup = ref(groupForPath(route.path) || 'operations')
function toggleGroup(group) { openGroup.value = openGroup.value === group ? null : group }
function toggleSidebar() {
  if (window.innerWidth < 768) sidebarOpen.value = !sidebarOpen.value
  else sidebarCollapsed.value = !sidebarCollapsed.value
}
function closeSearch() { window.setTimeout(() => { searchFocused.value = false }, 150) }
function openQuickCreate(item) {
  quickCreateOpen.value = false
  navigateTo({ path: item.path, query: { create: item.create, quickCreate: String(Date.now()) } })
}
function logout() { const token = useCookie('dh_token'); token.value = null; navigateTo('/login') }

watch(() => route.path, (path) => {
  sidebarOpen.value = false
  quickCreateOpen.value = false
  const active = groupForPath(path)
  if (active) openGroup.value = active
})
onMounted(async () => {
  if (isLogin.value) return
  try { globalSettings.value = { ...globalSettings.value, ...await request('/settings', { toastError: false }) } } catch {}
  try {
    const companies = await request('/companies', { toastError: false })
    sidebarCompany.value = companies.find(company => company.active && company.logoUrl)
      || companies.find(company => company.active)
      || companies[0]
      || null
  } catch {}
})
</script>