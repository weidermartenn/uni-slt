<template>
  <UApp>
    <div class="relative w-full h-[90vh]">
      <!-- <div
        v-show="univerStore.uiLoading"
        class="absolute inset-0 flex items-center justify-center bg-white/90 dark:bg-zinc-900 z-10"
      >
        <div class="text-center">
          <UIcon name="i-lucide-loader-pinwheel" class="w-10 h-10 animate-spin text-zinc-900 dark:text-zinc-100" />
          <p class="mt-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">Загрузка данных таблицы</p>
          
          <!-- Сообщение о долгой загрузке -->
          <!-- <div v-if="showLongLoadMessage" class="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-md max-w-md mx-auto">
            <p class="text-amber-800 dark:text-amber-200 text-sm">
              Страница долго загружается. Выключите VPN/прокси и перезагрузите страницу.
            </p>
          </div>
        </div>
      </div> --> 

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
const LONG_LOAD_TIMEOUT = 7000 // 7 секунд

const deleteState = reactive<{
  pending: boolean
  rows: number[]
  timeout?: number | null
}>({
  pending: false,
  rows: [],
  timeout: null
})

const univerStore = useUniverStore()
const showBusy = ref(false)
const showLongLoadMessage = ref(false)
let longLoadTimeout: NodeJS.Timeout | null = null

// 🧠 Получение выделения и данных
function getSelectionData() {
  const wb = api.value?.getActiveWorkbook?.()
  const ws = wb?.getActiveSheet?.()
  const ar = ws?.getSelection?.()?.getActiveRange?.()
  if (!ws || !ar) return null

  const start0 = Math.max(1, (ar?._range?.startRow ?? 1))
  const end0 = Math.max(1, (ar?._range?.endRow ?? 1))

  const start1 = start0 + 1
  const end1 = end0 + 1

  const range = ws.getRange(`A${start1}:AB${end1}`)
  range?.activate?.()

  const values = range?.getValues?.() || []

  return { ws, start0, end0, start1, end1, range, values }
}

// 🗑️ Обработка удаления
async function onDeleteClick() {
  const selection = getSelectionData()
  if (!selection) {
    toast.add({ title: 'Не выбрана область', color: 'warning', icon: 'i-lucide-alert-triangle' })
    return
  }

  const { start1, end1, ws, range } = selection

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

  const sel = getSelectionData()
  if (!sel) {
    deleteState.pending = false
    deleteState.rows = []
    return
  }

  const ID_COL_INDEX = 27
  const ids = (sel.values as any[][])
    .map((row) => Number(row?.[ID_COL_INDEX]))
    .filter((id) => Number.isFinite(id) && id > 0)

  if (ids.length > 0) {
    const rows = sel.end1 - sel.start1 + 1
    const cols = 28
    const empty = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ v: '' }))
    )

    try {
      const { getLifeCycleState } = await import('~/composables/lifecycle')
      const { rendered } = getLifeCycleState(api.value!)

      if (rendered?.value) {
        try {
          univerStore.beginQuiet()
          sel.range.setValues?.(empty)
        } finally {
          univerStore.endQuiet()
        }
      } else {
        sel.range.setValues?.(empty)
      }
    } catch (e) {
      console.error(e)
    }
  }

  await nextTick()

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
    const store = useSheetStore()
    showBusy.value = true

    console.log(`[Delete] Начало удаления ${ids.length} записей`)
    const startTime = performance.now()

    const result = await rpcClient.call('deleteRecords', { ids })

    if (result?.success) {
      toast.add({
        title: 'Записи удалены',
        description: `Всего удалено: ${ids.length}`,
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      throw new Error(result?.error || 'Worker error')
    }

    const endTime = performance.now()
    console.log(`[Delete] Конец удаления. Время: ${endTime - startTime} ms`)
  } catch (e) {
    console.error('[Delete] Error: ', e)
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

// 🔁 Инициализация
onMounted(async () => {
  const { initUniver } = await import('~/composables/initUniver')
  const { getLifeCycleState } = await import('~/composables/lifecycle')
  const store = useSheetStore()
  const employeeStore = useEmployeeStore()

  univerStore.setUiLoading(true)

  // Запускаем таймер для показа сообщения о долгой загрузке
  longLoadTimeout = setTimeout(() => {
    if (univerStore.uiLoading) {
      showLongLoadMessage.value = true
    }
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

  watch(
    [rendered, dataLoaded, fontsReady],
    ([r, d, f]) => {
      if (r && d && f) {
        univerStore.setUiLoading(false)
        univerStore.setUiReady(true)
        // Очищаем таймер при успешной загрузке
        if (longLoadTimeout) {
          clearTimeout(longLoadTimeout)
          longLoadTimeout = null
        }
        showLongLoadMessage.value = false
      } else {
        univerStore.setUiLoading(true)
      }
    },
    { immediate: true }
  )

  const { cleanup } = useUniverWorker()
  onBeforeUnmount(() => {
    // Очищаем таймер при размонтировании компонента
    if (longLoadTimeout) {
      clearTimeout(longLoadTimeout)
      longLoadTimeout = null
    }
    cleanup?.()
  })
})
</script>