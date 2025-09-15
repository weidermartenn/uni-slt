<template>
  <UApp>
    <div class="relative w-full h-[90vh]">
      <div
        v-show="showFallback"
        class="absolute inset-0 flex items-center justify-center bg-white/90 z-10"
      >
        <div class="text-center">
          <UIcon name="i-lucide-loader-pinwheel" class="w-10 h-10 animate-spin" />
          <p class="mt-2 text-lg font-medium">Загрузка данных таблицы</p>
        </div>
      </div>
      <div id="univer" class="w-full h-full"></div>
    </div>
  </UApp> 
</template>

<script setup lang="ts">
import type { FUniver } from '@univerjs/presets';
import { useEmployeeStore } from '~/stores/employee-store';
import { useSheetStore } from '~/stores/sheet-store';

definePageMeta({ ssr: false });
useHead({
  title: 'СЛТ Транспортный учет'
})

const showFallback = ref(true);

const api = ref<FUniver>();
const records = ref<Record<string, any[]>>({})

onMounted(async () => {
  const { initUniver } = await import('~/composables/initUniver');
  const { getLifeCycleState } = await import('~/composables/lifecycle');
  const sheetStore = useSheetStore();
  const employeeStore = useEmployeeStore();

  await sheetStore.fetchRecords();
  await employeeStore.fetchEmployees();
  records.value = sheetStore.records;
  const dataLoaded = ref(true);

  api.value = await initUniver(records.value);

  const { rendered } = getLifeCycleState(api.value!);

  const fontsReady = ref(false);
  if (typeof document !== 'undefined' && 'fonts' in document) {
    (document as any).fonts.ready.then(() => {
      fontsReady.value = true;
    }).catch(() => {
      fontsReady.value = true;
    });
  } else {
    fontsReady.value = true;
  }

  watch([rendered, dataLoaded, fontsReady], ([r, d, f]) => {
    if (r && d && f) showFallback.value = false;
  }, { immediate: true });
});
</script>