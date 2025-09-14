<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { LayoutKey } from '#build/types/layouts'  // <-- тип имён лэйаутов
const route = useRoute()

const layout = computed<false | LayoutKey>(() =>
  route.path === '/auth' ? false : 'default'
)
</script>


