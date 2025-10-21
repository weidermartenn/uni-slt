<template>
  <UApp>
    <div class="relative w-full h-[90vh]">
      <div class="absolute flex items-center gap-10 -top-13 right-10">
        <div v-show="deleteState.pending" class="v-row items-center p-2 rounded-md bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
          <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin" />
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Удаление данных</p>
        </div>
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
import type { FUniver } from '@univerjs/core/facade'
import { useToast } from '#imports'
import { useEmployeeStore } from '~/stores/employee-store'
import { useSheetStore } from '~/stores/sheet-store'
import { useUniverStore } from '~/stores/univer-store'
import { rpcClient } from '~/composables/univerWorkerClient'

definePageMeta({ ssr: false })
useHead({ title: 'СЛТ Транспортный учет' })

const toast = useToast()
const api = ref<FUniver>()
const records = ref<Record<string, any[]>>({})

const DELETE_CONFIRM_TIMEOUT = 5000
const LONG_LOAD_TIMEOUT = 7000

const deleteState = reactive({
  pending: false,
  rows: [] as number[],
  timeout: null as number | null,
})

const univerStore = useUniverStore()
const showBusy = ref(false)
const showLongLoadMessage = ref(false)
let longLoadTimeout: NodeJS.Timeout | null = null

function getSelectionData() {
  const wb = api.value?.getActiveWorkbook?.()
  const ws = wb?.getActiveSheet?.()
  const ar = ws?.getSelection?.()?.getActiveRange?.()
  if (!ws || !ar) return null

  // @ts-ignore
  const start0 = Math.max(1, ar?._range?.startRow ?? 1)
  // @ts-ignore
  const end0 = Math.max(1, ar?._range?.endRow ?? 1)

  const start1 = start0 + 1
  const end1 = end0 + 1

  const range = ws.getRange(`A${start1}:AB${end1}`)
  range?.activate?.()

  const values = range?.getValues?.() || []

  return { ws, start0, end0, start1, end1, range, values }
}

async function onDeleteClick() {
  const selection = getSelectionData()
  if (!selection) {
    toast.add({ title: 'Не выбрана область', color: 'warning', icon: 'i-lucide-alert-triangle' })
    return
  }

  const { start1, end1, range, values } = selection

  // Сохраняем ids ДО обнуления UI
  const ID_COL_INDEX = 27
  const ids = (values as any[][])
    .map((row) => Number(row?.[ID_COL_INDEX]))
    .filter((id) => Number.isFinite(id) && id > 0)

  if (!deleteState.pending) {
    deleteState.pending = true
    deleteState.rows = Array.from({ length: end1 - start1 + 1 }, (_, i) => start1 + i)

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

  // Очищаем UI
  if (ids.length > 0) {
    const rows = end1 - start1 + 1
    const empty = Array.from({ length: rows }, () =>
      Array.from({ length: 28 }, () => ({ v: '' }))
    )

    try {
      const { getLifeCycleState } = await import('~/composables/lifecycle')
      const { rendered } = getLifeCycleState(api.value!)

      if (rendered?.value) {
        univerStore.beginQuiet()
        range.setValues?.(empty)
        univerStore.endQuiet()
      } else {
        range.setValues?.(empty)
      }
    } catch (e) {
      console.error(e)
    }
  }

  await nextTick()

  // Если нет ID — ничего не удаляем на сервере
  if (ids.length === 0) {
    deleteState.pending = false
    deleteState.rows = []
    toast.add({
      title: 'Пустое удаление',
      description: 'В выделении не найдено валидных ID.',
      color: 'neutral',
      icon: 'i-lucide-info'
    })
    return
  }

  try {
    showBusy.value = true
    console.log(`[Delete] Начало удаления ${ids.length} записей`)

    const startTime = performance.now()

    // УДАЛЕНИЕ В ОСНОВНОМ ПОТОКЕ - синхронно с UI
    await useSheetStore().deleteRecords(ids)

    toast.add({
      title: 'Записи удалены',
      description: `Всего удалено: ${ids.length}`,
      color: 'success',
      icon: 'i-lucide-check'
    })

    const endTime = performance.now()
    console.log(`[Delete] Конец удаления. Время: ${endTime - startTime} ms`)
  } catch (error) {
    console.error('[Delete] Error: ', error)
    toast.add({
      title: 'Ошибка удаления',
      description: 'Не удалось удалить записи. Попробуйте еще раз.',
      color: 'error',
      icon: 'i-lucide-alert-triangle'
    })
  } finally {
    showBusy.value = false
    deleteState.pending = false
    deleteState.rows = []
  }
}

onMounted(async () => {
  const { initUniver } = await import('~/composables/initUniver')
  const { getLifeCycleState } = await import('~/composables/lifecycle')
  const store = useSheetStore()
  const employeeStore = useEmployeeStore()

  univerStore.setUiLoading(true)

  longLoadTimeout = setTimeout(() => {
    if (univerStore.uiLoading) showLongLoadMessage.value = true
  }, LONG_LOAD_TIMEOUT)

  await store.fetchRecords()
  await employeeStore.fetchEmployees()
  records.value = store.records

  console.log('🔁 Инициализация', records.value)

  api.value = await initUniver(records.value)

  try {
    const { useTheme } = await import('~/composables/useTheme')
    const { darkTheme } = useTheme()
    api.value?.toggleDarkMode?.(darkTheme.value)
  } catch {}

  const { rendered } = getLifeCycleState(api.value!)
  const fontsReady = ref(false)

  if (typeof document !== 'undefined' && 'fonts' in document) {
    ;(document as any).fonts.ready.then(() => {
      fontsReady.value = true
    }).catch(() => {
      fontsReady.value = true
    })
  } else {
    fontsReady.value = true
  }

  const dataLoaded = ref(true)
    
  watch([rendered, dataLoaded, fontsReady], ([r, d, f]) => {
    if (r && d && f) {
      univerStore.setUiLoading(false)
      univerStore.setUiReady(true)
      if (longLoadTimeout) {
        clearTimeout(longLoadTimeout)
        longLoadTimeout = null
      }
      showLongLoadMessage.value = false
    } else {
      univerStore.setUiLoading(true)
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    if (longLoadTimeout) {
      clearTimeout(longLoadTimeout)
      longLoadTimeout = null
    }
  })
})
</script>