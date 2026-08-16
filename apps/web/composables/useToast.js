export function useToast() {
  const toasts = useState('dh_toasts', () => [])

  function remove(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(input) {
    const toast = typeof input === 'string' ? { message: input } : input
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const entry = {
      id,
      type: 'info',
      title: '',
      message: '',
      timeout: 3500,
      ...toast,
    }

    toasts.value = [entry, ...toasts.value].slice(0, 5)

    if (import.meta.client && entry.timeout !== 0) {
      window.setTimeout(() => remove(id), entry.timeout)
    }

    return id
  }

  return {
    toasts,
    push,
    remove,
    success: (message, title = 'Done') => push({ type: 'success', title, message }),
    error: (message, title = 'Something went wrong') => push({ type: 'error', title, message, timeout: 5500 }),
    info: (message, title = 'Heads up') => push({ type: 'info', title, message }),
    warning: (message, title = 'Check this') => push({ type: 'warning', title, message, timeout: 5000 }),
  }
}
