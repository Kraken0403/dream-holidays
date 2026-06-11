export function useApi() {
  const config = useRuntimeConfig()
  const token = useCookie('dh_token')

  const request = async (path, options = {}) => {
    return await $fetch(path, {
      baseURL: config.public.apiBase,
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
      },
    })
  }

  return { request }
}
