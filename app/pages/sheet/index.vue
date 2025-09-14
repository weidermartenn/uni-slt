<template>
  <div class="relative w-full h-[90vh]">
    <div id="univer" class="w-full h-full"></div>
  </div>
</template>

<script setup lang="ts">
import type { FUniver } from '@univerjs/presets';
import { useSheetStore } from '~/stores/sheet-store';

definePageMeta({ ssr: false });

const api = ref<FUniver>();
const records = ref<Record<string, any[]>>({})
onMounted(async () => {
  const { initUniver } = await import('~/composables/initUniver');
  const sheetStore = useSheetStore();
  sheetStore.fetchRecords();
  records.value = sheetStore.records;
  api.value = await initUniver(records.value);
});
</script>