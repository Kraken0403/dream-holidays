<template>
  <nav class="mb-4 flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Settings">
    <NuxtLink v-for="tab in tabs" :key="tab.to" :to="tab.to"
      class="whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold transition-colors"
      :class="route.path === tab.to ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'">
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>

<script setup>
const route = useRoute()
const tabs = [
  { label: 'Global Settings', to: '/settings' },
  { label: 'My Companies', to: '/companies' },
  { label: 'Categories', to: '/categories' },
  { label: 'Vendors', to: '/vendors' },
]
</script>
