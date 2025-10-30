<template>
  <h2 class="text-14pt font-bold text-white bg-gradient-to-br from-blue-500 to-blue-700 py-3 px-4 rounded mb-4 mt-6">
    <slot>{{ title }}</slot>
  </h2>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
})
</script>