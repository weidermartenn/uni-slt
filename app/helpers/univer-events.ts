import type { FUniver } from '@univerjs/presets';
import { useSheetStore } from '~/stores/sheet-store';

// Centralized Univer event registrations
export function registerUniverEvents(univerAPI: FUniver) {
  // Date columns: A, E, L, M, T -> indices 0, 4, 11, 12, 19
  const dateCols = new Set([0, 4, 11, 12, 19]);

  // Track rows where we already sent "add" to backend to avoid duplicates before socket response
  const requestedRows = new Set<string>();
  let batchPasteInProgress = false;

  // Lazy user fetch + helpers
  let cachedMe: any | undefined;
  const getMe = async () => {
    if (cachedMe !== undefined) return cachedMe;
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
    cachedMe = await $fetch('/api/auth/me', { headers }).catch(() => null);
    return cachedMe;
  };

  const isRowLockedForManager = (listName: string, row: number, store: ReturnType<typeof useSheetStore>) => {
    if (row <= 0) return false;
    const items = (store.records as any)?.[listName] as any[] | undefined;
    const rec = Array.isArray(items) ? items[row - 1] : undefined;
    return !!(rec?.managerBlock);
  };

  // Extract raw cell value -> string (deeply unwraps { v: ... } and rich-text)
  const unwrapV = (x: any): any => (x && typeof x === 'object' && 'v' in x) ? unwrapV((x as any).v) : x;
  const toStr = (raw: any): string => {
    const val = unwrapV(raw);
    if (val == null) return '';
    if (typeof val === 'object') {
      // Rich-text cases: { t: string } or { p: segments }
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

  // Extract date from mixed strings and normalize to YYYY-MM-DD
  const normalizeDateInput = (raw: any): string | null => {
    const str = toStr(raw);
    if (!str) return null;
    const iso = str.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dot = str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (dot) {
      const [, dd, mm, yyyy] = dot;
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  const highlightRow = (aws: any, row: number) => {
    try {
      const range = aws.getRange(row, 0, 1, 28);
      range.useThemeStyle('light-green');
      const currentTheme = range.getUsedThemeStyle();
      setTimeout(() => {
        try { range.removeThemeStyle(currentTheme); } catch {}
      }, 1000);
    } catch (e) {
      console.warn('[univer-events] highlightRow failed', e);
    }
  };

  const buildSR = (rowVals: any[]): any => {
    return {
      additionalExpenses: rowVals[24] ?? '',
      addressOfDelivery: rowVals[5] ?? '',
      cargo: rowVals[2] ?? '',
      client: rowVals[7] ?? '',
      clientLead: rowVals[22] ?? '',
      contractor: rowVals[13] ?? '',
      contractorRate: rowVals[16] ?? '',
      dateOfBill: rowVals[11] ?? '',
      dateOfPaymentContractor: rowVals[19] ?? '',
      dateOfPickup: rowVals[0] ?? '',
      dateOfSubmission: rowVals[4] ?? '',
      datePayment: rowVals[12] ?? '',
      departmentHead: rowVals[21] ?? '',
      driver: rowVals[14] ?? '',
      formPayAs: rowVals[8] ?? '',
      formPayHim: rowVals[15] ?? '',
      id: 0, // ID will be added/updated during the request (don't set here for creation)
      listName: '', // Set appropriate list name here if necessary
      income: rowVals[25] ?? '',
      incomeLearned: rowVals[26] ?? '',
      manager: rowVals[20] ?? '',
      numberOfBill: rowVals[10] ?? '',
      numberOfBillAdd: rowVals[18] ?? '',
      numberOfContainer: rowVals[1] ?? '',
      ourFirm: rowVals[6] ?? '',
      salesManager: rowVals[23] ?? '',
      sumIssued: rowVals[17] ?? '',
      summa: rowVals[9] ?? '',
      taxes: '', // Set appropriate value here if necessary
      typeOfContainer: rowVals[3] ?? '',
    };
  };

  const offEditEnded = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, async (params: any) => {
    if (batchPasteInProgress) { return; }
    const col = params.column;
    const row = params.row;

    const wb = univerAPI.getActiveWorkbook();
    if (!wb) return;

    const aws = wb.getActiveSheet();
    const s = aws.getSheet();
    if (!s) return;

    const a1 = aws.getRange(row, col).getA1Notation();
    console.log('[univer-events] SheetEditEnded:', { a1, row, col });

    // 1) Validate and normalize date inputs on specific columns
    if (dateCols.has(col)) {
      const cellValue = s.getCell(row, col);
      console.log('[univer-events] Date check:', { a1, raw: cellValue });
      const normalizedDate = normalizeDateInput(cellValue);
      if (!normalizedDate) {
        console.warn('[univer-events] Invalid date, undo:', { a1, value: cellValue });
        await univerAPI.undo();
        try {
          const toast = useToast();
          toast.add({
            title: 'Значение не в формате даты',
            description: `В ячейке ${a1} значение не является датой\nИспользуйте формат "YYYY-MM-DD" или "dd.mm.yyyy"`,
            color: 'error',
            duration: 3000,
          });
        } catch {}
      } else {
        console.log('[univer-events] Date normalized:', { a1, normalizedDate });
        const range = aws.getRange(row, col);
        range.setValue({ v: normalizedDate });
      }
    }

    // 1.1) Block edits for managers on managerBlock rows (except ID column 27)
    try {
      const me = await getMe();
      const isManager = me?.roleCode === 'ROLE_MANAGER';
      const sheetStore = useSheetStore();
      const ID_COL = 27;
      if (isManager) {
        const listName = s.getName();
        if (isRowLockedForManager(listName, row, sheetStore) && col !== ID_COL) {
          await univerAPI.undo();
          try {
            const toast = useToast();
            toast.add({
              title: 'Строка заблокирована',
              description: 'Эту строку нельзя редактировать (managerBlock)',
              color: 'warning',
              duration: 2500,
            });
          } catch {}
          return;
        }
      }
    } catch {}

    // 2) Create or update logic based on ID cell
    try {
      if (row <= 0) { console.log('[univer-events] Skip header row'); return; }

      const idCellStr = toStr(s.getCell(row, 27)); // ID column
      const listName = s.getName();
      const key = `${listName}#${row}`;
      console.log('[univer-events] Row audit:', { listName, row, idCellStr, key });

      // helper to read full row into SR
      const V = (c: number) => toStr(s.getCell(row, c));
      const buildSR = (): any => ({
        additionalExpenses: V(24),
        addressOfDelivery: V(5),
        cargo: V(2),
        client: V(7),
        clientLead: V(22),
        contractor: V(13),
        contractorRate: V(16),
        dateOfBill: V(11),
        dateOfPaymentContractor: V(19),
        dateOfPickup: V(0),
        dateOfSubmission: V(4),
        datePayment: V(12),
        departmentHead: V(21),
        driver: V(14),
        formPayAs: V(8),
        formPayHim: V(15),
        id: 0,
        listName,
        income: V(25),
        incomeLearned: V(26),
        manager: V(20),
        numberOfBill: V(10),
        numberOfBillAdd: V(18),
        numberOfContainer: V(1),
        ourFirm: V(6),
        salesManager: V(23),
        sumIssued: V(17),
        summa: V(9),
        taxes: '',
        typeOfContainer: V(3),
      });

      const sheetStore = useSheetStore();

      // If empty row - skip unless it has any data
      let hasData = false;
      for (let c = 0; c <= 26; c++) { if (toStr(s.getCell(row, c))) { hasData = true; break; } }
      if (!hasData) { console.log('[univer-events] Row has no data, skip:', { listName, row }); return; }

      // Case A: id empty -> create
      if (!idCellStr) {
        if (requestedRows.has(key)) { console.log('[univer-events] Skip: request already in-flight for key', key); return; }

        // 2. send add request (no local UI mutation here; wait for socket + watch)
        const dto = buildSR();
        console.log('[univer-events] CREATE: sending addRecords', { listName, key, dto });
        requestedRows.add(key);
        try {
          await sheetStore.addRecords([dto]);
          console.log('[univer-events] CREATE: request sent, awaiting socket update');
          if (sheetStore.loading === false) highlightRow(aws, row);
        } catch (e) {
          console.error('[univer-events] CREATE failed:', { key, error: e });
        } finally {
          requestedRows.delete(key);
          console.log('[univer-events] CREATE: cleanup request flag', { key });
        }
        return;
      }

      // Case B: id present -> update
      try {
        const idNum = Number(idCellStr);
        if (!Number.isFinite(idNum)) { console.log('[univer-events] UPDATE: id is not numeric yet, skip', { idCellStr }); return; }

        const updateDto: any = {
          ...buildSR(),
          id: idNum,
        };
        console.log('[univer-events] UPDATE: sending updateRecords', { listName, idNum, updateDto });
        await sheetStore.updateRecords([updateDto]);
        console.log('[univer-events] UPDATE: success', { listName, idNum });
        if (sheetStore.loading === false) highlightRow(aws, row);
      } catch (e) {
        console.error('[univer-events] UPDATE failed', e);
      }
    } catch (e) {
      console.error('[univer-events] handler failed:', e);
    }
  });

  // Clipboard paste handling (multi-row)
  const offBeforePaste = univerAPI.addEvent(univerAPI.Event.BeforeClipboardPaste, async (params: any) => {
    batchPasteInProgress = true;
    const { text, html } = params;

    const wb = univerAPI.getActiveWorkbook();
    const aws = wb?.getActiveSheet();
    const startCol = aws?.getSelection()?.getActiveRange?.()?._range?.startColumn ?? 0;

    const isNumericCol = (absColIndex: number) => new Set([9, 16, 17, 24, 25, 26]).has(absColIndex);

    const normalizeCellIfDateCol = (val: any, absColIndex: number) => {
      if (!dateCols.has(absColIndex)) return val;
      const normalized = normalizeDateInput(val);
      return normalized;
    };

    const normalizeNumberStr = (raw: any): string => {
      const s = (raw ?? '').toString();
      if (!s) return '';
      return s.replace(/\s+/g, '').replace(',', '.');
    };

    let changed = false;

    // 0) Plain text (tab-separated) normalization for date and numeric cols
    if (typeof (params as any)?.text === 'string') {
      const rows = ((params as any).text as string).split(/\r?\n/);
      const normRows = rows.map((line: string) => {
        if (!line) return line;
        const cols = line.split('\t');
        return cols
          .map((cell, cIdx) => {
            const absCol = startCol + cIdx;
            if (dateCols.has(absCol)) {
              return normalizeDateInput(cell) ?? cell;
            }
            if (isNumericCol(absCol)) {
              return normalizeNumberStr(cell);
            }
            return cell;
          })
          .join('\t');
      });
      const next = normRows.join('\n');
      if (next !== (params as any).text) {
        (params as any).text = next;
        changed = true;
      }
    }

    // Normalize HTML payload (Univer may prefer HTML over text)
    if (typeof (params as any)?.html === 'string') {
      const prev = (params as any).html as string;
      const next = prev.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`);
      if (next !== prev) {
        (params as any).html = next;
        changed = true;
      }
    }

    // Normalize table-shaped payloads aligned to paste anchor column
    const data = (params as any)?.data ?? (params as any)?.clipboardData;
    if (data) {
      if (typeof data.html === 'string') {
        const prev = data.html as string;
        const next = prev.replace(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g, (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`);
        if (next !== prev) { data.html = next; changed = true; }
      }
      if (Array.isArray(data.cells)) {
        data.cells = data.cells.map((row: any) => Array.isArray(row)
          ? row.map((cell: any, cIdx: number) => {
              const absCol = startCol + cIdx;
              if (dateCols.has(absCol)) {
                const nv = normalizeCellIfDateCol(cell, absCol);
                if (nv !== cell) changed = true;
                return nv;
              }
              if (isNumericCol(absCol)) {
                const nv = normalizeNumberStr(cell);
                if (nv !== cell) changed = true;
                return nv;
              }
              return cell;
            })
          : row);
      }
    }

    if (Array.isArray((params as any)?.cells)) {
      (params as any).cells = (params as any).cells.map((row: any) => Array.isArray(row)
        ? row.map((cell: any, cIdx: number) => {
            const absCol = startCol + cIdx;
            if (dateCols.has(absCol)) {
              const nv = normalizeCellIfDateCol(cell, absCol);
              if (nv !== cell) changed = true;
              return nv;
            }
            if (isNumericCol(absCol)) {
              return normalizeNumberStr(cell);
            }
            return cell;
          })
        : row);
    }
  });

  // Clipboard pasted event
  const offPasted = univerAPI.addEvent(univerAPI.Event.ClipboardPasted, async (params: any) => {
    const wb = univerAPI.getActiveWorkbook();
    const aws = wb?.getActiveSheet();
    const s = aws?.getSheet();
    if (!wb || !aws || !s) return;

    try {
      batchPasteInProgress = true;

      // Determine pasted rectangle from selection (active range after paste)
      const ar = aws.getSelection()?.getActiveRange?.();
      const startRow = (ar?._range?.startRow ?? 0);
      const endRow = (ar?._range?.endRow ?? startRow);
      const startCol = (ar?._range?.startColumn ?? 0);
      const endCol = (ar?._range?.endColumn ?? startCol);

      const listName = s.getName();
      const sheetStore = useSheetStore();

      // Prevent paste into locked rows for managers
      try {
        const me = await getMe();
        const isManager = me?.roleCode === 'ROLE_MANAGER';
        if (isManager) {
          for (let r = Math.max(1, startRow); r <= endRow; r++) {
            if (isRowLockedForManager(listName, r, sheetStore)) {
              await univerAPI.undo();
              try {
                const toast = useToast();
                toast.add({
                  title: 'Строка заблокирована',
                  description: 'Вставка запрещена в заблокированную строку (managerBlock)',
                  color: 'warning',
                  duration: 2500,
                });
              } catch {}
              return; // abort handling
            }
          }
        }
      } catch {}

      // Post-normalize pasted cells in-place (UI + source for DTOs)
      const isNumericCol = (absColIndex: number) => new Set([9, 16, 17, 24, 25, 26]).has(absColIndex);
      const normalizeNumberStr = (raw: any): string => {
        const x = (raw ?? '').toString();
        if (!x) return '';
        return x.replace(/\s+/g, '').replace(',', '.');
      };

      const sr = Math.max(1, startRow);
      const rows = endRow - sr + 1;
      const cols = endCol - startCol + 1;

      if (rows > 0 && cols > 0) {
        const block = aws.getRange(sr, startCol, rows, cols);
        const values = block.getValues();

        for (let r = 0; r < rows; r++) {
          const row = values[r];
          if (!row) continue;
          for (let c = 0; c < cols; c++) {
            const absCol = startCol + c;
            const cellValue = row[c];
            if (cellValue == null) continue;
            if (dateCols.has(absCol)) {
              const nv = normalizeDateInput(cellValue);
              if (typeof nv === 'string') row[c] = nv;
            } else if (isNumericCol(absCol)) {
              const raw = toStr(cellValue);
              const nv = normalizeNumberStr(raw);
              if (nv !== raw) row[c] = nv;
            }
          }
        }
        const cleanedValues = values.map(row => row.map(cell => cell ?? ''));
        block.setValues(cleanedValues);
      }

      // Collect rows with or without ID that contain data
      const createDtos: any[] = [];
      const updateDtos: any[] = [];
      for (let r = sr; r <= endRow; r++) {
        const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? [];
        const idStr = toStr(rowVals[27]);

        // check any data in visible columns (0..26)
        let hasData = false;
        for (let c = 0; c <= 26; c++) { if (rowVals[c]) { hasData = true; break; } }
        if (!hasData) continue;

        if (idStr) {
          console.log('[univer-events] updating existing row', idStr);
          const updateDto = {
            ...buildSR(rowVals),
            id: Number(idStr),
          };
          updateDtos.push(updateDto);
        } else {
          const createDto = buildSR(rowVals);
          createDtos.push(createDto);
        }
      }

      if (createDtos.length) {
        console.log('[univer-events] PASTE: addRecords batch', { count: createDtos.length });
        console.log('[univer-events] PASTE: createDtos', createDtos);
        await sheetStore.addRecords(createDtos);
      }

      if (updateDtos.length) {
        console.log('[univer-events] PASTE: updateRecords batch', { count: updateDtos.length });
        console.log('[univer-events] PASTE: updateDtos', updateDtos);
        await sheetStore.updateRecords(updateDtos);
      }

      if (createDtos.length || updateDtos.length) {
        // highlight all affected rows briefly
        for (let r = Math.max(1, startRow); r <= endRow; r++) {
          const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? [];
          let hasData = false;
          for (let c = 0; c <= 26; c++) { if (toStr(rowVals[c])) { hasData = true; break; } }
          if (hasData) highlightRow(aws, r);
        }
      }
    } catch (e) {
      console.error('[univer-events] paste handler failed', e);
    } finally {
      batchPasteInProgress = false;
    }
  });

  // Return disposer to allow cleanup by caller if needed
  return () => {
    try { (offEditEnded as any)?.dispose?.(); } catch {}
    try { (offBeforePaste as any)?.dispose?.(); } catch {}
    try { (offPasted as any)?.dispose?.(); } catch {}
  };
}
