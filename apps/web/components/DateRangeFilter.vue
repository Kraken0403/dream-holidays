<template>
  <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
    <div class="w-full sm:w-48">
      <label class="mb-1.5 block text-xs font-medium text-gray-600">Period</label>
      <select :value="preset" :class="inputClass" @change="selectPreset($event.target.value)">
        <option v-if="allowAll" value="all">All dates</option>
        <option value="this_month">This month</option>
        <option value="previous_month">Previous month</option>
        <option value="month">Choose month</option>
        <option value="this_quarter">This quarter</option>
        <option value="previous_quarter">Previous quarter</option>
        <option value="this_half">This half-year</option>
        <option value="previous_half">Previous half-year</option>
        <option value="financial_year">Current financial year</option>
        <option value="custom">Custom dates</option>
      </select>
    </div>
    <div v-if="preset === 'month'" class="w-full sm:w-44">
      <label class="mb-1.5 block text-xs font-medium text-gray-600">Month</label>
      <input v-model="selectedMonth" type="month" :class="inputClass" @change="selectMonth" />
    </div>
    <div v-if="preset === 'custom'" class="w-full sm:w-44">
      <label class="mb-1.5 block text-xs font-medium text-gray-600">From</label>
      <FormattedDateInput :model-value="from" :input-class="inputClass" @update:model-value="setCustom('from', $event)" />
    </div>
    <div v-if="preset === 'custom'" class="w-full sm:w-44">
      <label class="mb-1.5 block text-xs font-medium text-gray-600">To</label>
      <FormattedDateInput :model-value="to" :input-class="inputClass" @update:model-value="setCustom('to', $event)" />
    </div>
    <button v-if="preset !== 'all'" type="button" class="inline-flex h-9 items-center gap-1 rounded-full bg-blue-50 px-2.5 text-xs font-medium text-blue-700 hover:bg-blue-100" title="Clear date filter" @click="clearPeriod">
      {{ periodLabel }}
      <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 18 18 6M6 6l12 12"/></svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  preset: { type: String, default: 'all' },
  from: { type: String, default: '' },
  to: { type: String, default: '' },
  allowAll: { type: Boolean, default: true },
})

const emit = defineEmits(['update:preset', 'update:from', 'update:to', 'change'])
const { todayInput, formatDate } = useDateTime()
const selectedMonth = ref(todayInput().slice(0, 7))
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
const presetLabels = { this_month: 'This month', previous_month: 'Previous month', month: 'Selected month', this_quarter: 'This quarter', previous_quarter: 'Previous quarter', this_half: 'This half-year', previous_half: 'Previous half-year', financial_year: 'Current financial year', custom: 'Custom dates' }
const periodLabel = computed(() => props.from || props.to ? `${props.from ? formatDate(props.from) : 'Start'} - ${props.to ? formatDate(props.to) : 'Today'}` : presetLabels[props.preset] || 'Date filter')

function formatIsoDate(date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function bounds(preset) {
  const [year, monthNumber] = todayInput().split('-').map(Number)
  const month = monthNumber - 1
  let from
  let to

  if (preset === 'all') return { from: '', to: '' }
  if (preset === 'this_month') {
    from = new Date(Date.UTC(year, month, 1))
    to = new Date(Date.UTC(year, month + 1, 0))
  } else if (preset === 'previous_month') {
    from = new Date(Date.UTC(year, month - 1, 1))
    to = new Date(Date.UTC(year, month, 0))
  } else if (preset === 'month') {
    const [selectedYear, selectedMonthNumber] = selectedMonth.value.split('-').map(Number)
    from = new Date(Date.UTC(selectedYear, selectedMonthNumber - 1, 1))
    to = new Date(Date.UTC(selectedYear, selectedMonthNumber, 0))
  } else if (preset === 'this_quarter' || preset === 'previous_quarter') {
    const quarterStart = Math.floor(month / 3) * 3 + (preset === 'previous_quarter' ? -3 : 0)
    from = new Date(Date.UTC(year, quarterStart, 1))
    to = new Date(Date.UTC(year, quarterStart + 3, 0))
  } else if (preset === 'this_half' || preset === 'previous_half') {
    const halfStart = month < 6 ? 0 : 6
    const targetStart = halfStart + (preset === 'previous_half' ? -6 : 0)
    from = new Date(Date.UTC(year, targetStart, 1))
    to = new Date(Date.UTC(year, targetStart + 6, 0))
  } else if (preset === 'financial_year') {
    const startYear = month >= 3 ? year : year - 1
    from = new Date(Date.UTC(startYear, 3, 1))
    to = new Date(Date.UTC(startYear + 1, 3, 0))
  } else {
    return { from: props.from, to: props.to }
  }

  return { from: formatIsoDate(from), to: formatIsoDate(to) }
}

function selectMonth() {
  const range = bounds('month')
  emit('update:from', range.from)
  emit('update:to', range.to)
  nextTick(() => emit('change', range))
}

function selectPreset(value) {
  emit('update:preset', value)
  const range = bounds(value)
  emit('update:from', range.from)
  emit('update:to', range.to)
  nextTick(() => emit('change', range))
}

function setCustom(field, value) {
  emit('update:preset', 'custom')
  emit(`update:${field}`, value)
  nextTick(() => emit('change', { from: field === 'from' ? value : props.from, to: field === 'to' ? value : props.to }))
}

function clearPeriod() {
  emit('update:preset', 'all')
  emit('update:from', '')
  emit('update:to', '')
  nextTick(() => emit('change', { from: '', to: '' }))
}

onMounted(() => {
  if (props.preset !== 'custom' && (!props.from || !props.to)) selectPreset(props.preset)
})
</script>
