<template>
  <NuxtLink
    :to="to"
    :title="collapsed ? label : undefined"
    class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
    :class="[
      collapsed ? 'md:mx-auto md:h-9 md:w-9 md:justify-center md:gap-0 md:px-0' : '',
      collapsed
        ? (isActive ? 'bg-blue-50 text-blue-700 md:bg-white md:shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:text-white/80 md:hover:bg-white/15 md:hover:text-white')
        : (isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900')
    ]"
  >
    <span class="flex-shrink-0" :class="collapsed ? '' : (isActive ? 'text-blue-600' : 'text-gray-400')">
      <slot name="icon" />
    </span>
    <span :class="collapsed ? 'md:hidden' : ''">{{ label }}</span>
  </NuxtLink>
</template>

<script setup>
const props = defineProps({ to: String, label: String, collapsed: Boolean })
const route = useRoute()
const isActive = computed(() =>
  props.to === '/dashboard'
    ? route.path === '/' || route.path === '/dashboard'
    : route.path.startsWith(props.to)
)
</script>
