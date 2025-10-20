import type { FUniver } from "@univerjs/presets";
import { useUniverStore } from "~/stores/univer-store";
import { RPCServer } from "~/utils/rpc";

const rpc = new RPCServer() 
await initUniverInWorker()

function getUniver(): FUniver {
    return (globalThis as any).univerInstance as FUniver
}

console.log('[Worker] Univer initialized (FUniver): ', useUniverApi().value)

rpc.register('batchRecords', async ({ type, listName, records }) => {
    try {
        const univer = useUniverStore().getUniver()
        console.log('[Worker] univer keys:', Object.keys(univer))
        if (!univer) {
            console.warn('[Worker] batchRecords: univer not found')
            return { success: false }
        }

        const wb = univer.getActiveWorkbook()
        const sheet = wb?.getSheetByName(listName)
        const aws = wb?.getActiveSheet()

        if (!sheet || !aws) {
            console.error('[Worker] sheet not found')
        }

        const tot_c = 28
        const idCol = 27

        const idColRange = aws?.getRange(1, idCol, (sheet?.getLastRow() || 0), 1).getValues() || []
        const idToRow = new Map<number, number>() 

        for (let i = 0; i < idColRange?.length; i++) {
            const val = idColRange[i]?.[0]?.v ?? idColRange[i]?.[0]
            const id = Number(val)
            if (Number.isFinite(id)) idToRow.set(id, i + 1)
        }

        const createdRows: number[] = [] 
        const updatedRows: number[] = [] 

        let cursor = sheet?.getLastRow() || 0

        for (const rec of records) {
            const id = Number(rec?.id)
            if (!Number.isFinite(id)) continue 

            const rowVals = Array.from({ length: tot_c }, (_, i) => {
                const v = rec?.[(Object.keys(rec)[i]) || '']
                return { v, s: i === idCol ? 'id' : 'ar' }
            })

            if (type === 'update' && idToRow.has(id)) {
                const row = idToRow.get(id)!
                aws?.getRange(row, 0, 1, tot_c).setValues([rowVals])
                updatedRows.push(row)
            } else {
                const row = ++cursor 
                aws?.getRange(row, 0, 1, tot_c).setValues([rowVals])
                idToRow.set(id, row)
                createdRows.push(row)
            }
        }

        console.log('[Worker] batchRecords success. created:', createdRows.length, 'updated:', updatedRows.length)

        return {
            success: true,
            count: createdRows.length + updatedRows.length,
            created: createdRows.length,
            updated: updatedRows.length
        }
    } catch (error) {
        console.error('[Worker] batchRecords error:', error)
        return {
            success: false,
            error: error.message || String(error)
        }
    }
})

rpc.register('deleteRecords', async ({ ids }) => {
    console.log('[Worker] deleteRecords called with: ', ids)

    try {
        const univer = useUniverStore().getUniver()
        console.log('[Worker] univer keys:', Object.keys(univer))
        if (!univer) {
            console.warn('[Worker] deleteRecords: univer not found')
            return { success: false }
        }

        const wb = univer.getActiveWorkbook()
        const aws = wb?.getActiveSheet() 
        if (!wb || !aws) {
            console.warn('[Worker] workbook not active')
            return { success: false }
        }

        const tot_c = 28 

        const sheet = aws.getSheet() 
        const rows = aws.getRange(1, 27, sheet.getRowCount(), 1).getValues() 
        const idMap = new Map<number, number>() 

        for (let i = 0; i < rows.length; i++) {
            const cellVal = Number(rows[i]?.[0]?.v ?? rows[i]?.[0])
            if (Number.isFinite(cellVal)) idMap.set(cellVal, i + 1)
        }

        for (const id of ids) {
            const r = idMap.get(id)
            if (!r) continue 
            const empty = Array.from({ length: tot_c }, () => ({ v: '' }))
            aws.getRange(r, 0, 1, tot_c).setValues([empty])
        }

        console.log(`[Worker] deleted ${ids.length} records`)
        return { success: true, count: ids.length }
    } catch (error) {
        console.error('[Worker] deleteRecords error: ', error)
        return { success: false, error: String(error)}
    }
})

console.log('[Worker] RPC initialized')