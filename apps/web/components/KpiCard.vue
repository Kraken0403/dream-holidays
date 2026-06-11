<template>
  <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{{ label }}</p>
        <p class="text-2xl font-bold text-gray-900 mt-1 tabular-nums">{{ value }}</p>
        <p v-if="sub" class="text-xs text-gray-400 mt-1">{{ sub }}</p>
      </div>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" :class="bgClass">
        <svg class="w-5 h-5" :class="iconClass" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path v-if="icon === 'currency'" stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path v-else-if="icon === 'trend'" stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/>
          <path v-else-if="icon === 'truck'" stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/>
          <path v-else-if="icon === 'doc'" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          <path v-else-if="icon === 'in'" stroke-linecap="round" stroke-linejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path v-else-if="icon === 'out'" stroke-linecap="round" stroke-linejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({ label: String, value: String, sub: String, icon: { type: String, default: 'currency' }, color: { type: String, default: 'blue' } })
const colorMap = { blue: ['bg-blue-50', 'text-blue-600'], green: ['bg-green-50', 'text-green-600'], red: ['bg-red-50', 'text-red-600'], orange: ['bg-orange-50', 'text-orange-600'], purple: ['bg-purple-50', 'text-purple-600'], yellow: ['bg-yellow-50', 'text-yellow-600'] }
const bgClass = computed(() => (colorMap[props.color] || colorMap.blue)[0])
const iconClass = computed(() => (colorMap[props.color] || colorMap.blue)[1])
</script>
