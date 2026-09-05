<template>
  <div class="relative">
    <input v-model="text" type="text" :placeholder="dateFormat" :class="[inputClass, invalid ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '']" @focus="focused = true" @blur="commit" @keydown.enter.prevent="commit" />
    <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-blue-600" title="Choose date" @click="openPicker"><svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 3v3m12-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></svg></button>
    <input ref="picker" :value="modelValue" type="date" class="pointer-events-none absolute h-0 w-0 opacity-0" tabindex="-1" @input="pick($event.target.value)" />
  </div>
</template>
<script setup>
const props = defineProps({ modelValue: { type: String, default: '' }, inputClass: { type: String, default: 'w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-2 focus:ring-blue-100' } })
const emit = defineEmits(['update:modelValue', 'change'])
const { formatDate, parseDateInput, dateFormat } = useDateTime()
const picker = ref(null), focused = ref(false), invalid = ref(false)
const text = ref(props.modelValue ? formatDate(props.modelValue) : '')
watch(() => props.modelValue, value => { if (!focused.value) text.value = value ? formatDate(value) : '' })
watch(dateFormat, () => { text.value = props.modelValue ? formatDate(props.modelValue) : '' })
function commit() { focused.value = false; if (!text.value.trim()) { invalid.value = false; emit('update:modelValue', ''); emit('change', ''); return } const parsed = parseDateInput(text.value); invalid.value = parsed === null; if (parsed) { emit('update:modelValue', parsed); emit('change', parsed); text.value = formatDate(parsed) } }
function pick(value) { invalid.value = false; emit('update:modelValue', value); emit('change', value); text.value = value ? formatDate(value) : '' }
function openPicker() { if (picker.value?.showPicker) picker.value.showPicker(); else picker.value?.click() }
</script>
