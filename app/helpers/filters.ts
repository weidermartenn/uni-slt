import type { FUniver } from "@univerjs/presets";
import type { FWorksheet } from "@univerjs/presets/lib/types/preset-sheets-core/index.js";

export async function addFilters(api: FUniver, sheet: FWorksheet) {
    const len = sheet.getMaxRows()
    const range = sheet.getRange(`A1:AB${len}`)
    range?.createFilter()
    
}