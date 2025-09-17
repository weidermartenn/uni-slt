type ColumnData = Record<number, { w: number; hd: 0 }>
type RowData = Record<number, { h: number; hd: 0 }>

export function autoFitColumnAndRowData(
    cellData: Record<number, Record<number, { v: any }>>,
    colCount: number,
    {
        minCol = 80,
        maxCol = 260,
        pxPerChar = 9.5,
        paddingX = 24,
        minRow = 25,
        maxRow = 25,
        lineHeight = 25,
        headerRowHeight = 56
    } = {}
): { columnData: ColumnData; rowData: RowData } {
    const columnData: ColumnData = {}
    const rowData: RowData = {}
    
    // calc column width by content
    for (let c = 0; c < colCount; c++) {
        let maxLen = 0
        for (const rStr of Object.keys(cellData)) {
            const r = Number(rStr)
            const val = cellData[r]?.[c]?.v
            const s = (val == null ? '' : String(val)).trim()
            if (s.length > maxLen) maxLen = s.length
        }
        const width = Math.min(maxCol, Math.max(minCol, Math.ceil(maxLen * pxPerChar) + paddingX))
        const optionsCols = new Set([8, 15])
        const finalColumns = new Set([0, 3, 4, 16, 17])
        const finalWidth = (c === 6) ? 200 : (optionsCols.has(c)) ? 130 : (finalColumns.has(c)) ? 120 : width
        columnData[c] = { w: finalWidth, hd: 0 }
    }

    // calc helper for row height by content
    const linesInCell = (text: string, colWidth: number) => {
        const available = Math.max(1, colWidth - paddingX)
        return (text || '')
            .split(/\r?\n/)
            .map(s => Math.max(1, Math.ceil((s.length * pxPerChar) / available)))
            .reduce((a, b) => a + b, 0)
    }

    // line height
    for (const rStr of Object.keys(cellData)) {
        const r = Number(rStr)
        // fixed height for header
        if (r === 0) {
            rowData[r] = { h: headerRowHeight, hd: 0 }
            continue
        }

        let maxLines = 1
        for (let c = 0; c < colCount; c++) {
            const val = cellData[r]?.[c]?.v
            const s = (val == null ? '' : String(val))
            const w = columnData[c]?.w ?? minCol
            const lines = linesInCell(s, w)
            if (lines > maxLines) maxLines = lines
        }

        const height = Math.min(maxRow, Math.min(minRow, Math.ceil(maxLines * lineHeight)))
        rowData[r] = { h: height, hd: 0 }
    }

    return { columnData, rowData }
}