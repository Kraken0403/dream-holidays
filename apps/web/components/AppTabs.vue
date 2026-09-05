<template>
  <nav class="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200" :aria-label="ariaLabel">
    <button v-for="tab in tabs" :key="tab.id" type="button" class="whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors" :class="modelValue === tab.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'" @click="$emit('update:modelValue', tab.id)">{{ tab.label }}</button>
  </nav>
</template>
<script setup>
defineProps({ modelValue: { type: String, required: true }, tabs: { type: Array, required: true }, ariaLabel: { type: String, default: 'Sections' } })
defineEmits(['update:modelValue'])
</script>
