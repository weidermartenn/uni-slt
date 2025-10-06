// univer-events.ts
import type { FUniver } from '@univerjs/presets'
import { useToast } from '#imports'
import { useSheetStore } from '~/stores/sheet-store'
import { useUniverStore } from '~/stores/univer-store'
import { getUser } from './getUser'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types'

export function registerUniverEvents(univerAPI: FUniver) {
  // ====== Константы/флаги ======
  const dateCols = new Set([0, 4, 11, 12, 19]) // A,E,L,M,T (0-based)
  // ВСЕГДА заблокированные для менеджера: E,K,L,M,R,T,Z,AA,AB
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27])

  const requestedRows = new Set<string>()        // защита от двойного create
  let batchPasteInProgress = false               // флаг периода вставки
  const processingRows = new Set<string>()       // антидубль для SVC каскадов
  const univerStore = useUniverStore()

  // числовые колонки (0-based): J, Q, R, Y, а также 25, 26
  const NUMERIC_COLS = new Set([9, 16, 17, 24, 25, 26])

  // ====== Helpers ======
  const unwrapV = (x: any): any => (x && typeof x === 'object' && 'v' in x ? unwrapV(x.v) : x)

  const toStr = (raw: any): string => {
    const val = unwrapV(raw)
    if (val == null) return ''
    if (typeof val === 'object') {
      if (typeof (val as any).t === 'string') return (val as any).t.trim()
      const p = (val as any).p
      if (Array.isArray(p)) return p.map((seg: any) => String(unwrapV(seg?.s?.v ?? seg))).join('').trim()
      return ''
    }
    return String(val).trim()
  }

  // === Поддержка Excel-сериалов и эпохи при нормализации дат ===
  const excelSerialToISO = (n: number): string => {
    // База Excel = 1899-12-30, работаем в UTC, чтобы избежать сдвигов TZ
    const baseMs = Date.UTC(1899, 11, 30)
    const ms = Math.round(n * 86400000) // поддержка дробной части суток
    const d = new Date(baseMs + ms)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const tsToISO = (ms: number): string => {
    const d = new Date(ms)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const normalizeDateInput = (raw: any): string | null => {
    const v = unwrapV(raw)
    if (v == null || v === '') return null

    if (typeof v === 'number' && Number.isFinite(v)) {
      // Excel-сериал (>= 1970-01-01 → 25569)
      if (v >= 25569) return excelSerialToISO(v)
      // Эпоха (мс/сек)
      if (v > 1e12) return tsToISO(v)                 // миллисекунды
      if (v > 1e10 && v < 1e12) return tsToISO(v * 1000) // секунды
    }

    const s = toStr(v)
    if (!s) return null

    // Чистое число строкой — вероятный Excel-сериал
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s)
      if (Number.isFinite(n) && n >= 25569) return excelSerialToISO(n)
    }

    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

    const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
    if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`

    const slash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`

    const d = new Date(s)
    return Number.isFinite(d.getTime()) ? tsToISO(d.getTime()) : null
  }

  const highlightRow = (aws: any, row: number) => {
    try {
      const range = aws.getRange(row, 0, 1, 28)
      range.useThemeStyle('light-green')
      const theme = range.getUsedThemeStyle()
      setTimeout(() => { try { range.removeThemeStyle(theme) } catch {} }, 1000)
    } catch {}
  }

  const letterToColumnIndex = (letter: string): number => letter.charCodeAt(0) - 'A'.charCodeAt(0)

  const isCellLockedForManager = (
    listName: string, row: number, col: number, store: ReturnType<typeof useSheetStore>
  ) => {
    if (row <= 0) return false
    if (MANAGER_LOCKED_COLUMNS.has(col)) return true // ВСЕГДА заблокировано для менеджера
    if (col === 0) return false
    const items = (store.records as any)?.[listName] as any[] | undefined
    const rec = Array.isArray(items) ? items[row - 1] : undefined
    if (!rec?.managerBlockListCell) return false
    for (const rng of rec.managerBlockListCell) {
      if (!rng?.length) continue
      if (rng.length === 1 && typeof rng[0] === 'string') {
        if (letterToColumnIndex(rng[0]) === col) return true
      } else if (typeof rng[0] === 'string' && typeof rng[1] === 'string') {
        const a = letterToColumnIndex(rng[0]), b = letterToColumnIndex(rng[1])
        if (col >= a && col <= b) return true
      }
    }
    return false
  }

  let cachedMe: any | undefined
  const getMe = async () => (cachedMe ??= getUser())

  // --- соответствие индекс->ключ DTO (0..27)
  const COL_TO_KEY = [
    'dateOfPickup',        // 0  A
    'numberOfContainer',   // 1  B
    'cargo',               // 2  C
    'typeOfContainer',     // 3  D
    'dateOfSubmission',    // 4  E
    'addressOfDelivery',   // 5  F
    'ourFirm',             // 6  G
    'client',              // 7  H
    'formPayAs',           // 8  I
    'summa',               // 9  J
    'numberOfBill',        // 10 K
    'dateOfBill',          // 11 L
    'datePayment',         // 12 M
    'contractor',          // 13 N
    'driver',              // 14 O
    'formPayHim',          // 15 P
    'contractorRate',      // 16 Q
    'sumIssued',           // 17 R
    'numberOfBillAdd',     // 18 S
    'dateOfPaymentContractor', // 19 T
    'manager',             // 20 U
    'departmentHead',      // 21 V
    'clientLead',          // 22 W
    'salesManager',        // 23 X
    'additionalExpenses',  // 24 Y
    'income',              // 25 Z
    'incomeLearned',       // 26 AA
    'id'                   // 27 AB
  ] as const

  // buildSR: нормализуем даты для всех колонок из dateCols → всегда ISO
  const buildSR = (rowVals: any[], listName: string, id: number = 0) => {
    const v = (i: number) => dateCols.has(i)
      ? (normalizeDateInput(rowVals[i]) ?? '')
      : toStr(rowVals[i])

    return {
      additionalExpenses: v(24),
      addressOfDelivery: v(5),
      cargo: v(2),
      client: v(7),
      clientLead: v(22),
      contractor: v(13),
      contractorRate: v(16),
      dateOfBill: v(11),
      dateOfPaymentContractor: v(19),
      dateOfPickup: v(0),
      dateOfSubmission: v(4),
      datePayment: v(12),
      departmentHead: v(21),
      driver: v(14),
      formPayAs: v(8),
      formPayHim: v(15),
      id,
      listName,
      income: v(25),
      incomeLearned: v(26),
      manager: v(20),
      numberOfBill: v(10),
      numberOfBillAdd: v(18),
      numberOfContainer: v(1),
      ourFirm: v(6),
      salesManager: v(23),
      sumIssued: v(17),
      summa: v(9),
      taxes: '',
      typeOfContainer: v(3),
    }
  }

  // Маска для менеджера: заблокированные колонки оставляем как в prevRec
  const maskDtoForManager = (
    dto: any,
    listName: string,
    row0: number,
    store: ReturnType<typeof useSheetStore>,
    prevRec?: TransportAccounting
  ) => {
    if (!prevRec) return dto
    for (let col = 0; col <= 26; col++) { // 27=id — не трогаем
      if (isCellLockedForManager(listName, row0, col, store)) {
        const key = COL_TO_KEY[col]
        // @ts-expect-error — доступ по ключу
        dto[key] = (prevRec as any)?.[key] ?? ''
      }
    }
    return dto
  }

  const rowHasData = (rv: any[]): boolean => {
    for (let c = 0; c <= 26; c++) {
      const cell = rv?.[c]
      const val = cell && typeof cell === 'object' && 'v' in cell ? cell.v : cell
      if (String(val ?? '').trim() !== '') return true
    }
    return false
  }

  // простая проверка: число или пусто; текст ошибок типа "#..." — не допускаем
  const isNumericOrEmpty = (v: any): boolean => {
    if (v == null) return true
    const s = String(v).trim()
    if (!s) return true
    if (s.startsWith('#')) return false
    if (typeof v === 'number') return Number.isFinite(v)
    return /^[-+]?\d+(?:\.\d+)?$/.test(s) && Number.isFinite(Number(s))
  }

  // ====== Откат заблокированных ячеек (надёжнее, чем undo в SVC) ======
  const getPrevValueForCell = (
    listName: string,
    row0: number,
    col0: number,
    store: ReturnType<typeof useSheetStore>
  ): string => {
    const arr = (store.records as any)?.[listName] as TransportAccounting[] | undefined
    const prevRec = Array.isArray(arr) ? arr[row0 - 1] : undefined
    if (!prevRec) return ''
    const key = COL_TO_KEY[col0] as keyof TransportAccounting
    const raw = (prevRec as any)?.[key]
    return dateCols.has(col0) ? (normalizeDateInput(raw) ?? '') : String(raw ?? '')
  }

  const revertLockedCells = (
    ws: any,
    listName: string,
    lockedCells: Array<{ row0: number, col0: number }>,
    store: ReturnType<typeof useSheetStore>
  ) => {
    if (!lockedCells.length) return
    try { univerStore.beginQuiet?.() } catch {}
    try {
      for (const { row0, col0 } of lockedCells) {
        const prev = getPrevValueForCell(listName, row0, col0, store)
        // Возвращаем и значение, и стиль заблокированной колонки
        ws.getRange(row0, col0).setValue({ v: prev, s: 'lockedCol' })
      }
    } finally {
      try { univerStore.endQuiet?.() } catch {}
    }
  }

  const revertSingleLockedCell = (
    ws: any,
    listName: string,
    row0: number,
    col0: number,
    store: ReturnType<typeof useSheetStore>
  ) => revertLockedCells(ws, listName, [{ row0, col0 }], store)

  // Применить locked-стиль для всех "всегда заблокированных" колонок на указанной строке (только для менеджера)
  const paintManagerLockedColsOnRow = async (ws: any, row0: number) => {
    const me = await getMe()
    if (me?.roleCode !== 'ROLE_MANAGER') return
    try { univerStore.beginQuiet?.() } catch {}
    try {
      for (const col of MANAGER_LOCKED_COLUMNS) {
        if (col === 27) continue // ID-колонка имеет свой стиль 'id'
        ws.getRange(row0, col).setValue({ s: 'lockedCol' })
      }
    } finally {
      try { univerStore.endQuiet?.() } catch {}
    }
  }

  // ====== Единичный подтверждённый ввод ======
  const handleRowChange = async (row: number, col: number) => {
    const wb = univerAPI.getActiveWorkbook(); if (!wb) return
    const aws = wb.getActiveSheet(); const s = aws?.getSheet(); if (!s || row === 0) return
    const listName = s.getName(); const sheetStore = useSheetStore(); const toast = useToast()

    if (dateCols.has(col)) {
      const raw = s.getCell(row, col)
      const n = normalizeDateInput(raw)
      if (!n) {
        // при ручном вводе неверного формата просто откатываем
        try { univerStore.beginQuiet?.() } catch {}
        try {
          aws.getRange(row, col).setValue({ v: '' })
        } finally { try { univerStore.endQuiet?.() } catch {} }
        try { toast.add({ title: 'Неверный формат даты', color: 'error', duration: 2500 }) } catch {}
        return
      }
      const cur = toStr(raw); if (cur !== n) aws.getRange(row, col).setValue({ v: n })
    }

    if (NUMERIC_COLS.has(col)) {
      const raw = s.getCell(row, col)           // универсально возвращает текущее UI-значение
      const val = toStr(raw)                    // строчное представление
      if (!isNumericOrEmpty(val)) {
        try { univerStore.beginQuiet?.() } catch {}
        try { aws.getRange(row, col).setValue({ v: '' }) } finally { try { univerStore.endQuiet?.() } catch {} }
        try {
          useToast().add({
            title: 'Только числа',
            description: 'В этой колонке допускаются только числовые значения',
            color: 'warning',
            duration: 3000,
            icon: 'i-lucide-alert-triangle'
          })
        } catch {}
        return
      }
    }

    const rowVals = aws.getRange(row, 0, 1, 28).getValues()?.[0] ?? []
    const idStr = toStr(rowVals[27]); const key = `${listName}#${row}`

    let has = false; for (let c = 0; c <= 26; c++) if (toStr(rowVals[c])) { has = true; break }
    if (!has && !idStr) return

    if (!idStr) {
      if (requestedRows.has(key)) return
      requestedRows.add(key)
      try {
        sheetStore.anchorCreateRow(listName, row)
        await sheetStore.addRecords([buildSR(rowVals, listName)])
        // Сразу прокрасим заблокированные колонки для менеджера в только что созданной строке
        await paintManagerLockedColsOnRow(aws, row)
        highlightRow(aws, row)
      } finally {
        requestedRows.delete(key)
      }
      return
    }

    const idNum = Number(idStr); if (!Number.isFinite(idNum) || idNum <= 0) return

    // Менеджер: перед апдейтом маскируем заблокированные поля
    const me = await getMe()
    const arr = (sheetStore.records as any)?.[listName] as TransportAccounting[] | undefined
    const prevRec = Array.isArray(arr) ? arr[row - 1] : undefined

    let dto = { ...buildSR(rowVals, listName, idNum), id: idNum }
    if (me?.roleCode === 'ROLE_MANAGER') {
      dto = maskDtoForManager(dto, listName, row, sheetStore, prevRec)
    }

    await sheetStore.updateRecords([dto]); 
    highlightRow(aws, row)
  }

  const offEditEnded = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, async (params: any) => {
    if (batchPasteInProgress) return
    const { row, column: col, isConfirm } = params; if (!isConfirm) return
    const wb = univerAPI.getActiveWorkbook(); const aws = wb?.getActiveSheet(); const s = aws?.getSheet()
    if (!s || row === 0) return
    const me = await getMe(); const sheetStore = useSheetStore(); const listName = s.getName()
    if (me?.roleCode === 'ROLE_MANAGER' && isCellLockedForManager(listName, row, col, sheetStore)) {
      // Надёжно откатываем вручную вместо undo
      revertSingleLockedCell(aws, listName, row, col, sheetStore)
      try { useToast().add({ title: 'Ячейка заблокирована', color: 'warning', duration: 2500 }) } catch {}
      return
    }
    await handleRowChange(row, col)
  })

  // ====== Вставка: до / после ======
  const normalizeNumberStr = (raw: any): string => (raw ?? '').toString().replace(/\s+/g, '').replace(',', '.')
  const offBeforePaste = univerAPI.addEvent(univerAPI.Event.BeforeClipboardPaste, async (params: any) => {
    batchPasteInProgress = true
    const wb = univerAPI.getActiveWorkbook(); const aws = wb?.getActiveSheet()
    const startCol = aws?.getSelection()?.getActiveRange?.()?.getRange().startColumn ?? 0
    let changed = false
    const norm = (v: any, c: number) =>
      dateCols.has(c) ? (normalizeDateInput(v) ?? v) : (NUMERIC_COLS.has(c) ? normalizeNumberStr(v) : v)

    if (typeof (params as any)?.text === 'string') {
      const rows = ((params as any).text as string).split(/\r?\n/)
      const next = rows.map(line => !line ? line : line.split('\t').map((cell, i) => {
        const nv = norm(cell, startCol + i); if (nv !== cell) changed = true; return nv
      }).join('\t')).join('\n')
      if (next !== (params as any).text) { (params as any).text = next; changed = true }
    }
    if (typeof (params as any)?.html === 'string') {
      const prev = (params as any).html as string
      const next = prev.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`)
      if (next !== prev) { (params as any).html = next; changed = true }
    }
    const data = (params as any)?.data ?? (params as any)?.clipboardData
    if (data) {
      if (typeof data.html === 'string') {
        const prev = data.html as string
        const next = prev.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`)
        if (next !== prev) { data.html = next; changed = true }
      }
      if (Array.isArray(data.cells)) {
        data.cells = data.cells.map((row: any[]) => Array.isArray(row)
          ? row.map((cell: any, i: number) => { const nv = norm(cell, startCol + i); if (nv !== cell) changed = true; return nv })
          : row)
      }
    }
    if (Array.isArray((params as any)?.cells)) {
      (params as any).cells = (params as any).cells.map((row: any[]) => Array.isArray(row)
        ? row.map((cell: any, i: number) => { const nv = norm(cell, startCol + i); if (nv !== cell) changed = true; return nv })
        : row)
    }
    if (changed) console.log('[univer-events] BeforeClipboardPaste: normalized')
  })

  const offPasted = univerAPI.addEvent(univerAPI.Event.ClipboardPasted, async () => {
    const wb = univerAPI.getActiveWorkbook(); const aws = wb?.getActiveSheet(); const s = aws?.getSheet()
    if (!wb || !aws || !s) { batchPasteInProgress = false; return }
    try {
      const active = aws.getSelection()?.getActiveRange?.()?.getRange(); if (!active) return
      const startRow = Math.max(1, active.startRow), endRow = active.endRow, startCol = active.startColumn, endCol = active.endColumn
      const listName = s.getName(); const sheetStore = useSheetStore(); const toast = useToast()
      const me = await getMe()
      if (me?.roleCode === 'ROLE_MANAGER') {
        for (let r = startRow; r <= endRow; r++) {
          let locked = false
          for (let c = startCol; c <= endCol; c++) if (isCellLockedForManager(listName, r, c, sheetStore)) { locked = true; break }
          if (locked) { await univerAPI.undo(); try { toast.add({ title: 'Строка/ячейка заблокирована', color: 'warning' }) } catch {}; return }
        }
      }
      const rows = endRow - startRow + 1, cols = endCol - startCol + 1
      if (rows > 0 && cols > 0) {
        const block = aws.getRange(startRow, startCol, rows, cols)
        const values = block.getValues()
        for (let r = 0; r < rows; r++) {
          const rowValues = values[r]; if (!rowValues) continue
          for (let c = 0; c < cols; c++) {
            const absCol = startCol + c; const orig = toStr(rowValues[c])
            if (dateCols.has(absCol)) {
              const nd = normalizeDateInput(orig); if (nd && orig !== nd) values[r][c] = { v: nd }
            } else if (NUMERIC_COLS.has(absCol)) {
              const nn = orig.replace(/\s+/g, '').replace(',', '.'); if (orig !== nn) values[r][c] = { v: nn }
            }
          }
        }
        block.setValues(values)
      }

      const createDtos: any[] = [], updateDtos: any[] = []
      const createdRows: number[] = []

      for (let r = startRow; r <= endRow; r++) {
        const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? []
        const idStr = toStr(rowVals[27])
        let has = false; for (let c = 0; c <= 26; c++) if (toStr(rowVals[c])) { has = true; break }
        if (!has && !idStr) continue

        if (idStr && Number.isFinite(Number(idStr)) && Number(idStr) > 0) {
          let dto = buildSR(rowVals, listName, Number(idStr))
          if (me?.roleCode === 'ROLE_MANAGER') {
            const arr = (sheetStore.records as any)?.[listName] as TransportAccounting[] | undefined
            const prevRec = Array.isArray(arr) ? arr[r - 1] : undefined
            dto = maskDtoForManager(dto, listName, r, sheetStore, prevRec)
          }
          updateDtos.push(dto)
        } else if (has) {
          createDtos.push(buildSR(rowVals, listName))
          createdRows.push(r)
        }
      }

      if (createDtos.length) await sheetStore.addRecords(createDtos)
      if (updateDtos.length) await sheetStore.updateRecords(updateDtos)

      // Сразу прокрасим заблокированные колонки в созданных строках
      for (const r of createdRows) await paintManagerLockedColsOnRow(aws, r)

      if (createDtos.length || updateDtos.length) {
        for (let r = startRow; r <= endRow; r++) {
          const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? []
          let has = false; for (let c = 0; c <= 26; c++) if (toStr(rowVals[c])) { has = true; break }
          if (has || toStr(rowVals[27])) highlightRow(aws, r)
        }
      }
    } catch (e) {
      console.error('[univer-events] paste handler failed:', e)
    } finally {
      batchPasteInProgress = false
    }
  })

  const PASTE_TRIGGERS = new Set([
    'sheet.command.clipboard-paste',
    'sheet.command.paste', 'sheet.command.paste-values',
    'sheet.command.paste-formula', 'sheet.command.paste-all',
  ])

  const offValueChanged = univerAPI.addEvent(univerAPI.Event.SheetValueChanged, async (params: any) => {
    // гейты: инициализация/тихий режим + период вставки + явные триггеры вставки
    if (univerStore.isQuiet?.() ?? univerStore.batchProgress) return
    if (batchPasteInProgress) return
    const trigger = params?.trigger ?? params?.payload?.params?.trigger ?? ''
    if (PASTE_TRIGGERS.has(trigger)) return

    const wb = univerAPI.getActiveWorkbook()
    const ws = wb?.getActiveSheet()
    const sheet = ws?.getSheet()
    if (!wb || !ws || !sheet) return

    // только активный лист
    const activeSheetId = sheet.getSheetId?.()
    const subUnitId = params?.subUnitId ?? params?.payload?.params?.subUnitId
    if (activeSheetId && subUnitId && subUnitId !== activeSheetId) return

    // payload.cellValue со значениями (v), игнорируем чисто стили (s)
    const cv: Record<string, Record<string, any>> | undefined =
      params?.cellValue ?? params?.payload?.params?.cellValue
    if (!cv || typeof cv !== 'object') return

    // row0 -> Set<col0>, исключаем заголовок и ID колонку
    const perRowRaw = new Map<number, Set<number>>()
    for (const rk of Object.keys(cv)) {
      const rowObj = cv[rk]; if (!rowObj) continue
      for (const ck of Object.keys(rowObj)) {
        const cell = rowObj[ck]
        if (!cell || !Object.prototype.hasOwnProperty.call(cell, 'v')) continue
        const row0 = Number(rk), col0 = Number(ck)
        if (!Number.isFinite(row0) || !Number.isFinite(col0)) continue
        if (row0 <= 0 || col0 === 27) continue
        ;(perRowRaw.get(row0) ?? perRowRaw.set(row0, new Set()).get(row0)!).add(col0)
      }
    }
    if (perRowRaw.size === 0) return

    const listName = sheet.getName?.() || ''
    const store = useSheetStore()
    const me = await getMe()

    // Жёсткая защита + мягкий проход: откатываем ТОЛЬКО заблокированные ячейки, остальные продолжаем обрабатывать
    let hadLocked = false
    const lockedCells: Array<{ row0: number, col0: number }> = []
    const perRowAllowed = new Map<number, Set<number>>()

    if (me?.roleCode === 'ROLE_MANAGER') {
      for (const [row0, cols] of perRowRaw) {
        const allowed = new Set<number>()
        for (const col0 of cols) {
          if (isCellLockedForManager(listName, row0, col0, store)) {
            hadLocked = true
            lockedCells.push({ row0, col0 })
          } else {
            allowed.add(col0)
          }
        }
        if (allowed.size) perRowAllowed.set(row0, allowed)
      }

      if (hadLocked) {
        revertLockedCells(ws, listName, lockedCells, store)
        try {
          useToast().add({
            title: 'Ячейка заблокирована',
            description: 'Некоторые изменения отклонены: у менеджера нет прав редактировать эти колонки.',
            color: 'warning',
            duration: 2800
          })
        } catch {}
      }
    }

    const perRow = me?.roleCode === 'ROLE_MANAGER' ? perRowAllowed : perRowRaw
    if (perRow.size === 0) return

    // 1) Валидация чисел
    {
      let invalid = false
      for (const [row0, cols] of perRow) {
        for (const col0 of cols) {
          if (!NUMERIC_COLS.has(col0)) continue
          const vFromPayload = cv[String(row0)]?.[String(col0)]?.v
          if (!isNumericOrEmpty(vFromPayload)) { invalid = true; break }
        }
        if (invalid) break
      }
      if (invalid) {
        // откатываем неверные числа (без undo)
        try { univerStore.beginQuiet?.() } catch {}
        try {
          for (const [row0, cols] of perRow) {
            for (const col0 of cols) {
              if (!NUMERIC_COLS.has(col0)) continue
              ws.getRange(row0, col0).setValue({ v: '' })
            }
          }
        } finally { try { univerStore.endQuiet?.() } catch {} }
        try {
          useToast().add({
            title: 'Только числа',
            description: 'В числовую колонку внесено текстовое значение или ошибка.',
            color: 'warning',
            duration: 3000,
            icon: 'i-lucide-alert-triangle'
          })
        } catch {}
        return
      }
    }

    // 2) Определяем строки к обработке (create/update)
    const getOld = (rec: TransportAccounting, col0: number): any => {
      switch (col0) {
        case 0:  return rec.dateOfPickup
        case 1:  return rec.numberOfContainer
        case 2:  return rec.cargo
        case 3:  return rec.typeOfContainer
        case 4:  return rec.dateOfSubmission
        case 5:  return rec.addressOfDelivery
        case 6:  return rec.ourFirm
        case 7:  return rec.client
        case 8:  return rec.formPayAs
        case 9:  return rec.summa
        case 10: return rec.numberOfBill
        case 11: return rec.dateOfBill
        case 12: return rec.datePayment
        case 13: return rec.contractor
        case 14: return rec.driver
        case 15: return rec.formPayHim
        case 16: return rec.contractorRate
        case 17: return rec.sumIssued
        case 18: return rec.numberOfBillAdd
        case 19: return rec.dateOfPaymentContractor
        case 20: return rec.manager
        case 21: return rec.departmentHead
        case 22: return rec.clientLead
        case 23: return rec.salesManager
        case 24: return rec.additionalExpenses
        case 25: return rec.income
        case 26: return rec.incomeLearned
        default: return ''
      }
    }

    const rowsToProcess: number[] = []
    for (const [row0, cols] of perRow) {
      const arr = (store.records as any)?.[listName] as TransportAccounting[] | undefined
      const prevRec = Array.isArray(arr) ? arr[row0 - 1] : undefined

      if (!prevRec) {
        let nonEmpty = false
        for (const c of cols) {
          const v = cv[String(row0)]?.[String(c)]?.v
          if (String(v ?? '').trim() !== '') { nonEmpty = true; break }
        }
        if (nonEmpty) rowsToProcess.push(row0)
        continue
      }

      let changed = false
      for (const c of cols) {
        const nv = cv[String(row0)]?.[String(c)]?.v
        if (String(nv ?? '').trim() !== String(getOld(prevRec, c) ?? '').trim()) { changed = true; break }
      }
      if (changed) rowsToProcess.push(row0)
    }
    if (!rowsToProcess.length) return

    // 3) Антидубль
    const key = (r: number) => `${listName}#${r}`
    for (const r of rowsToProcess) {
      if (processingRows.has(key(r))) return
      processingRows.add(key(r))
    }

    // 4) Патчим строку значениями из payload и делим на create/update
    const createDtos: any[] = []
    const updateDtos: any[] = []
    const createdRows: number[] = []

    try {
      for (const row0 of rowsToProcess) {
        const rowVals = ws.getRange(row0, 0, 1, 28).getValues()?.[0] ?? []
        const cols = perRow.get(row0)!
        for (const c of cols) {
          const vFromPayload = cv[String(row0)]?.[String(c)]?.v
          if (rowVals[c] && typeof rowVals[c] === 'object' && 'v' in rowVals[c]) rowVals[c].v = vFromPayload
          else rowVals[c] = { v: vFromPayload }
        }

        const idStr = String(rowVals?.[27]?.v ?? rowVals?.[27] ?? '').trim()
        const idNum = Number(idStr)
        const arr = (store.records as any)?.[listName] as TransportAccounting[] | undefined
        const prevRec = Array.isArray(arr) ? arr[row0 - 1] : undefined

        if (Number.isFinite(idNum) && idNum > 0) {
          let dto = { ...buildSR(rowVals, listName, idNum), id: idNum }
          const me2 = await getMe()
          if (me2?.roleCode === 'ROLE_MANAGER') {
            dto = maskDtoForManager(dto, listName, row0, store, prevRec)
          }
          updateDtos.push(dto)
        } else {
          if (rowHasData(rowVals)) {
            try { store.anchorCreateRow?.(listName, row0) } catch {}
            createDtos.push(buildSR(rowVals, listName))
            createdRows.push(row0)
          }
        }
      }

      if (!createDtos.length && !updateDtos.length) return

      if (createDtos.length) await store.addRecords(createDtos)
      if (updateDtos.length) await store.updateRecords(updateDtos)

      // Покрасим заблокированные колонки в созданных строках
      for (const r of createdRows) await paintManagerLockedColsOnRow(ws, r)

      const aws = wb.getActiveSheet()
      for (const r of rowsToProcess) highlightRow(aws, r)
    } catch (e) {
      console.error('[SheetValueChanged] create/update failed:', e)
    } finally {
      for (const r of rowsToProcess) processingRows.delete(key(r))
    }
  })

  // ====== Disposer ======
  return () => {
    try { (offEditEnded as any)?.dispose?.() } catch {}
    try { (offBeforePaste as any)?.dispose?.() } catch {}
    try { (offPasted as any)?.dispose?.() } catch {}
    try { (offValueChanged as any)?.dispose?.() } catch {}
  }
}
