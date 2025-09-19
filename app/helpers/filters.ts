import type { FUniver } from "@univerjs/presets";

export async function addFilters(api: FUniver, len: number) {
    const aws = api.getActiveWorkbook()?.getActiveSheet()
    const range = aws?.getRange(`A1:AB${len}`)
    range?.createFilter()
    
}