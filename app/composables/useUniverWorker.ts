import { useSheetStore } from '~/stores/sheet-store-optimized'

export function useUniverWorker() {
  console.log('🔄 [useUniverWorker] инициализация');
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

  const isDtoChanged = (existing: any, incoming: any): boolean => {
    if (!existing) {
      console.log('🔍 [useUniverWorker.isDtoChanged] существующей записи нет - данные изменены');
      return true;
    }
    for (const key of Object.keys(incoming)) {
      const newVal = String(incoming[key] ?? '').trim()
      const oldVal = String(existing[key] ?? '').trim()
      if (newVal !== oldVal) {
        console.log(`🔍 [useUniverWorker.isDtoChanged] изменение в поле "${key}": "${oldVal}" -> "${newVal}"`);
        return true;
      }
    }
    console.log('🔍 [useUniverWorker.isDtoChanged] данные не изменились');
    return false;
  }

  const queueBatchOperation = (
    type: 'create' | 'update',
    data: any,
    row: number,
    listName: string
  ) => {
    console.log('📥 [useUniverWorker.queueBatchOperation] добавление в очередь:', { type, row, listName, data });
    
    const last = batchQueue.value.at(-1)
    if (
      last &&
      last.type === type &&
      last.row === row &&
      last.listName === listName &&
      JSON.stringify(last.data) === JSON.stringify(data)
    ) {
      console.log('🔁 [useUniverWorker.queueBatchOperation] дубликат операции - пропускаем');
      return;
    }

    batchQueue.value.push({
      type,
      data,
      row,
      listName,
      timestamp: Date.now()
    })

    console.log(`📊 [useUniverWorker.queueBatchOperation] размер очереди: ${batchQueue.value.length}`);

    if (batchTimeout.value) {
      console.log('⏰ [useUniverWorker.queueBatchOperation] очистка предыдущего таймера');
      clearTimeout(batchTimeout.value);
    }

    if (batchQueue.value.length >= MAX_BATCH_SIZE) {
      console.log('🚀 [useUniverWorker.queueBatchOperation] достигнут максимальный размер - немедленная обработка');
      processBatch();
      return;
    }

    console.log(`⏳ [useUniverWorker.queueBatchOperation] установка таймера на ${BATCH_DELAY}ms`);
    batchTimeout.value = setTimeout(() => {
      console.log('⏰ [useUniverWorker.queueBatchOperation] таймер сработал - обработка батча');
      processBatch();
    }, BATCH_DELAY)
  }

  const processBatch = async () => {
    console.log('🔄 [useUniverWorker.processBatch] начало обработки батча');
    if (batchQueue.value.length === 0) {
      console.log('ℹ️ [useUniverWorker.processBatch] очередь пуста');
      return;
    }

    const currentBatch = [...batchQueue.value];
    batchQueue.value = [];
    batchTimeout.value = null;
    
    console.log(`📦 [useUniverWorker.processBatch] обработка ${currentBatch.length} операций`);

    const grouped = currentBatch.reduce((acc, op) => {
      const key = `${op.listName}_${op.type}`
      if (!acc[key]) acc[key] = []
      acc[key].push(op)
      return acc
    }, {} as Record<string, typeof currentBatch>)

    console.log('📊 [useUniverWorker.processBatch] сгруппированные операции:', Object.keys(grouped));

    try {
      for (const [key, ops] of Object.entries(grouped)) {
        const [listName, type] = key.split('_') as [string, 'create' | 'update']
        console.log(`🔄 [useUniverWorker.processBatch] обработка группы: ${key}, количество: ${ops.length}`);

        if (type === 'create') {
          console.log('➕ [useUniverWorker.processBatch] CREATE операции');
          const createDtos = ops.map(op => op.data);
          console.log('📝 [useUniverWorker.processBatch] CREATE DTOs:', createDtos);
          // ЗАКОММЕНТИРОВАНО: await sheetStore.addRecords(createDtos)
          console.log('✅ [useUniverWorker.processBatch] CREATE выполнено (закомментировано)');
        }

        if (type === 'update') {
          console.log('✏️ [useUniverWorker.processBatch] UPDATE операции');
          const uniqueMap = new Map<number, any>();
          for (const op of ops) {
            const id = Number(op.data?.id);
            if (!Number.isFinite(id)) {
              console.warn('⚠️ [useUniverWorker.processBatch] UPDATE: некорректный ID:', op.data?.id);
              continue;
            }
            const current = sheetStore.records[op.listName]?.find(r => r.id === id);
            if (isDtoChanged(current, op.data)) {
              console.log(`🔄 [useUniverWorker.processBatch] UPDATE: данные изменились для ID ${id}`);
              uniqueMap.set(id, op.data);
            } else {
              console.log(`🔁 [useUniverWorker.processBatch] UPDATE: данные не изменились для ID ${id}`);
            }
          }
          const finalUpdates = Array.from(uniqueMap.values());
          console.log(`📝 [useUniverWorker.processBatch] финальные UPDATEs: ${finalUpdates.length}`);
          if (finalUpdates.length > 0) {
            // ЗАКОММЕНТИРОВАНО: await sheetStore.updateRecords(finalUpdates)
            console.log('✅ [useUniverWorker.processBatch] UPDATE выполнено (закомментировано)');
          } else {
            console.log('ℹ️ [useUniverWorker.processBatch] нет изменений для UPDATE');
          }
        }
      }
    } catch (e) {
      console.error('❌ [useUniverWorker.processBatch] ошибка обработки батча:', e);
    } finally {
      console.log('✅ [useUniverWorker.processBatch] обработка батча завершена');
    }
  }

  const handleRowChangeOptimized = async (
    row: number,
    col: number,
    rowVals: any[],
    listName: string,
    idStr: string,
    buildSR: (rowVals: any[], listName: string, id?: number) => any
  ) => {
    console.log('🔄 [useUniverWorker.handleRowChangeOptimized] обработка изменения строки:', {
      row, col, listName, idStr, rowVals
    });

    if (!idStr) {
      console.log('➕ [useUniverWorker.handleRowChangeOptimized] CREATE новая запись');
      const createDto = buildSR(rowVals, listName);
      console.log('📝 [useUniverWorker.handleRowChangeOptimized] CREATE DTO:', createDto);
      queueBatchOperation('create', createDto, row, listName);
    } else {
      const idNum = Number(idStr);
      if (Number.isFinite(idNum) && idNum > 0) {
        console.log(`✏️ [useUniverWorker.handleRowChangeOptimized] UPDATE существующей записи ID: ${idNum}`);
        let updateDto = { ...buildSR(rowVals, listName, idNum), id: idNum };
        console.log('📝 [useUniverWorker.handleRowChangeOptimized] UPDATE DTO:', updateDto);
        queueBatchOperation('update', updateDto, row, listName);
      } else {
        console.warn('⚠️ [useUniverWorker.handleRowChangeOptimized] некорректный ID:', idStr);
      }
    }
  }

  const cleanup = () => {
    console.log('🧹 [useUniverWorker.cleanup] очистка');
    if (batchTimeout.value) {
      console.log('⏰ [useUniverWorker.cleanup] очистка таймера');
      clearTimeout(batchTimeout.value);
      batchTimeout.value = null;
    }
    if (batchQueue.value.length > 0) {
      console.log(`📦 [useUniverWorker.cleanup] принудительная обработка ${batchQueue.value.length} операций`);
      processBatch();
    }
  }

  return {
    handleRowChangeOptimized,
    queueBatchOperation,
    processBatch,
    cleanup
  }
}