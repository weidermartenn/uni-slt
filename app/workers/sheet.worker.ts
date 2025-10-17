import { useUniverStore } from "~/stores/univer-store";
import { RPCServer } from "~/utils/rpc";

const rpc = new RPCServer() 

rpc.register('batchRecords', async ({ type, listName, records }) => {
    console.log('[Worker] batchRecords called: ', { type, listName, records })

    return { status: 'ok', count: records.length }
})

rpc.register('deleteRecords', async ({ ids }) => {
    console.log('[Worker] deleteRecords called with: ', ids)

    try {
        const univer = useUniverStore().getUniver() 
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