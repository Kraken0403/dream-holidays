<template>
  <div class="mb-1">
    <button
      type="button"
      @click="$emit('toggle')"
      :title="collapsed ? label : undefined"
      class="mt-2 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
      :class="collapsed
        ? 'text-gray-400 hover:text-gray-600 md:mx-auto md:h-9 md:w-9 md:justify-center md:px-0 md:text-white/80 md:hover:bg-white/15 md:hover:text-white'
        : 'text-gray-400 hover:text-gray-600'"
    >
      <span v-if="collapsed" class="hidden items-center justify-center md:flex"><slot name="icon" /></span>
      <span :class="collapsed ? 'md:hidden' : ''">{{ label }}</span>
      <svg
        class="w-3 h-3 transition-transform duration-200"
        :class="[open ? 'rotate-180' : '', collapsed ? 'md:hidden' : '']"
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
defineProps({ label: String, open: Boolean, collapsed: Boolean })
defineEmits(['toggle'])
</script>
