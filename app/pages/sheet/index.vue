<template>
  <UApp>
    <div class="relative w-full h-[90vh]">
      <div class="absolute flex items-center gap-10 -top-13 right-10">
        <div v-show="deleteState.pending" class="v-row items-center p-2 rounded-md bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
          <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin" />
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Удаление данных</p>
        </div>
        <UButton
          v-if="hasSearchBill"
          color="info"
          variant="soft"
          icon="i-lucide-arrow-left"
          @click="resetToOriginalTable"
        >
          Вернуться к исходной таблице
        </UButton>
        <UButton
          :color="deleteState.pending ? 'error' : 'primary'"
          :variant="deleteState.pending ? 'solid' : 'soft'"
          icon="i-lucide-trash-2"
          @click="onDeleteClick"
        >
          {{ deleteState.pending ? 'Подтвердите удаление' : 'Удалить строки' }}
        </UButton>
      </div>

      <!-- Состояние загрузки -->
      <div v-if="loading" class="w-full h-full v-col justify-center items-center">
        <div class="text-center font-medium text-xl v-col justify-center items-center">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
          <span>Загрузка данных...</span>

          <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: `${loadProgress}%`}"
            ></div>
          </div>

          <div class="text-sm text-gray-600 dark:text-zinc-100">
            <span v-if="loadState.currentChunk > 0">
              Загружено: {{ loadState.currentChunk }} из {{ loadState.totalChunks  }}
            </span>
            <span v-else>Подготовка к загрузке...</span>
          </div>

          <div class="text-xs text-gray-500 dark:text-zinc-200 mt-2 ">
            <div v-if="loadState.currentStep">{{ loadState.currentStep }}</div>
            <div v-if="loadState.estimatedTime">Примерное время: {{ loadState.estimatedTime }}</div>
          </div>
        </div>
      </div>

      <!-- Состояние ошибки -->
      <div v-else-if="error" class="w-full h-full v-col justify-center items-center">
        <div class="text-center font-medium text-xl v-col justify-center items-center">
          <UIcon name="i-lucide-alert-circle" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <span>Ошибка загрузки данных<br>Проверьте подключение к интернету</span>
          <UButton
            variant="outline"
            class="mt-4 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
            @click="retryLoadData"
          >
            <UIcon name="i-lucide-refresh-ccw" class="h-4 w-4 mr-2" />
            Попробовать снова
          </UButton>
        </div>
      </div>

      <!-- Состояние "нет данных" -->
      <div v-else-if="!hasRecords" class="w-full h-full v-col justify-center items-center">
        <div class="text-center font-medium text-xl v-col justify-center items-center">
          <img src="assets/without-connect.png" class="h-40 w-40">
          <span>Нет данных для отображения ТУ</span>
        </div>
      </div>
      
      <!-- Успешная загрузка с данными -->
      <div v-else id="univer" class="w-full h-full"></div>

      <!-- Сообщение о долгой загрузке -->
      <div v-if="showLongLoadMessage && loading" class="fixed bottom-4 right-4 p-4 bg-orange-100 border border-orange-300 rounded-lg">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-info" class="h-5 w-5 text-orange-600" />
          <span class="text-sm text-orange-800">Загрузка занимает больше времени чем обычно...</span>
        </div>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { FUniver } from '@univerjs/core/facade'
import { useToast } from '#imports'
import { useEmployeeStore } from '~/stores/employee-store'
import { useSheetStore } from '~/stores/sheet-store'
import { useUniverStore } from '~/stores/univer-store'

definePageMeta({ ssr: false })
useHead({ title: 'СЛТ Транспортный учет' })

const toast = useToast()
const api = ref<FUniver>()
const records = ref<Record<string, any[]>>({})

const DELETE_CONFIRM_TIMEOUT = 5000
const LONG_LOAD_TIMEOUT = 7000

// Состояния загрузки
const loading = ref(true)
const error = ref(false)
const hasRecords = ref(false)
const loadProgress = ref(0)
const hasSearchBill = computed(() => !!route.query.searchBill)

const loadState = reactive({
  currentChunk: 0, 
  totalChunks: 0,
  currentStep: '',
  estimatedTime: '',
  startTime: 0
})

const route = useRoute() 

const searchBillByValues = async (bill: string) => {
  if (!api.value) return 

  try {
    const wb = api.value.getActiveWorkbook() 
    if (!wb) return 

    const sheets = wb.getSheets()

    for (const sheet of sheets) {
      const sheetName = sheet.getSheetName()

      wb.setActiveSheet(sheet.getSheetId())
      await new Promise(r => setTimeout(r, 100))

      const searchRange = sheet.getRange('K1:K3000')

      try {
        const values = searchRange.getValues() 
        for (let r = 0; r < values.length; r++) {
          const cellValue = values[r][0];

          if (cellValue && cellValue.toString().trim() === bill.toString()) {
            const cellAddress = `K${r + 1}`;
            const foundCell = sheet.getRange(cellAddress)
            const row = foundCell.getRow()
            const column = foundCell.getColumn()
            sheet.scrollToCell(row - 5, column - 5)
            foundCell.activate()

            return {
              sheet: sheet,
              cell: foundCell,
              sheetName: sheetName,
              address: cellAddress,
              row: r + 1
            }
          }
        }
      } catch { }
    }
  } catch { }
}

const resetToOriginalTable = () => {
  navigateTo('/sheet')
}

const deleteState = reactive({
  pending: false,
  rows: [] as number[],
  timeout: null as number | null,
})

const univerStore = useUniverStore()
const showBusy = ref(false)
const showLongLoadMessage = ref(false)
let longLoadTimeout: NodeJS.Timeout | null = null

const updateProgress = (chunk: number, total: number, step?: string) => {
  loadState.currentChunk = chunk 
  loadState.totalChunks = total 
  if (step) loadState.currentStep = step

  loadProgress.value = total > 0 ? Math.round((chunk / total) * 100) : 0 

  if (loadState.startTime && chunk > 0) {
    const elapsed = Date.now() - loadState.startTime 
    const timePerChunk = elapsed / chunk 
    const remainingChunks = total - chunk 
    const remainingTime = Math.round((timePerChunk * remainingChunks) / 1000)

    if (remainingTime < 60) {
      loadState.estimatedTime = `${remainingTime} сек`
    } else {
      loadState.estimatedTime = `${Math.round(remainingTime / 60)} мин`
    }
  }
}

// Проверка наличия данных (обновленная логика)
const checkRecords = () => {
  const store = useSheetStore()
  const recordsData = store.records
  
  // Проверяем, что records - объект и в нем есть хотя бы один ключ (месяц)
  // Даже если массивы пустые, это считается наличием данных для отображения таблиц
  if (recordsData && typeof recordsData === 'object' && Object.keys(recordsData).length > 0) {
    hasRecords.value = true
  } else {
    hasRecords.value = false
  }
}

// Повторная загрузка данных
const retryLoadData = async () => {
  loading.value = true
  error.value = false
  await loadData()
}

// Имитация загрузки чанков (замените на реальную логику)
const simulateChunkedLoading = async () => {
  // Предположим, что у нас есть 5 чанков для загрузки
  const totalChunks = 5
  loadState.startTime = Date.now()
  loadState.totalChunks = totalChunks
  
  for (let i = 1; i <= totalChunks; i++) {
    // Имитация задержки между чанками
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    // Обновляем прогресс
    updateProgress(i, totalChunks, `Загрузка чанка ${i} из ${totalChunks}`)
    
    // Здесь будет реальная загрузка данных для каждого чанка
    // Например: await loadChunk(i)
  }
}

// Основная функция загрузки данных
const loadData = async () => {
  try {
    const store = useSheetStore()
    const employeeStore = useEmployeeStore()

    // Сбрасываем состояния
    loading.value = true
    error.value = false
    loadProgress.value = 0 
    loadState.currentChunk = 0
    loadState.totalChunks = 0
    loadState.currentStep = 'Инициализация загрузки'
    loadState.startTime = Date.now()

    await simulateChunkedLoading()
    
    // Загружаем данные
    await Promise.all([
      store.fetchRecords(),
      employeeStore.fetchEmployees()
    ])
    
    records.value = store.records
    checkRecords()
    
  } catch (err) {
    console.error('Ошибка загрузки данных:', err)
    error.value = true
    hasRecords.value = false
  } finally {
    loading.value = false
  }
}

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

  univerStore.setUiLoading(true)

  longLoadTimeout = setTimeout(() => {
    if (loading.value) showLongLoadMessage.value = true
  }, LONG_LOAD_TIMEOUT)

  // Загружаем данные
  await loadData()

  // Инициализируем Univer только если есть данные (включая пустые массивы по месяцам)
  if (hasRecords.value) {
    try {
      api.value = await initUniver(records.value)

      try {
        const { useTheme } = await import('~/composables/useTheme')
        const { darkTheme } = useTheme()
        api.value?.toggleDarkMode?.(darkTheme.value)
      } catch {}

      const { rendered } = getLifeCycleState(api.value!)
      const fontsReady = ref(false)

      const bill = route.query.searchBill

      if (bill) {
        setTimeout(async () => {
          if (!api.value) return

          let result = await searchBillByValues(bill.toString())
          
          if (result) {
            toast.add({
              title: 'Номер счета найден',
              description: `Счет найден по адресу: ${result.address}`,
              color: 'success',
              icon: 'i-lucide-check'
            })

            const wb = api.value.getActiveWorkbook()
            const ws = wb?.getActiveSheet()
            const themes = wb?.getRegisteredRangeThemes()

            const range = ws?.getRange(result.address)
            range?.useThemeStyle('light-green')

            const currentTheme = range?.getUsedThemeStyle() as string
            setTimeout(() => {
              range?.removeThemeStyle(currentTheme)
            }, 500)
          }
        })
      }

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
    } catch (err) {
      console.error('Ошибка инициализации Univer:', err)
      error.value = true
    }
  }

  onBeforeUnmount(() => {
    if (longLoadTimeout) {
      clearTimeout(longLoadTimeout)
      longLoadTimeout = null
    }
  })
})
</script>