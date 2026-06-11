<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
    :class="isActive
      ? 'bg-blue-50 text-blue-700 font-semibold'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'"
  >
    <span class="flex-shrink-0" :class="isActive ? 'text-blue-600' : 'text-gray-400'">
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
