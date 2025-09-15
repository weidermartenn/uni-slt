import type { FUniver } from '@univerjs/presets';
import { useSheetStore } from '~/stores/sheet-store';

// Centralized Univer event registrations
export function registerUniverEvents(univerAPI: FUniver) {
  // Date columns: A, E, L, M, T -> indices 0, 4, 11, 12, 19
  const dateCols = new Set([0, 4, 11, 12, 19]);

  // Track rows where we already sent "add" to backend to avoid duplicates before socket response
  const requestedRows = new Set<string>();

  // Extract raw cell value -> string
  const toStr = (raw: any): string => String((raw && typeof raw === 'object' && 'v' in raw) ? (raw as any).v : (raw ?? '')).trim();

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

  const offEditEnded = univerAPI.addEvent(univerAPI.Event.SheetEditEnded, async (params: any) => {
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

        // 2. set temporary id
        const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        console.log('[univer-events] CREATE: set temp id', { key, tempId });
        aws.getRange(row, 27).setValue({ v: String(tempId) });

        // 3. send add request
        const dto = buildSR();
        console.log('[univer-events] CREATE: sending addRecords', { listName, key, dto });
        requestedRows.add(key);
        try {
          const res: any = await sheetStore.addRecords([dto]);
          console.log('[univer-events] CREATE: server response', res);

          const created = res?.object?.[0] ?? (res as any)?.transportAccountingDto?.[0] ?? (res as any)?.body?.object?.[0] ?? (res as any)?.body?.transportAccountingDto?.[0];
          if (!created) {
            console.warn('[univer-events] CREATE: no created entity in response');
          } else {
            const realId = created?.id;
            console.log('[univer-events] CREATE: resolved real id', { realId });
            // Build row values from server entity
            const rowValues: any[] = [
              created?.dateOfPickup ?? '',
              created?.numberOfContainer ?? '',
              created?.cargo ?? '',
              created?.typeOfContainer ?? '',
              created?.dateOfSubmission ?? '',
              created?.addressOfDelivery ?? '',
              created?.ourFirm ?? '',
              created?.client ?? '',
              created?.formPayAs ?? '',
              created?.summa ?? '',
              created?.numberOfBill ?? '',
              created?.dateOfBill ?? '',
              created?.datePayment ?? '',
              created?.contractor ?? '',
              created?.driver ?? '',
              created?.formPayHim ?? '',
              created?.contractorRate ?? '',
              created?.sumIssued ?? '',
              created?.numberOfBillAdd ?? '',
              created?.dateOfPaymentContractor ?? '',
              created?.manager ?? '',
              created?.departmentHead ?? '',
              created?.clientLead ?? '',
              created?.salesManager ?? '',
              created?.additionalExpenses ?? '',
              created?.income ?? '',
              created?.incomeLearned ?? '',
              created?.id ?? ''
            ];
            try {
              const range = aws.getRange(row, 0, 1, 28);
              // Set as objects { v } to be explicit
              const matrix = [rowValues.map(v => ({ v }))];
              range.setValues(matrix);
              console.log('[univer-events] CREATE: row values set from server entity', { key, row });
            } catch (e2) {
              console.error('[univer-events] CREATE: failed to set full row values, fallback to ID only', e2);
              if (realId) aws.getRange(row, 27).setValue({ v: String(realId) });
            }
          }
        } catch (e) {
          // rollback temp id on failure
          aws.getRange(row, 27).setValue({ v: '' });
          console.error('[univer-events] CREATE failed, rollback temp id:', { key, error: e });
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
      } catch (e) {
        console.error('[univer-events] UPDATE failed', e);
      }
    } catch (e) {
      console.error('[univer-events] handler failed:', e);
    }
  });

  // Return disposer to allow cleanup by caller if needed
  return () => {
    try { (offEditEnded as any)?.dispose?.(); } catch {}
  };
}