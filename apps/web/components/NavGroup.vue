<template>
  <div>
    <button
      type="button"
      @click="$emit('toggle')"
      class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-300 transition-colors rounded-lg"
    >
      <span>{{ label }}</span>
      <svg
        class="w-3 h-3 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"/>
      </svg>
    </button>
    <div v-show="open" class="mt-0.5 space-y-0.5">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ label: String, open: Boolean })
defineEmits(['toggle'])
</script>
