<template>
  <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 class="text-lg font-semibold leading-6 text-gray-900">{{ title }}</h1>
      <p v-if="subtitle" class="mt-0.5 text-xs text-gray-500">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2 flex-shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>
