const baseUrl = (process.env.API_BASE_URL || 'http://localhost:6001/api').replace(/\/$/, '')
const email = process.env.API_TEST_EMAIL || 'admin@dreamholidays.local'
const password = process.env.API_TEST_PASSWORD || 'Admin@12345'

async function request(path, token) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!response.ok) throw new Error(`${response.status} ${path}: ${await response.text()}`)
  return response.json()
}

async function main() {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!login.ok) throw new Error(`Login failed: ${login.status} ${await login.text()}`)
  const { accessToken } = await login.json()

  const checks = [
    '/auth/me', '/companies', '/settings', '/categories', '/categories/tree',
    '/vendors', '/clients', '/bookings', '/invoices', '/vendor-payables',
    '/reports/dashboard', '/reports/aging/receivables', '/reports/aging/payables',
    '/reports/pl', '/reports/trial-balance', '/reports/clients', '/reports/vendors',
    '/passbook/clients', '/passbook/vendors', '/accounts',
  ]

  for (const path of checks) {
    await request(path, accessToken)
    console.log(`PASS GET ${path}`)
  }
  console.log(`\n${checks.length + 1} live API smoke checks passed (including login).`)
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
