<template>
  <div>
    <PageHeader title="Bookings" subtitle="Trip files — create booking, generate invoice &amp; vendor payables.">
      <template #actions>
        <button type="button" @click="openCreate"
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
          New Booking
        </button>
      </template>
    </PageHeader>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dates</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sale</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Margin</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr
              v-for="b in bookings" :key="b.id"
              class="hover:bg-blue-50/60 cursor-pointer transition-colors"
              @click="router.push(`/bookings/${b.id}`)"
            >
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900">{{ b.bookingNumber }}</div>
                <div class="text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">{{ b.title }}</div>
                <span :class="statusClass(b.status)" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-1">{{ b.status }}</span>
              </td>
              <td class="px-4 py-3 text-gray-700">{{ b.client?.name }}</td>
              <td class="px-4 py-3">
                <div class="text-gray-700">{{ dateOnly(b.bookingDate) }}</div>
                <div class="text-gray-400 text-xs">{{ dateOnly(b.travelStartDate) }} → {{ dateOnly(b.travelEndDate) }}</div>
              </td>
              <td class="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">{{ fmt(b.totalSaleAmount) }}</td>
              <td class="px-4 py-3 text-right text-gray-500 tabular-nums">{{ fmt(b.totalVendorCost) }}</td>
              <td class="px-4 py-3 text-right font-bold tabular-nums" :class="Number(b.grossMargin) >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmt(b.grossMargin) }}</td>
            </tr>
            <tr v-if="!bookings.length">
              <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                <svg class="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                No bookings yet. Create your first booking.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Booking Modal -->
    <AppModal v-model="showModal" title="Create Booking" subtitle="Fill in the trip details and service items" size="lg" color="blue">
      <form id="booking-form" @submit.prevent="save">
        <div class="space-y-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Client *</label>
              <select v-model="form.clientId" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required>
                <option value="">Select client</option>
                <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Billing Company *</label>
              <select v-model="form.companyId" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required>
                <option value="">Select company</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Booking Title *</label>
              <input v-model="form.title" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required placeholder="e.g. Nitin Patel – Baku Package" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Destination</label>
              <input v-model="form.destination" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Booking Date *</label>
              <input v-model="form.bookingDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Travel Start</label>
              <input v-model="form.travelStartDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Travel End</label>
              <input v-model="form.travelEndDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Passengers</label>
              <input v-model.number="form.passengerCount" type="number" min="1" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select v-model="form.status" class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                <option>DRAFT</option><option>CONFIRMED</option>
              </select>
            </div>
          </div>

          <!-- Service Items -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-semibold text-gray-900">Service Items</h4>
              <button type="button" @click="addItem" class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
                Add Item
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="(item, index) in form.serviceItems" :key="index" class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                    <select v-model="item.categoryId" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" required>
                      <option value="">Select</option>
                      <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.parent ? c.parent.name + ' / ' : '' }}{{ c.name }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
                    <select v-model="item.vendorId" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white">
                      <option value="">None</option>
                      <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.name }}</option>
                    </select>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Description *</label>
                    <input v-model="item.description" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Service Date</label>
                    <input v-model="item.serviceDate" type="date" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-3 items-end">
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                    <input v-model.number="item.quantity" type="number" min="1" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Sale Rate</label>
                    <input v-model.number="item.saleRate" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-600 mb-1">Vendor Cost</label>
                    <input v-model.number="item.vendorCost" type="number" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                  </div>
                  <div class="flex items-end gap-2">
                    <div class="flex-1">
                      <label class="block text-xs font-medium text-gray-600 mb-1">Margin</label>
                      <div class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 font-semibold" :class="itemMargin(item) >= 0 ? 'text-green-700' : 'text-red-600'">
                        {{ fmt(itemMargin(item)) }}
                      </div>
                    </div>
                    <button type="button" @click="form.serviceItems.splice(index, 1)" class="mb-0.5 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" @click="showModal = false" class="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">Cancel</button>
        <button type="submit" form="booking-form" :disabled="saving" class="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
          {{ saving ? 'Creating…' : 'Create Booking' }}
        </button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
const { request } = useApi()
const { formatMoney } = useMoney()
const router = useRouter()
const bookings = ref([]), clients = ref([]), companies = ref([]), categories = ref([]), vendors = ref([])
const showModal = ref(false)
const saving = ref(false)
const fmt = (v) => formatMoney(v || 0)
const today = () => new Date().toISOString().slice(0, 10)
const blankItem = () => ({ categoryId: '', vendorId: '', description: '', serviceDate: '', quantity: 1, saleRate: 0, saleTax: 0, vendorCost: 0, vendorTax: 0 })
const blankForm = () => ({ clientId: '', companyId: '', title: '', destination: '', bookingDate: today(), travelStartDate: '', travelEndDate: '', passengerCount: 1, status: 'DRAFT', clientNotes: '', serviceItems: [blankItem()] })
const form = reactive(blankForm())

function dateOnly(v) { return v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' }
function addItem() { form.serviceItems.push(blankItem()) }
function resetForm() { Object.assign(form, blankForm()) }
function openCreate() { resetForm(); showModal.value = true }
function itemMargin(item) { return (Number(item.quantity || 1) * Number(item.saleRate || 0)) - Number(item.vendorCost || 0) }

function statusClass(s) {
  const map = { DRAFT: 'bg-gray-100 text-gray-700', CONFIRMED: 'bg-blue-100 text-blue-700', INVOICED: 'bg-purple-100 text-purple-700', PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700', PAID: 'bg-green-100 text-green-700', CANCELLED: 'bg-red-100 text-red-700' }
  return map[s] || 'bg-gray-100 text-gray-600'
}

async function load() {
  [bookings.value, clients.value, companies.value, categories.value, vendors.value] = await Promise.all([
    request('/bookings'), request('/clients'), request('/companies'), request('/categories'), request('/vendors'),
  ])
}

async function save() {
  saving.value = true
  try {
    const payload = JSON.parse(JSON.stringify(form))
    payload.serviceItems = payload.serviceItems.map(item => ({
      ...item,
      saleTotal: Number(item.quantity || 1) * Number(item.saleRate || 0) + Number(item.saleTax || 0),
      vendorTotal: Number(item.vendorCost || 0) + Number(item.vendorTax || 0),
    }))
    await request('/bookings', { method: 'POST', body: payload })
    showModal.value = false
    resetForm()
    await load()
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
