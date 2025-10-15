import { useSheetStore } from "~/stores/sheet-store-optimized";

type OperationType = 'create' | 'update' | 'delete'

interface SyncOperation {
    type: OperationType
    dto?: any 
    listName: string 
    rowIndex: number 
    id?: number 
    tempId?: number 
}

const pendingOps = new Set<string>()

function getOpKey(op: SyncOperation) {
    return `${op.type}::${op.listName}::${op.id ?? op.tempId ?? op.rowIndex}`
}

export function useSyncManager() {
    console.log('🔄 [useSyncManager] инициализация');
    const store = useSheetStore() 

    const hasRecord = (listName: string, id: number) => {
        const exists = store.records[listName]?.some(r => Number(r.id) === id);
        console.log(`🔍 [useSyncManager.hasRecord] listName=${listName}, id=${id}, exists=${exists}`);
        return exists;
    }

    const perform = async (op: SyncOperation) => {
        console.log('🚀 [useSyncManager.perform] начало операции:', op);
        const key = getOpKey(op)
        if (pendingOps.has(key)) {
            console.log('⏳ [useSyncManager.perform] операция уже выполняется, пропускаем:', key);
            return;
        }
        pendingOps.add(key)

        try {
           if (op.type === 'create') {
            console.log('➕ [useSyncManager.perform] CREATE операция');
            if (!op.dto) {
                console.warn('⚠️ [useSyncManager.perform] CREATE: нет dto');
                return;
            }
            
            const tempId = -Math.abs(Date.now() + op.rowIndex);
            console.log('📝 [useSyncManager.perform] CREATE сгенерирован tempId:', tempId);
            // ЗАКОММЕНТИРОВАНО: store.addRecords([{ ...op.dto, tempId }])
            // ЗАКОММЕНТИРОВАНО: store.anchorCreateRow(op.listName, op.rowIndex)
            console.log('✅ [useSyncManager.perform] CREATE выполнено (закомментировано)');
           } 

           if (op.type === 'update') {
            console.log('✏️ [useSyncManager.perform] UPDATE операция');
            if (!op.dto || !op.id) {
                console.warn('⚠️ [useSyncManager.perform] UPDATE: нет dto или id');
                return;
            }

            const existing = store.records[op.listName]?.find(r => r.id === op.id);
            if (!existing) {
                console.warn('⚠️ [useSyncManager.perform] UPDATE: запись не найдена');
                return;
            }

            const changed = Object.keys(op.dto).some(
                k => String(op.dto[k]) !== String(existing[k])
            );
            if (!changed) {
                console.log('🔁 [useSyncManager.perform] UPDATE: данные не изменились');
                return;
            }

            console.log('📝 [useSyncManager.perform] UPDATE данные изменились, обновляем');
            // ЗАКОММЕНТИРОВАНО: await store.updateRecords([{ ...op.dto, id: op.id }])
            console.log('✅ [useSyncManager.perform] UPDATE выполнено (закомментировано)');
           }

           if (op.type === 'delete') {
            console.log('🗑️ [useSyncManager.perform] DELETE операция');
            if (!op.id) {
                console.warn('⚠️ [useSyncManager.perform] DELETE: нет id');
                return;
            }
            const exists = hasRecord(op.listName, op.id);
            if (!exists) {
                console.warn('⚠️ [useSyncManager.perform] DELETE: запись не существует');
                return;
            }
            console.log('📝 [useSyncManager.perform] DELETE удаляем запись:', op.id);
            // ЗАКОММЕНТИРОВАНО: await store.deleteRecords([op.id])
            console.log('✅ [useSyncManager.perform] DELETE выполнено (закомментировано)');
           }
        } catch (e) {
            console.error('❌ [useSyncManager.perform] ошибка:', e)
        } finally {
            pendingOps.delete(key)
            console.log('🧹 [useSyncManager.perform] операция завершена, ключ удален:', key);
        }
    }

    return { perform }
}