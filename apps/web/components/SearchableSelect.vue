<template>
  <div ref="root" class="relative">
    <button type="button" class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100" @click="toggle">
      <span class="truncate" :class="selectedOption || (allowAll && String(modelValue) === String(allValue)) ? 'text-gray-900' : 'text-gray-300'">{{ selectedLabel }}</span>
      <svg class="ml-2 h-4 w-4 flex-none text-gray-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/></svg>
    </button>
    <div v-if="open" class="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
      <div class="border-b border-gray-100 p-2"><input ref="searchInput" v-model="search" type="search" :placeholder="searchPlaceholder" class="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" @keydown.esc="open = false" /></div>
      <div class="max-h-64 overflow-y-auto py-1">
        <button v-if="allowAll" type="button" class="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50" :class="String(modelValue) === String(allValue) ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'" @click="select(allValue)">{{ allLabel }}</button>
        <button v-for="option in filteredOptions" :key="option[valueKey]" type="button" class="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50" :class="String(modelValue) === String(option[valueKey]) ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'" @click="select(option[valueKey])">{{ optionLabel(option) }}</button>
        <p v-if="!filteredOptions.length" class="px-3 py-4 text-center text-xs text-gray-400">No matches</p>
      </div>
    </div>
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: { type: [String, Number], default: '' }, options: { type: Array, default: () => [] }, valueKey: { type: String, default: 'id' }, labelKey: { type: String, default: 'name' }, secondaryKey: { type: String, default: '' }, placeholder: { type: String, default: 'Select an option' }, searchPlaceholder: { type: String, default: 'Type to search…' }, allowAll: { type: Boolean, default: false }, allLabel: { type: String, default: 'All' }, allValue: { type: [String, Number], default: 'all' } })
const emit = defineEmits(['update:modelValue', 'change'])
const root = ref(null), searchInput = ref(null), open = ref(false), search = ref('')
const selectedOption = computed(() => props.options.find((option) => String(option[props.valueKey]) === String(props.modelValue)))
const optionLabel = (option) => [option?.[props.labelKey], props.secondaryKey && option?.[props.secondaryKey] ? `(${option[props.secondaryKey]})` : ''].filter(Boolean).join(' ')
const selectedLabel = computed(() => String(props.modelValue) === String(props.allValue) && props.allowAll ? props.allLabel : selectedOption.value ? optionLabel(selectedOption.value) : props.placeholder)
const filteredOptions = computed(() => { const query = search.value.trim().toLowerCase(); return query ? props.options.filter((option) => optionLabel(option).toLowerCase().includes(query)) : props.options })
function toggle() { open.value = !open.value; if (open.value) nextTick(() => searchInput.value?.focus()) }
function select(value) { emit('update:modelValue', value); emit('change', value); open.value = false; search.value = '' }
function close(event) { if (!root.value?.contains(event.target)) open.value = false }
onMounted(() => document.addEventListener('click', close)); onBeforeUnmount(() => document.removeEventListener('click', close))
</script>
