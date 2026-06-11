<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
    :class="isActive
      ? 'bg-blue-600 text-white'
      : 'text-gray-300 hover:bg-gray-800 hover:text-white'"
  >
    <span class="flex-shrink-0 text-current opacity-80">
      <slot name="icon" />
    </span>
    <span>{{ label }}</span>
  </NuxtLink>
</template>

<script setup>
const props = defineProps({ to: String, label: String })
const route = useRoute()
const isActive = computed(() =>
  props.to === '/dashboard'
    ? route.path === '/' || route.path === '/dashboard'
    : route.path.startsWith(props.to)
)
</script>
