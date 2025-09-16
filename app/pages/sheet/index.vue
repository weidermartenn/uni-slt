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

      <div class="absolute -top-13 right-10">
        <UButton
          :color="deleteState.pending ? 'error' : 'primary'"
          :variant="deleteState.pending ? 'solid' : 'soft'"
          icon="i-lucide-trash-2"
          @click="onDeleteClick"
        >
          {{ deleteState.pending ? 'Подтвердите удаление' : 'Удалить строки' }}
        </UButton>
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
const toast = useToast();

const api = ref<FUniver>();
const records = ref<Record<string, any[]>>({})

const DELETE_CONFIRM_TIMEOUT = 5000

const deleteState = reactive<{ pending: boolean; rows: number[]; timeout?: number | null }>({
  pending: false,
  rows: [],
  timeout: null,
})

function getSelectionData() {
  const wb = api.value?.getActiveWorkbook?.()
  const ws = wb?.getActiveSheet?.()
  const ar = ws?.getSelection?.()?.getActiveRange?.()
  if (!ws || !ar) return null

  const startRow = (ar?._range?.startRow ?? 0) + 1
  const endRow = (ar?._range?.endRow ?? 0) + 1

  const range = ws.getRange(`A${startRow}:AB${endRow}`)
  range?.activate?.()
  const values = range?.getValues?.() || []

  return { ws, startRow, endRow, range, values }
}

async function onDeleteClick() {
  const selection = getSelectionData()
  if (!selection) {
    return
  }

  const { startRow, endRow } = selection

  // if (startRow === 1 && endRow === 1) {
  //   toast.add({
  //     title: 'Выберите строки для удаления',
  //     color: 'error',
  //     icon: 'i-lucide-alert-circle',
  //   })
  //   return
  // }

  if (!deleteState.pending) {
    deleteState.pending = true
    deleteState.rows = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i)

    if (deleteState.timeout) clearTimeout(deleteState.timeout as number)
    deleteState.timeout = window.setTimeout(() => {
      deleteState.pending = false
      deleteState.rows = []
      deleteState.timeout = null
    }, DELETE_CONFIRM_TIMEOUT)
    return
  }

  if (deleteState.timeout) {
    clearTimeout(deleteState.timeout as number)
    deleteState.timeout = null
  }

  const sel = getSelectionData()
  if (!sel) return

  const ID_COL_INDEX = 27 // AB column (0-based)
  const ids = (sel.values as any[][])
    .map((row) => Number(row?.[ID_COL_INDEX]))
    .filter((id) => Number.isFinite(id) && id > 0)

  if (ids.length === 0) {
    deleteState.pending = false
    deleteState.rows = []
    return
  }

  try {
    const store = useSheetStore()
    await store.deleteRecords(ids)
    // очистить только значения (сохраняя стили/валидации)
    const ws = api.value?.getActiveWorkbook?.()?.getActiveSheet?.()
    if (ws) {
      for (let r = sel.startRow; r <= sel.endRow; r++) {
        for (let c = 0; c < 28; c++) {
          ws.getRange(r, c)?.setValue?.({ v: '' })
        }
      }
    }
    if (store.$state.loading === false) {
      toast.add({
        title: 'Записи успешно удалены',
        description: `Всего записей удалено: ${ids.length}`,
        color: 'success',
        icon: 'i-lucide-check',
      })
    }
  } finally {
    deleteState.pending = false
    deleteState.rows = []
  }
}

// legacy helper kept for reference, not used now
// const selection = () => {
//   const ws = api.value?.getActiveWorkbook()?.getActiveSheet();
//   const ar = ws?.getSelection()?.getActiveRange()

//   const startRow = ar?._range.startRow + 1;
//   const endRow = ar?._range.endRow + 1;
  
//   const range = ws?.getRange(`A${startRow}:AB${endRow}`)
//   range?.activate();
//   const values = range?.getValues() || [];
//   console.log(values);
// }

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