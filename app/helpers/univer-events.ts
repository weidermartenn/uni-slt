import type { CellValue, IObjectMatrixPrimitiveType } from '@univerjs/core';
import type { FUniver } from '@univerjs/core/facade'
import { useSheetStore } from '~/stores/sheet-store'; // Assuming this is a Pinia store or similar for reactivityAssuming a composable for toast notifications

// Centralized Univer event registrations
export function registerUniverEvents(univerAPI: FUniver) {
  // Date columns: A, E, L, M, T -> indices 0, 4, 11, 12, 19
  const dateCols = new Set([0, 4, 11, 12, 19]);

  // Columns locked for managers (static list)
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27]);

  // Track rows where we already sent "add" to backend to avoid duplicates before socket response
  const requestedRows = new Set<string>();
  let batchPasteInProgress = false; // Flag to indicate if a paste operation is in progress

  // Lazy user fetch + helpers
  let cachedMe: any | undefined;
  const getMe = async () => {
    if (cachedMe !== undefined) return cachedMe;
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
    cachedMe = await $fetch('/api/authorization/me', { headers }).catch(() => null);
    return cachedMe;
  };

  /**
   * Converts an Excel-style column letter (e.g., 'A', 'B') to a 0-based column index.
   * @param letter The column letter.
   * @returns The 0-based column index.
   */
  const letterToColumnIndex = (letter: string): number => {
    return letter.charCodeAt(0) - 'A'.charCodeAt(0);
  };

  /**
   * Checks if a specific cell is locked for the manager role based on static and dynamic rules.
   * @param listName The name of the current sheet.
   * @param row The 0-based row index.
   * @param col The 0-based column index.
   * @param store The sheet store containing records.
   * @returns True if the cell is locked for the manager, false otherwise.
   */
  const isCellLockedForManager = (
    listName: string,
    row: number,
    col: number,
    store: ReturnType<typeof useSheetStore>
  ): boolean => {
    // Header row is never locked
    if (row <= 0) return false;

    // 1. Check static list of locked columns
    if (MANAGER_LOCKED_COLUMNS.has(col)) {
      return true;
    }

    // Column 0 (first column) is never locked by dynamic rules
    if (col === 0) return false;

    // 2. Check dynamic rules from the record itself
    const items = (store.records as any)?.[listName] as any[] | undefined;
    const rec = Array.isArray(items) ? items[row - 1] : undefined; // Assuming records array is 0-indexed and corresponds to 1-indexed sheet rows
    if (!rec || !rec.managerBlockListCell) return false;

    for (const range of rec.managerBlockListCell) {
      if (!range || range.length === 0) continue;

      if (range.length === 1 && typeof range[0] === 'string') {
        if (letterToColumnIndex(range[0]) === col) return true;
      } else if (range.length >= 2 && typeof range[0] === 'string' && typeof range[1] === 'string') {
        const start = letterToColumnIndex(range[0]);
        const end = letterToColumnIndex(range[1]);
        if (col >= start && col <= end) return true;
      }
    }

    return false;
  };

  /**
   * Recursively unwraps a Univer cell value object to its raw value.
   * @param x The raw cell value or a Univer value object.
   * @returns The unwrapped raw value.
   */
  const unwrapV = (x: any): any => (x && typeof x === 'object' && 'v' in x) ? unwrapV((x as any).v) : x;

  /**
   * Extracts and normalizes the string representation of a cell value, handling rich-text.
   * @param raw The raw cell value from Univer.
   * @returns The trimmed string representation of the cell value.
   */
  const toStr = (raw: any): string => {
    const val = unwrapV(raw);
    if (val == null) return '';
    if (typeof val === 'object') {
      // Handle rich-text cases: { t: string } or { p: segments }
      if (typeof (val as any).t === 'string') return (val as any).t.trim();
      const p = (val as any).p;
      if (Array.isArray(p)) {
        return p.map((seg: any) => {
          const s = seg?.s;
          if (s && typeof s === 'object' && 'v' in s) return String(unwrapV(s.v));
          return String(unwrapV(s));
        }).join('').trim();
      }
      return '';
    }
    return String(val).trim();
  };

  /**
   * Extracts and normalizes a date string from various formats to 'YYYY-MM-DD'.
   * @param raw The raw cell value that might contain a date string.
   * @returns The normalized date string 'YYYY-MM-DD' or null if not a valid date.
   */
  const normalizeDateInput = (raw: any): string | null => {
    const str = toStr(raw);
    if (!str) return null;

    // ISO format: YYYY-MM-DD
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // Dot format: DD.MM.YYYY
    const dot = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dot) {
      const [, dd, mm, yyyy] = dot;
      return `${yyyy}-${mm}-${dd}`;
    }

    // Try parsing with Date object as a last resort for other formats, then reformat
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0] || null;
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return null;
  };

  /**
   * Briefly highlights a row with a light-green theme style.
   * @param aws The active Univer worksheet.
   * @param row The 0-based row index to highlight.
   */
  const highlightRow = (aws: any, row: number) => {
    try {
      // Assuming a fixed range for highlighting (e.g., first 28 columns)
      const range = aws.getRange(row, 0, 1, 28);
      range.useThemeStyle('light-green');
      const currentTheme = range.getUsedThemeStyle(); // Get the applied theme to remove it later
      setTimeout(() => {
        try { range.removeThemeStyle(currentTheme); } catch (e) { console.warn('[univer-events] removeThemeStyle failed', e); }
      }, 1000);
    } catch (e) {
      console.warn('[univer-events] highlightRow failed', e);
    }
  };

  /**
   * Builds a service record (SR) DTO from an array of row values.
   * @param rowVals An array of cell values for a specific row.
   * @param listName The name of the sheet.
   * @param id Optional ID for existing records.
   * @returns The SR DTO object.
   */
  const buildSR = (rowVals: any[], listName: string, id: number = 0): any => {
    // Helper to safely get string value from rowVals
    const getVal = (index: number) => toStr(rowVals[index]);

    return {
      additionalExpenses: getVal(24),
      addressOfDelivery: getVal(5),
      cargo: getVal(2),
      client: getVal(7),
      clientLead: getVal(22),
      contractor: getVal(13),
      contractorRate: getVal(16),
      dateOfBill: getVal(11),
      dateOfPaymentContractor: getVal(19),
      dateOfPickup: getVal(0),
      dateOfSubmission: getVal(4),
      datePayment: getVal(12),
      departmentHead: getVal(21),
      driver: getVal(14),
      formPayAs: getVal(8),
      formPayHim: getVal(15),
      id, // ID will be added/updated during the request (don't set here for creation)
      listName,
      income: getVal(25),
      incomeLearned: getVal(26),
      manager: getVal(20),
      numberOfBill: getVal(10),
      numberOfBillAdd: getVal(18),
      numberOfContainer: getVal(1),
      ourFirm: getVal(6),
      salesManager: getVal(23),
      sumIssued: getVal(17),
      summa: getVal(9),
      taxes: '', // Taxes is missing from rowVals based on column mapping
      typeOfContainer: getVal(3),
    };
  };

  /**
   * Handles individual cell changes, including date validation and record creation/update.
   * @param row The 0-based row index of the changed cell.
   * @param col The 0-based column index of the changed cell.
   */
  const handleRowChange = async (row: number, col: number) => {
    const wb = univerAPI.getActiveWorkbook();
    if (!wb) { console.warn('[univer-events] No active workbook.'); return; }

    const aws = wb.getActiveSheet();
    const s = aws?.getSheet();
    if (!s) { console.warn('[univer-events] No active sheet.'); return; }

    if (row === 0) { console.log('[univer-events] Skip header row for change detection.'); return; }

    const a1 = aws.getRange(row, col).getA1Notation();
    console.log('[univer-events] Row change detected:', { a1, row, col });

    const listName = s.getName();
    const sheetStore = useSheetStore();

    // 1) Validate and normalize date inputs on specific columns
    if (dateCols.has(col)) {
      const cellValue = s.getCell(row, col);
      console.log('[univer-events] Date column change:', { a1, raw: cellValue });
      const normalizedDate = normalizeDateInput(cellValue);
      if (!normalizedDate) {
        console.warn('[univer-events] Invalid date format, attempting undo:', { a1, value: cellValue });
        await univerAPI.undo(); // Undo the invalid input
        try {
          const toast = useToast();
          toast.add({
            title: 'Значение не в формате даты',
            description: `В ячейке ${a1} значение не является датой.\nИспользуйте формат "YYYY-MM-DD" или "dd.mm.yyyy"`,
            color: 'error',
            duration: 3000,
          });
        } catch (e) { console.error('Failed to show toast:', e); }
        // Optimization: If date is invalid, prevent further processing of this cell
        return;
      } else {
        // If date is valid but was in a different format, normalize it in the sheet
        const currentCellValue = toStr(cellValue);
        if (currentCellValue !== normalizedDate) {
          console.log('[univer-events] Date normalized in sheet:', { a1, normalizedDate });
          const range = aws.getRange(row, col);
          range.setValue({ v: normalizedDate });
        }
      }
    }

    // 2) Create or update logic based on ID cell
    try {
      // Read the full row for processing
      const rowVals = aws.getRange(row, 0, 1, 28).getValues()?.[0] ?? [];
      const idCellStr = toStr(rowVals[27]); // ID column is 27

      const key = `${listName}#${row}`;
      console.log('[univer-events] Row audit for record:', { listName, row, idCellStr, key });

      // Check if the row has any data in the relevant columns (0-26)
      let hasData = false;
      for (let c = 0; c <= 26; c++) {
        if (toStr(rowVals[c])) {
          hasData = true;
          break;
        }
      }
      if (!hasData && !idCellStr) { // Only skip if no data AND no ID (i.e., truly empty new row)
        console.log('[univer-events] Row has no data and no ID, skipping:', { listName, row });
        return;
      }

      // Case A: id empty -> create new record
      if (!idCellStr) {
        if (requestedRows.has(key)) {
          console.log('[univer-events] Skipping: create request already in-flight for key', key);
          return;
        }

        const dto = buildSR(rowVals, listName);
        console.log('[univer-events] CREATE: sending addRecords', { listName, key, dto });
        requestedRows.add(key); // Mark as in-flight
        try {
          sheetStore.anchorCreateRow(listName, row)
          await sheetStore.addRecords([dto]);
          console.log('[univer-events] CREATE: request sent, awaiting socket update for row', row);
          // Highlight immediately if not loading (visual feedback)
          if (sheetStore.loading === false) highlightRow(aws, row);
        } catch (e) {
          console.error('[univer-events] CREATE failed for row', row, ':', e);
          // Optionally show an error toast here
        } finally {
          requestedRows.delete(key); // Remove from in-flight
          console.log('[univer-events] CREATE: cleanup request flag for row', key);
        }
        return;
      }

      // Case B: id present -> update existing record
      try {
        const idNum = Number(idCellStr);
        if (!Number.isFinite(idNum) || idNum <= 0) { // ID must be a positive number
          console.log('[univer-events] UPDATE: ID is not numeric or invalid, skipping:', { idCellStr, row });
          return;
        }

        const updateDto = {
          ...buildSR(rowVals, listName, idNum),
          id: idNum, // Ensure ID is explicitly set for update
        };
        console.log('[univer-events] UPDATE: sending updateRecords', { listName, idNum, updateDto });
        await sheetStore.updateRecords([updateDto]);
        console.log('[univer-events] UPDATE: success for row', row, 'ID', idNum);
        if (sheetStore.loading === false) highlightRow(aws, row);
      } catch (e) {
        console.error('[univer-events] UPDATE failed for row', row, ':', e);
        // Optionally show an error toast here
      }
    } catch (e) {
      console.error('[univer-events] handleRowChange handler failed for row', row, ':', e);
    }
  };

  // Event listener for when a cell edit ends
  const offEditEnded = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, async (params: any) => {
    // If a batch paste is in progress, individual cell changes from paste should be ignored
    if (batchPasteInProgress) {
      console.log('[univer-events] SheetEditEnded ignored due to batchPasteInProgress.');
      return;
    }

    const { row, column: col } = params; // Univer uses 'column' for 0-based column index

    const me = await getMe();
    const isManager = me?.roleCode === 'ROLE_MANAGER';
    const sheetStore = useSheetStore();
    const wb = univerAPI.getActiveWorkbook();
    const aws = wb?.getActiveSheet();
    const s = aws?.getSheet();

    if (!s) { console.warn('[univer-events] SheetEditEnded: No active sheet.'); return; }
    if (row === 0) { console.log('[univer-events] SheetEditEnded: Skip header row.'); return; }

    const listName = s.getName();

    // Manager lock check
    if (isManager && isCellLockedForManager(listName, row, col, sheetStore)) {
      console.warn('[univer-events] Manager attempted to edit locked cell:', { listName, row, col });
      await univerAPI.undo(); // Undo manager's edit
      try {
        const toast = useToast();
        toast.add({
          title: 'Ячейка заблокирована',
          description: 'Редактирование этой ячейки запрещено для вашей роли.',
          color: 'warning',
          duration: 2500,
        });
      } catch (e) { console.error('Failed to show toast:', e); }
      return;
    }

    // const isAdminOrBuh = me?.roleCode === 'ROLE_ADMIN' || me?.roleCode === 'ROLE_BUH'
    // if (isAdminOrBuh && (col === 25 || col === 26 || col === 27) && row > 0) {
    //   const newVal = s.getCell(row, col)
    //   if (toStr(newVal)) {
    //     await univerAPI.undo();
    //     try {
    //       const toast = useToast();
    //       toast.add({
    //         title: 'Ячейка заблокирована',
    //         description: 'Редактирование этой ячейки запрещено для вашей роли.',
    //         color: 'warning',
    //         duration: 2500,
    //       })
    //     } catch {}  
    //   }
    //   return
    // }

    await handleRowChange(row, col);
  });

  // Helper to normalize numeric strings (remove spaces, replace comma with dot)
  const normalizeNumberStr = (raw: any): string => {
    const s = (raw ?? '').toString();
    if (!s) return '';
    return s.replace(/\s+/g, '').replace(',', '.');
  };

  // Pre-paste event handling for data normalization (dates, numbers)
  const offBeforePaste = univerAPI.addEvent(univerAPI.Event.BeforeClipboardPaste, async (params: any) => {
    batchPasteInProgress = true; // Set flag at the start of paste operation

    const wb = univerAPI.getActiveWorkbook();
    const aws = wb?.getActiveSheet();
    // Get the start column of the active selection where paste will begin
    const startCol = aws?.getSelection()?.getActiveRange?.()?.getRange().startColumn ?? 0;

    // Columns that should be treated as numeric
    const numericCols = new Set([9, 16, 17, 24, 25, 26]);

    let changed = false; // Flag to indicate if any data was modified

    // Function to apply normalization rules to a single cell value
    const normalizeCellValue = (val: any, absColIndex: number): any => {
      if (dateCols.has(absColIndex)) {
        return normalizeDateInput(val) ?? val; // Keep original if date is invalid after normalization
      }
      if (numericCols.has(absColIndex)) {
        return normalizeNumberStr(val);
      }
      return val;
    };

    // 0) Plain text (tab-separated) normalization
    if (typeof (params as any)?.text === 'string') {
      const rows = ((params as any).text as string).split(/\r?\n/);
      const normRows = rows.map((line: string) => {
        if (!line) return line;
        const cols = line.split('\t');
        return cols
          .map((cell, cIdx) => {
            const absCol = startCol + cIdx;
            const normalized = normalizeCellValue(cell, absCol);
            if (normalized !== cell) changed = true;
            return normalized;
          })
          .join('\t');
      });
      const nextText = normRows.join('\n');
      if (nextText !== (params as any).text) {
        (params as any).text = nextText;
        changed = true;
      }
    }

    // 1) Normalize HTML payload for dates (Univer might prefer HTML over text)
    // This is a simple regex replacement for common date formats within HTML
    if (typeof (params as any)?.html === 'string') {
      const prevHtml = (params as any).html as string;
      const nextHtml = prevHtml.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`);
      if (nextHtml !== prevHtml) {
        (params as any).html = nextHtml;
        changed = true;
      }
    }

    // 2) Normalize structured data (e.g., from other Univer sheets or Excel)
    const data = (params as any)?.data ?? (params as any)?.clipboardData;
    if (data) {
      if (typeof data.html === 'string') {
        const prevHtml = data.html as string;
        const nextHtml = prevHtml.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`);
        if (nextHtml !== prevHtml) { data.html = nextHtml; changed = true; }
      }
      if (Array.isArray(data.cells)) {
        data.cells = data.cells.map((row: any[], rIdx: number) => Array.isArray(row)
          ? row.map((cell: any, cIdx: number) => {
              const absCol = startCol + cIdx;
              const normalized = normalizeCellValue(cell, absCol);
              if (normalized !== cell) changed = true;
              return normalized;
            })
          : row);
      }
    }

    // 3) Normalize directly provided cells array (another possible structure)
    if (Array.isArray((params as any)?.cells)) {
      (params as any).cells = (params as any).cells.map((row: any[], rIdx: number) => Array.isArray(row)
        ? row.map((cell: any, cIdx: number) => {
            const absCol = startCol + cIdx;
            const normalized = normalizeCellValue(cell, absCol);
            if (normalized !== cell) changed = true;
            return normalized;
          })
        : row);
    }

    // Univer's paste mechanism might sometimes re-read the clipboard after BeforeClipboardPaste.
    // If we modified `params.text` or `params.html`, Univer should use the modified version.
    // If `params.cells` or `params.data.cells` were modified, Univer should use those for direct cell insertion.
    // The `changed` flag indicates if any normalization occurred.
    if (changed) {
      console.log('[univer-events] BeforeClipboardPaste: Data normalized during paste preparation.');
    }
  });


  // Event listener for after clipboard paste has completed
  const offPasted = univerAPI.addEvent(univerAPI.Event.ClipboardPasted, async (params: any) => {
  const wb = univerAPI.getActiveWorkbook();
  const aws = wb?.getActiveSheet();
  const s = aws?.getSheet();
  if (!wb || !aws || !s) {
    console.warn('[univer-events] ClipboardPasted: No active workbook or sheet.');
    batchPasteInProgress = false; // гарантия снятия флага
    return;
  }

  try {
    // 1) Выясняем фактический прямоугольник вставки
    const activeRange = aws.getSelection()?.getActiveRange?.()?.getRange();
    if (!activeRange) {
      console.warn('[univer-events] ClipboardPasted: No active range after paste.');
      return;
    }

    const startRow = activeRange.startRow;
    const endRow = activeRange.endRow;
    const startCol = activeRange.startColumn;
    const endCol = activeRange.endColumn;

    const listName = s.getName();
    const sheetStore = useSheetStore();

    // 2) Блокируем вставку в запрещённые для менеджера клетки
    const me = await getMe();
    const isManager = me?.roleCode === 'ROLE_MANAGER';
    if (isManager) {
      for (let r = Math.max(1, startRow); r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          if (isCellLockedForManager(listName, r, c, sheetStore)) {
            console.warn('[univer-events] Manager attempted to paste into a locked row/cell:', { listName, row: r, startCol, endCol });
            await univerAPI.undo();
            try {
              const toast = useToast();
              toast.add({
                title: 'Строка/Ячейка заблокирована',
                description: 'Вставка запрещена в заблокированную строку или ячейку.',
                color: 'warning',
                duration: 3500,
              });
            } catch (e) { console.error('Failed to show toast:', e); }
            return;
          }
        }
      }
    }

    // 3) Повторная нормализация уже вставленного — прямо в таблице
    // (если BeforePaste что-то пропустил или Univer перезачитал данные)
    const numericCols = new Set([9, 16, 17, 24, 25, 26]); // сумма/ставки/доходы и т.п.

    const actualStartRow = Math.max(1, startRow); // пропускаем заголовок
    const rowsToProcess = endRow - actualStartRow + 1;
    const colsToProcess = endCol - startCol + 1;

    if (rowsToProcess > 0 && colsToProcess > 0) {
      const block = aws.getRange(actualStartRow, startCol, rowsToProcess, colsToProcess);

      // Univer возвращает Nullable<CellValue>[][], а setValues не любит undefined.
      const rawValues = block.getValues() as (CellValue | null | undefined)[][];
      const changes: IObjectMatrixPrimitiveType<CellValue> = {};
      let changedSomething = false;

      for (let r = 0; r < rowsToProcess; r++) {
        const row = rawValues[r] ?? [];
        for (let c = 0; c < colsToProcess; c++) {
          const absCol = startCol + c;
          const v = row[c];
          if (v == null) continue; // не трогаем пустые — избежим массовой записи ''

          const originalStr = toStr(v);
          let next: string | null = null;

          if (dateCols.has(absCol)) {
            const normalizedDate = normalizeDateInput(originalStr);
            if (normalizedDate && normalizedDate !== originalStr) {
              next = normalizedDate;
            }
          } else if (numericCols.has(absCol)) {
            const normalizedNumber = normalizeNumberStr(originalStr);
            if (normalizedNumber !== originalStr) {
              next = normalizedNumber;
            }
          }

          if (next != null) {
            (changes[r] ??= {})[c] = next as CellValue; // пишем только то, что реально поменяли
            changedSomething = true;
          }
        }
      }

      if (changedSomething) {
        block.setValues(changes); // разрежённая матрица: без undefined и без перезаписи пустых
        console.log('[univer-events] ClipboardPasted: in-place normalization applied.');
      }
    }

    // 4) Готовим батчи на создание/обновление
    const createDtos: any[] = [];
    const updateDtos: any[] = [];

    for (let r = Math.max(1, startRow); r <= endRow; r++) {
      const rowVals = (aws.getRange(r, 0, 1, 28).getValues()?.[0] as (CellValue | null | undefined)[]) ?? [];
      const idStr = toStr(rowVals[27]); // ID в 28-м столбце (индекс 27)

      // Есть ли данные в 0..26 (кроме ID)
      let hasData = false;
      for (let c = 0; c <= 26; c++) {
        if (toStr(rowVals[c])) { hasData = true; break; }
      }
      if (!hasData && !idStr) continue; // пустая строка — пропускаем

      if (idStr && Number.isFinite(Number(idStr)) && Number(idStr) > 0) {
        const idNum = Number(idStr);
        const updateDto = buildSR(rowVals as any[], listName, idNum);
        updateDtos.push(updateDto);
      } else if (hasData) {
        const createDto = buildSR(rowVals as any[], listName);
        createDtos.push(createDto);
      }
    }

    if (createDtos.length) {
      console.log('[univer-events] PASTE: Sending addRecords batch', { count: createDtos.length });
      await sheetStore.addRecords(createDtos);
    }
    if (updateDtos.length) {
      console.log('[univer-events] PASTE: Sending updateRecords batch', { count: updateDtos.length });
      await sheetStore.updateRecords(updateDtos);
    }

    // 5) Подсветка затронутых строк — чуть-чуть «допамина» UX
    if (createDtos.length || updateDtos.length) {
      for (let r = Math.max(1, startRow); r <= endRow; r++) {
        const rowVals = (aws.getRange(r, 0, 1, 28).getValues()?.[0] as (CellValue | null | undefined)[]) ?? [];
        let hasDataAfterPaste = false;
        for (let c = 0; c <= 26; c++) { if (toStr(rowVals[c])) { hasDataAfterPaste = true; break; } }
        if (hasDataAfterPaste || toStr(rowVals[27])) {
          highlightRow(aws, r);
        }
      }
    }
  } catch (e) {
    console.error('[univer-events] paste handler failed:', e);
    // тут по желанию можно показать общий тост об ошибке
  } finally {
    batchPasteInProgress = false; // флаг снимаем всегда; иначе последующие редактирования «замёрзнут»
  }
});

  // Return disposer to allow cleanup by caller if needed
  return () => {
    try { (offEditEnded as any)?.dispose?.(); } catch (e) { console.error('Failed to dispose offEditEnded', e); }
    try { (offBeforePaste as any)?.dispose?.(); } catch (e) { console.error('Failed to dispose offBeforePaste', e); }
    try { (offPasted as any)?.dispose?.(); } catch (e) { console.error('Failed to dispose offPasted', e); }
  };
}