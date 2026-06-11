export function useMoney() {
  const formatMoney = (value) => {
    const n = Number(value || 0)
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
  }
  return { formatMoney }
}
