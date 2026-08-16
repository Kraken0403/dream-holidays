export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie('dh_token')
  const toast = useToast()
  const route = useRoute()

  const request = async (path, options = {}) => {
    try {
      let baseURL = config.public.apiBase
      if (import.meta.client && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(baseURL)) {
        const configured = new URL(baseURL)
        const browserHost = window.location.hostname
        if (!['localhost', '127.0.0.1'].includes(browserHost)) configured.hostname = browserHost
        baseURL = configured.toString().replace(/\/$/, '')
      }

      return await $fetch(path, {
        baseURL,
        ...options,
        headers: {
          ...(options.headers || {}),
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
      })
    } catch (error) {
      if (error?.status === 401 || error?.statusCode === 401) {
        token.value = null
        if (import.meta.client && route.path !== '/login') await navigateTo('/login')
      }
      if (options.toastError !== false) {
        toast.error(error?.data?.message || error?.message || 'Request failed.')
      }
      throw error
    }
  }

  return { request }
}
