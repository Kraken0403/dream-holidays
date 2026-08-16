<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
        @mousedown.self="$emit('update:modelValue', false)"
      >
        <div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" />

        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="relative z-10 w-full bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
            :class="sizeClass"
          >
            <!-- Colorful Header -->
            <div class="flex items-center justify-between px-6 py-4 rounded-t-xl flex-shrink-0" :class="headerClass">
              <div>
                <h3 class="text-lg font-semibold" :class="color ? 'text-white' : 'text-gray-900'">{{ title }}</h3>
                <p v-if="subtitle" class="text-sm mt-0.5" :class="color ? 'text-white/75' : 'text-gray-500'">{{ subtitle }}</p>
              </div>
              <button
                type="button"
                @click="$emit('update:modelValue', false)"
                class="rounded-lg p-1.5 transition-colors"
                :class="color ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="overflow-y-auto flex-1 px-6 py-5">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t px-6 py-4 flex-shrink-0" :class="footerClass">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  size: { type: String, default: 'md' },
  color: { type: String, default: '' }, // blue | indigo | green | amber | rose | ''
  headerTone: { type: String, default: '' },
  footerTone: { type: String, default: '' },
})
defineEmits(['update:modelValue'])

const sizeClass = computed(() => ({
  sm:   'max-w-md',
  md:   'max-w-2xl',
  lg:   'max-w-4xl',
  xl:   'max-w-6xl',
  full: 'max-w-screen-xl',
}[props.size] || 'max-w-2xl'))

const headerClass = computed(() => {
  const map = {
    blue:   'bg-gradient-to-r from-blue-600 to-blue-700',
    indigo: 'bg-gradient-to-r from-indigo-600 to-purple-600',
    green:  'bg-gradient-to-r from-emerald-600 to-teal-600',
    amber:  'bg-gradient-to-r from-amber-500 to-orange-500',
    rose:   'bg-gradient-to-r from-rose-600 to-pink-600',
    violet: 'bg-gradient-to-r from-violet-600 to-purple-700',
  }
  if (props.color) return map[props.color] || map.blue
  if (props.headerTone === 'soft-blue') return 'border-b border-blue-100 bg-blue-50/70'
  return 'border-b border-gray-100'
})

const footerClass = computed(() => props.footerTone === 'soft-blue'
  ? 'border-blue-100 bg-blue-50/70'
  : 'border-gray-100 bg-gray-50')
</script>
