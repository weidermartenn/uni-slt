// univer-events.ts
import type { FUniver } from "@univerjs/presets"
import { useToast } from "#imports"
import { useSheetStore } from "~/stores/sheet-store-optimized"
import { useUniverStore } from "~/stores/univer-store"
import { getUser } from "./getUser"
import { useUniverWorker } from "~/composables/useUniverWorker"
import { unwrapV, toStr, normalizeDateInput, isNumericOrEmpty } from "~/helpers/utils"
import { buildSR } from "~/helpers/buildSR"

export function registerUniverEvents(univerAPI: FUniver) {
  const { handleRowChangeOptimized } = useUniverWorker()
  const univerStore = useUniverStore()
  const sheetStore = useSheetStore()
  const toast = useToast()

  let pasteProcessing = false
  let isQuietUpdate = false
  let cachedMe: any | undefined
  const processingRows = new Set<string>()

  const getMe = async () => (cachedMe ??= getUser())

  const dateCols = new Set([0, 4, 11, 12, 19])
  const NUMERIC_COLS = new Set([9, 16, 17, 24, 25, 26])
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27])

  const letterToCol = (l: string) => l.charCodeAt(0) - 65

  const isCellLockedForManager = (listName: string, row: number, col: number): boolean => {
    if (row <= 0 || MANAGER_LOCKED_COLUMNS.has(col)) return true
    const rec = sheetStore.records?.[listName]?.[row - 1]
    const locks = rec?.managerBlockListCell
    if (!Array.isArray(locks)) return false
    for (const l of locks) {
      if (l.length === 1 && l[0]) {
        if (letterToCol(l[0]) === col) return true
      } else if (l.length === 2) {
        const a = letterToCol(l[0]), b = letterToCol(l[1])
        if (col >= a && col <= b) return true
      }
    }
    return false
  }

  const offBeforePaste = univerAPI.addEvent(
    univerAPI.Event.BeforeClipboardPaste,
    (params: any) => {
      pasteProcessing = true
      const normalize = (v: any, c: number) =>
        dateCols.has(c)
          ? normalizeDateInput(v) ?? v
          : NUMERIC_COLS.has(c)
          ? String(v).replace(/\s/g, "").replace(",", ".")
          : v

      if (Array.isArray(params.cells)) {
        params.cells = params.cells.map((row: any[]) => row.map((val, i) => normalize(val, i)))
      }
    }
  )

  const offPasted = univerAPI.addEvent(
    univerAPI.Event.ClipboardPasted,
    async () => {
      setTimeout(() => (pasteProcessing = false), 30)
    }
  )

  const offValueChanged = univerAPI.addEvent(
    univerAPI.Event.SheetValueChanged,
    async (params: any) => {
      const trigger = params?.trigger ?? params?.payload?.params?.trigger ?? ""
      if (univerStore.isQuiet?.() || isQuietUpdate || pasteProcessing) return

      const wb = univerAPI.getActiveWorkbook()
      const ws = wb?.getActiveSheet()
      const sheet = ws?.getSheet()
      if (!sheet || !ws) return

      const listName = sheet.getName()
      const me = await getMe()
      const cv = params?.cellValue ?? params?.payload?.params?.cellValue
      if (!cv || typeof cv !== "object") return

      for (const rowKey of Object.keys(cv)) {
        const row = Number(rowKey)
        if (row <= 0) continue
        const colSet = Object.keys(cv[rowKey]).map(Number)

        // 🔒 Блокировка менеджера
        if (me?.roleCode === "ROLE_MANAGER") {
          const blocked = colSet.some(col => isCellLockedForManager(listName, row, col))
          if (blocked) {
            try { univerStore.beginQuiet?.() } catch {}
            isQuietUpdate = true
            for (const c of colSet) {
              ws.getRange(row, c).setValue({ v: "" })
            }
            isQuietUpdate = false
            try { univerStore.endQuiet?.() } catch {}
            return
          }
        }

        // 🔢 Валидация чисел
        for (const col of colSet) {
          const val = cv[rowKey][col]?.v
          if (NUMERIC_COLS.has(col) && !isNumericOrEmpty(val)) {
            toast.add({
              title: "Ошибка",
              description: `В ячейке ${row + 1}, ${col + 1} должно быть число`,
              color: "warning",
              icon: "i-lucide-alert-triangle",
              duration: 3000,
            })
            try { univerStore.beginQuiet?.() } catch {}
            isQuietUpdate = true
            ws.getRange(row, col).setValue({ v: "" })
            isQuietUpdate = false
            try { univerStore.endQuiet?.() } catch {}
            return
          }
        }

        const rowVals = ws.getRange(row, 0, 1, 28).getValues()?.[0] ?? []
        const idStr = toStr(rowVals[27])
        const processingKey = `${listName}#${row}`

        if (processingRows.has(processingKey)) return
        processingRows.add(processingKey)

        try {
          await handleRowChangeOptimized(
            row,
            -1,
            rowVals,
            listName,
            idStr,
            buildSR
          )
        } catch (e) {
          console.error("[univer-events] handleRowChangeOptimized failed:", e)
        } finally {
          processingRows.delete(processingKey)
        }
      }
    }
  )

  return () => {
    offBeforePaste?.dispose?.()
    offPasted?.dispose?.()
    offValueChanged?.dispose?.()
  }
}
