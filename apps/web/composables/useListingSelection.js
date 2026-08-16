function readValue(row, field) {
  if (typeof field === 'function') return field(row)
  return String(field).split('.').reduce((value, key) => value == null ? value : value[key], row)
}

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function useListingSelection(table, columns, fileName) {
  const selectedIds = ref(new Set())
  const rowId = (row) => String(row.id ?? row.key ?? JSON.stringify(row))
  const isSelected = (row) => selectedIds.value.has(rowId(row))
  const selectedCount = computed(() => selectedIds.value.size)
  const selectedRows = computed(() => table.filteredRows.value.filter(isSelected))
  const pageAllSelected = computed(() => table.rows.value.length > 0 && table.rows.value.every(isSelected))

  function toggle(row) {
    const next = new Set(selectedIds.value)
    const id = rowId(row)
    next.has(id) ? next.delete(id) : next.add(id)
    selectedIds.value = next
  }

  function togglePage() {
    const next = new Set(selectedIds.value)
    const select = !pageAllSelected.value
    table.rows.value.forEach((row) => select ? next.add(rowId(row)) : next.delete(rowId(row)))
    selectedIds.value = next
  }

  function clear() {
    selectedIds.value = new Set()
  }

  function exportXls() {
    const selected = table.filteredRows.value.filter(isSelected)
    const rows = selected.length ? selected : table.filteredRows.value
    const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')
    const body = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(readValue(row, column.field))}</td>`).join('')}</tr>`).join('')
    const html = `<html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date()).map((part) => [part.type, part.value]))
    const istDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`
    link.download = `${fileName}-${istDate}.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

  watch(table.filteredRows, (rows) => {
    const available = new Set(rows.map(rowId))
    selectedIds.value = new Set([...selectedIds.value].filter((id) => available.has(id)))
  })

  return { selectedCount, selectedRows, pageAllSelected, isSelected, toggle, togglePage, clear, exportXls }
}
