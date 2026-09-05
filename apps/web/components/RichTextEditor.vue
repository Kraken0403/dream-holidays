<template>
  <div class="overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
    <div class="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2">
      <button v-for="tool in tools" :key="tool.command" type="button" :title="tool.label" class="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold text-gray-600 hover:bg-white hover:text-blue-700" @mousedown.prevent="run(tool.command)">
        <span :class="tool.className">{{ tool.text }}</span>
      </button>
      <span class="mx-1 h-5 w-px bg-gray-300"></span>
      <button type="button" title="Add link" class="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-gray-600 hover:bg-white hover:text-blue-700" @mousedown.prevent="addLink"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></svg>Link</button>
      <button type="button" title="Clear formatting" class="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-gray-500 hover:bg-white hover:text-red-600" @mousedown.prevent="run('removeFormat')"><svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="m4 20 16-16M9 4h8l-4 10"/></svg>Clear</button>
    </div>
    <div ref="editor" contenteditable="true" role="textbox" aria-multiline="true" :data-placeholder="placeholder" class="rich-editor min-h-40 px-3 py-3 text-sm leading-6 text-gray-800 outline-none" @input="emitValue" @blur="emitValue"></div>
  </div>
</template>

<script setup>
const props = defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: 'Enter formatted text...' } })
const emit = defineEmits(['update:modelValue'])
const editor = ref(null)
const tools = [
  { command: 'bold', label: 'Bold', text: 'B', className: 'font-bold' },
  { command: 'italic', label: 'Italic', text: 'I', className: 'italic' },
  { command: 'underline', label: 'Underline', text: 'U', className: 'underline' },
  { command: 'insertUnorderedList', label: 'Bulleted list', text: '• List', className: '' },
  { command: 'insertOrderedList', label: 'Numbered list', text: '1. List', className: '' },
  { command: 'justifyLeft', label: 'Align left', text: 'Left', className: '' },
  { command: 'justifyCenter', label: 'Align center', text: 'Center', className: '' },
  { command: 'justifyRight', label: 'Align right', text: 'Right', className: '' },
]

function sanitizeHtml(value) {
  const template = document.createElement('template')
  template.innerHTML = String(value || '')
  template.content.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove())
  template.content.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || (['href', 'src'].includes(attribute.name) && /^javascript:/i.test(attribute.value))) node.removeAttribute(attribute.name)
    }
  })
  return template.innerHTML.trim()
}
function sanitizedHtml() { return sanitizeHtml(editor.value?.innerHTML) }
function emitValue() { emit('update:modelValue', sanitizedHtml()) }
function run(command) { editor.value?.focus(); document.execCommand(command, false); emitValue() }
function addLink() { editor.value?.focus(); const url = window.prompt('Enter a link URL'); if (url && /^https?:\/\//i.test(url)) document.execCommand('createLink', false, url); emitValue() }
onMounted(() => { if (editor.value) editor.value.innerHTML = sanitizeHtml(props.modelValue) })
watch(() => props.modelValue, value => { const clean = sanitizeHtml(value); if (editor.value && document.activeElement !== editor.value && editor.value.innerHTML !== clean) editor.value.innerHTML = clean })
</script>

<style scoped>
.rich-editor:empty::before { content: attr(data-placeholder); color: #cbd5e1; pointer-events: none; }
.rich-editor :deep(ul) { list-style: disc; margin-left: 1.25rem; }
.rich-editor :deep(ol) { list-style: decimal; margin-left: 1.25rem; }
.rich-editor :deep(a) { color: #2563eb; text-decoration: underline; }
</style>
