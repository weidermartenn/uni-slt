// useUniverWorker.ts
import { useSheetStore } from '~/stores/sheet-store-optimized'

export function useUniverWorker() {
  const sheetStore = useSheetStore()

  const batchQueue = ref<Array<{
    type: 'create' | 'update'
    data: any
    row: number
    listName: string
    timestamp: number
  }>>([])

  const batchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)
  const BATCH_DELAY = 300
  const MAX_BATCH_SIZE = 20

  // 🔁 Новый метод: проверка, изменились ли данные по сравнению с текущими
  const isDtoChanged = (existing: any, incoming: any): boolean => {
    if (!existing) return true
    for (const key of Object.keys(incoming)) {
      const newVal = String(incoming[key] ?? '').trim()
      const oldVal = String(existing[key] ?? '').trim()
      if (newVal !== oldVal) return true
    }
    return false
  }

  const queueBatchOperation = (
    type: 'create' | 'update',
    data: any,
    row: number,
    listName: string
  ) => {
    // 🧠 Проверка на дубликат с текущими данными
    if (type === 'update') {
      const current = sheetStore.records[listName]?.find(r => r.id === data.id)
      if (!isDtoChanged(current, data)) return // ❌ не изменилось — не добавляем
    }

    const last = batchQueue.value.at(-1)
    if (
      last &&
      last.type === type &&
      last.row === row &&
      last.listName === listName &&
      JSON.stringify(last.data) === JSON.stringify(data)
    ) {
      return // 🔁 дубликат — не добавляем
    }

    batchQueue.value.push({
      type,
      data,
      row,
      listName,
      timestamp: Date.now()
    })

    if (batchTimeout.value) clearTimeout(batchTimeout.value)

    if (batchQueue.value.length >= MAX_BATCH_SIZE) {
      processBatch()
      return
    }

    batchTimeout.value = setTimeout(() => {
      processBatch()
    }, BATCH_DELAY)
  }

  const processBatch = async () => {
    if (batchQueue.value.length === 0) return

    const currentBatch = [...batchQueue.value]
    batchQueue.value = []
    batchTimeout.value = null

    const grouped = currentBatch.reduce((acc, op) => {
      const key = `${op.listName}_${op.type}`
      if (!acc[key]) acc[key] = []
      acc[key].push(op)
      return acc
    }, {} as Record<string, typeof currentBatch>)

    try {
      for (const [key, ops] of Object.entries(grouped)) {
        const [listName, type] = key.split('_') as [string, 'create' | 'update']

        if (type === 'create') {
          const createDtos = ops.map(op => op.data)
          await sheetStore.addRecords(createDtos)
        }

        if (type === 'update') {
          // 🧠 Убираем дубликаты и неизменившиеся DTO
          const uniqueMap = new Map<number, any>()
          for (const op of ops) {
            const id = Number(op.data?.id)
            if (!Number.isFinite(id)) continue
            const current = sheetStore.records[op.listName]?.find(r => r.id === id)
            if (isDtoChanged(current, op.data)) {
              uniqueMap.set(id, op.data)
            }
          }
          const finalUpdates = Array.from(uniqueMap.values())
          if (finalUpdates.length > 0) {
            await sheetStore.updateRecords(finalUpdates)
          }
        }
      }
    } catch (e) {
      console.error('[UniverWorker] Ошибка обработки батча:', e)
    }
  }

  const highlightRow = (row: number) => {
    try {
      const univerAPI = (window as any).univerAPI
      const wb = univerAPI?.getActiveWorkbook()
      const aws = wb?.getActiveSheet()
      const range = aws?.getRange(row, 0, 1, 28)
      range?.useThemeStyle?.('light-green')
      const theme = range?.getUsedThemeStyle?.()
      setTimeout(() => {
        try {
          range?.removeThemeStyle?.(theme)
        } catch {}
      }, 1000)
    } catch {}
  }

  const handleRowChangeOptimized = async (
    row: number,
    col: number,
    rowVals: any[],
    listName: string,
    idStr: string,
    buildSR: (rowVals: any[], listName: string, id?: number) => any,
    maskDtoForManager?: (
      dto: any,
      listName: string,
      row: number,
      store: any,
      prevRec?: any
    ) => any
  ) => {
    if (!idStr) {
      const createDto = buildSR(rowVals, listName)
      queueBatchOperation('create', createDto, row, listName)
      try {
        sheetStore.anchorCreateRow(listName, row)
      } catch {}
    } else {
      const idNum = Number(idStr)
      if (Number.isFinite(idNum) && idNum > 0) {
        let updateDto = { ...buildSR(rowVals, listName, idNum), id: idNum }

        if (maskDtoForManager) {
          const arr = sheetStore.records?.[listName]
          const prevRec = Array.isArray(arr) ? arr[row - 1] : undefined
          updateDto = maskDtoForManager(updateDto, listName, row, sheetStore, prevRec)
        }

        queueBatchOperation('update', updateDto, row, listName)
      }
    }
  }

  const cleanup = () => {
    if (batchTimeout.value) {
      clearTimeout(batchTimeout.value)
      batchTimeout.value = null
    }
    if (batchQueue.value.length > 0) {
      processBatch()
    }
  }

  return {
    handleRowChangeOptimized,
    queueBatchOperation,
    processBatch,
    cleanup
  }
}
