// composables/useUniverWorker.ts
import { useSheetStore } from '~/stores/sheet-store'

export function useUniverWorker() {
  const sheetStore = useSheetStore()
  
  // Очередь для батчинга операций
  const batchQueue = ref<Array<{
    type: 'create' | 'update'
    data: any
    row: number
    listName: string
    timestamp: number
  }>>([])
  
  const batchTimeout = ref<NodeJS.Timeout | null>(null)
  const BATCH_DELAY = 300 // ms
  const MAX_BATCH_SIZE = 20

  // Функция для добавления операции в очередь
  const queueBatchOperation = (
    type: 'create' | 'update', 
    data: any, 
    row: number, 
    listName: string
  ) => {
    // Добавляем операцию в очередь
    batchQueue.value.push({
      type,
      data,
      row,
      listName,
      timestamp: Date.now()
    })
    
    // Очищаем предыдущий таймер
    if (batchTimeout.value) {
      clearTimeout(batchTimeout.value)
    }
    
    // Если очередь достигла максимального размера, сразу обрабатываем
    if (batchQueue.value.length >= MAX_BATCH_SIZE) {
      processBatch()
      return
    }
    
    // Устанавливаем новый таймер для обработки батча
    batchTimeout.value = setTimeout(() => {
      processBatch()
    }, BATCH_DELAY)
  }

  // Обработка накопленного батча
  const processBatch = async () => {
    if (batchQueue.value.length === 0) return
    
    const currentBatch = [...batchQueue.value]
    batchQueue.value = []
    batchTimeout.value = null

    // Группируем операции по типу и листу
    const groupedOperations = currentBatch.reduce((acc, operation) => {
      const key = `${operation.listName}_${operation.type}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(operation)
      return acc
    }, {} as Record<string, typeof currentBatch>)

    try {
      // Обрабатываем каждую группу
      for (const [key, operations] of Object.entries(groupedOperations)) {
        const [listName, type] = key.split('_') as [string, 'create' | 'update']
        
        if (type === 'create' && operations.length > 0) {
          const createDtos = operations.map(op => op.data)
          await sheetStore.addRecords(createDtos)
          
          // Подсвечиваем созданные строки
          operations.forEach(op => {
            highlightRow(op.row)
          })
        }
        
        if (type === 'update' && operations.length > 0) {
          const updateDtos = operations.map(op => op.data)
          await sheetStore.updateRecords(updateDtos)
          
          // Подсвечиваем обновленные строки
          operations.forEach(op => {
            highlightRow(op.row)
          })
        }
      }
      
      console.log(`[UniverWorker] Обработан батч: ${currentBatch.length} операций`)
      
    } catch (error) {
      console.error('[UniverWorker] Ошибка обработки батча:', error)
      
      // В случае ошибки можно добавить логику повторной попытки
      // или уведомления пользователя
    }
  }

  // Функция подсветки строки (аналогичная существующей)
  const highlightRow = (row: number) => {
    try {
      const univerAPI = (window as any).univerAPI
      if (!univerAPI) return
      
      const wb = univerAPI.getActiveWorkbook()
      const aws = wb?.getActiveSheet()
      if (!aws) return
      
      const range = aws.getRange(row, 0, 1, 28)
      range.useThemeStyle('light-green')
      const theme = range.getUsedThemeStyle()
      
      setTimeout(() => { 
        try { 
          range.removeThemeStyle(theme) 
        } catch {} 
      }, 1000)
    } catch (error) {
      console.warn('[UniverWorker] Ошибка подсветки строки:', error)
    }
  }

  // Оптимизированный обработчик изменений строк
  const handleRowChangeOptimized = async (
    row: number, 
    col: number, 
    rowVals: any[], 
    listName: string,
    idStr: string,
    buildSR: (rowVals: any[], listName: string, id?: number) => any,
    maskDtoForManager?: (dto: any, listName: string, row: number, store: any, prevRec?: any) => any
  ) => {
    const sheetStore = useSheetStore()
    
    if (!idStr) {
      // Создание новой записи
      const createDto = buildSR(rowVals, listName)
      queueBatchOperation('create', createDto, row, listName)
      
      // Якорь для создания (если нужно)
      try {
        sheetStore.anchorCreateRow(listName, row)
      } catch {}
      
    } else {
      // Обновление существующей записи
      const idNum = Number(idStr)
      if (Number.isFinite(idNum) && idNum > 0) {
        let updateDto = { ...buildSR(rowVals, listName, idNum), id: idNum }
        
        // Применяем маскировку для менеджера если предоставлена функция
        if (maskDtoForManager) {
          const arr = (sheetStore.records as any)?.[listName]
          const prevRec = Array.isArray(arr) ? arr[row - 1] : undefined
          updateDto = maskDtoForManager(updateDto, listName, row, sheetStore, prevRec)
        }
        
        queueBatchOperation('update', updateDto, row, listName)
      }
    }
  }

  // Очистка при размонтировании
  const cleanup = () => {
    if (batchTimeout.value) {
      clearTimeout(batchTimeout.value)
      batchTimeout.value = null
    }
    
    // Обрабатываем оставшиеся операции в очереди
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