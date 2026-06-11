<template>
  <div class="login-shell">
    <div class="card login-card">
      <h1>Dream Holidays</h1>
      <p class="sub">Login to accounting dashboard</p>
      <form class="form" style="margin-top: 22px;" @submit.prevent="login">
        <div class="field">
          <label>Email</label>
          <input v-model="form.email" class="input" type="email" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input v-model="form.password" class="input" type="password" required />
        </div>
        <p v-if="error" style="color: var(--danger); margin: 0;">{{ error }}</p>
        <button class="btn" type="submit" :disabled="loading">{{ loading ? 'Logging in...' : 'Login' }}</button>
      </form>
      <p class="sub" style="margin-top: 16px;">Default: admin@dreamholidays.local / Admin@12345</p>
    </div>
  </div>
</template>

<script setup>
const { request } = useApi()
const token = useCookie('dh_token')
const form = reactive({ email: 'admin@dreamholidays.local', password: 'Admin@12345' })
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    const res = await request('/auth/login', { method: 'POST', body: form })
    token.value = res.accessToken
    await navigateTo('/dashboard')
  } catch (e) {
    error.value = e?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
