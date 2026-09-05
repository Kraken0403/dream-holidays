<template><SearchableSelect :model-value="modelValue" :options="options" value-key="name" label-key="name" :placeholder="placeholder" search-placeholder="Type a state…" :allow-all="allowAll" :all-label="allLabel" all-value="" @update:model-value="$emit('update:modelValue', $event)" /></template>
<script setup>
defineProps({ modelValue: { type: String, default: '' }, placeholder: { type: String, default: 'Select state' }, allowAll: { type: Boolean, default: false }, allLabel: { type: String, default: 'All states' } }); defineEmits(['update:modelValue'])
const names = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal']
const options = names.map((name) => ({ name }))
</script>
