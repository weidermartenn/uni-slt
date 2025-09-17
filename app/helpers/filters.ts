import type { FUniver } from "@univerjs/presets";

export async function addFilters(api: FUniver) {
    const aws = api.getActiveWorkbook()?.getActiveSheet()
    const range = aws?.getRange('A2:D14')
    let filter = range?.createFilter()

    if (!filter) {
        aws?.getFilter()?.remove()
        filter = range?.createFilter()
    }

    filter?.getRange().getA1Notation()
}