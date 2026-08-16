<template>
  <div class="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto overflow-hidden rounded-xl border bg-white shadow-lg ring-1 ring-black/5"
        :class="tone(toast.type).border"
      >
        <div class="flex gap-3 p-4">
          <div class="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" :class="tone(toast.type).iconBg">
            <svg v-if="toast.type === 'success'" class="h-4 w-4" :class="tone(toast.type).icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <svg v-else-if="toast.type === 'error'" class="h-4 w-4" :class="tone(toast.type).icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" class="h-4 w-4" :class="tone(toast.type).icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <svg v-else class="h-4 w-4" :class="tone(toast.type).icon" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 11.25v5.25m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <div v-if="toast.title" class="text-sm font-semibold text-gray-900">{{ toast.title }}</div>
            <div class="mt-0.5 text-sm text-gray-600">{{ toast.message }}</div>
          </div>
          <button
            type="button"
            title="Dismiss notification"
            class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            @click="remove(toast.id)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
const { toasts, remove } = useToast()

function tone(type) {
  const tones = {
    success: { border: 'border-green-200', iconBg: 'bg-green-50', icon: 'text-green-600' },
    error: { border: 'border-red-200', iconBg: 'bg-red-50', icon: 'text-red-600' },
    warning: { border: 'border-amber-200', iconBg: 'bg-amber-50', icon: 'text-amber-600' },
    info: { border: 'border-blue-200', iconBg: 'bg-blue-50', icon: 'text-blue-600' },
  }

  return tones[type] || tones.info
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
