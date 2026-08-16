<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo card -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg mb-4">
          <svg class="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Dream Holidays</h1>
        <p class="text-blue-300 text-sm mt-1">Accounting Suite</p>
      </div>

      <!-- Form card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <h2 class="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>
        <form @submit.prevent="login" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              v-model="form.email"
              type="email" required autocomplete="email"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              placeholder="admin@dreamholidays.local"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'" required autocomplete="current-password"
                class="w-full border border-gray-300 rounded-lg pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                placeholder="••••••••"
              />
            <button type="button" class="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-700" :aria-label="showPassword ? 'Hide password' : 'Show password'" :title="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m3.3-2.694A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 6L6 3" /></svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
          </div>

          <div v-if="error" class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
            {{ error }}
          </div>

          <button
            type="submit" :disabled="loading"
            class="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <svg v-if="loading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })
const { request } = useApi()
const toast = useToast()
const token = useCookie('dh_token')
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)
const showPassword = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      },
      toastError: false,
    })
    token.value = res.accessToken
    toast.success('Signed in as admin.')
    await navigateTo('/dashboard')
  } catch (e) {
    error.value = e?.data?.message || 'Login failed. Check your credentials.'
    toast.error(error.value)
  } finally {
    loading.value = false
  }
}
</script>
