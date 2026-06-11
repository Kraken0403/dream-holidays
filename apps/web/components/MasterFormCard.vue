<template>
  <div class="card card-pad">
    <div class="page-head" style="margin-bottom: 12px;">
      <div>
        <h2 style="margin:0; font-size:18px;">{{ title }}</h2>
        <p v-if="subtitle" class="sub">{{ subtitle }}</p>
      </div>
    </div>
    <slot />
  </div>
</template>
<script setup>
defineProps({ title: String, subtitle: String })
</script>
