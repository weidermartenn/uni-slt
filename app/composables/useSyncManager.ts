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
    const store = useSheetStore() 

    const hasRecord = (listName: string, id: number) => 
        store.records[listName]?.some(r => Number(r.id) === id)

    const perform = async (op: SyncOperation) => {
        const key = getOpKey(op)
        if (pendingOps.has(key)) return 
        pendingOps.add(key)

        try {
           if (op.type === 'create') {
            if (!op.dto) return 
            
            const tempId = -Math.abs(Date.now() + op.rowIndex)
            await store.addRecords([{ ...op.dto, tempId }])
            store.anchorCreateRow(op.listName, op.rowIndex)
           } 

           if (op.type === 'update') {
            if (!op.dto || !op.id) return 

            const existing = store.records[op.listName]?.find(r => r.id === op.id)
            if (!existing) return 

            const changed = Object.keys(op.dto).some(
                k => String(op.dto[k]) !== String(existing[k])
            )
            if (!changed) return 

            await store.updateRecords([{ ...op.dto, id: op.id }])
           }

           if (op.type === 'delete') {
            if (!op.id) return 
            const exists = hasRecord(op.listName, op.id)
            if (!exists) return
            await store.deleteRecords([op.id])
           }
        } catch (e) {
            console.error('[SyncManager] failed: ', e)
        } finally {
            pendingOps.delete(key)
        }
    }

    return { perform }
}