// univer-events.ts
import type { FUniver } from "@univerjs/presets";
import { useToast } from "#imports";
import { useSheetStore } from "~/stores/sheet-store-optimized";
import { useUniverStore } from "~/stores/univer-store";
import { getUser } from "./getUser";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import { rpcClient } from '~/composables/univerWorkerClient'
import { checkKPP } from "~/pages/sheet/chechKPP";


export function registerUniverEvents(univerAPI: FUniver) {
  const config = useRuntimeConfig();
  const kingsApiBase = config.public.kingsApiBase

  // ====== Константы/флаги ======
  const dateCols = new Set([0, 4, 11, 12, 19]); // A,E,L,M,T (0-based)
  // ВСЕГДА заблокированные для менеджера: E,K,L,M,R,T,Z,AA,AB
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27]);

  let batchPasteInProgress = false; // флаг периода вставки
  const processingRows = new Set<string>(); // антидубль для SVC каскадов
  const univerStore = useUniverStore();
  const sheetStore = useSheetStore(); // <— нужен для подписки на сокет

  // числовые колонки (0-based): J, Q, R, Y, а также 25, 26
  const NUMERIC_COLS = new Set([9, 16, 17, 24, 25, 26]);

  // ====== Helpers ======

  const unwrapV = (x: any): any =>
    x && typeof x === "object" && "v" in x ? unwrapV(x.v) : x;

  const toStr = (raw: any): string => {
    const val = unwrapV(raw);
    if (val == null) return "";
    if (typeof val === "object") {
      if (typeof (val as any).t === "string") return (val as any).t.trim();
      const p = (val as any).p;
      if (Array.isArray(p))
        return p
          .map((seg: any) => String(unwrapV(seg?.s?.v ?? seg)))
          .join("")
          .trim();
      return "";
    }
    return String(val).trim();
  };

  // === Поддержка Excel-сериалов и эпохи при нормализации дат ===
  const excelSerialToISO = (n: number): string => {
    // База Excel = 1899-12-30, работаем в UTC, чтобы избежать сдвигов TZ
    const baseMs = Date.UTC(1899, 11, 30);
    const ms = Math.round(n * 86400000); // поддержка дробной части суток
    const d = new Date(baseMs + ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const tsToISO = (ms: number): string => {
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const normalizeDateInput = (raw: any): string | null => {
    const v = unwrapV(raw);
    if (v == null || v === "") return null;

    if (typeof v === "number" && Number.isFinite(v)) {
      // Excel-сериал (>= 1970-01-01 → 25569)
      if (v >= 25569) return excelSerialToISO(v);
      // Эпоха (мс/сек)
      if (v > 1e12) return tsToISO(v); // миллисекунды
      if (v > 1e10 && v < 1e12) return tsToISO(v * 1000); // секунды
    }

    const s = toStr(v);
    if (!s) return null;

    // Чистое число строкой — вероятный Excel-сериал
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (Number.isFinite(n) && n >= 25569) return excelSerialToISO(n);
    }

    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const dot = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`;

    const slash = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slash) return `${slash[3]}-${slash[2]}-${slash[1]}`;

    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? tsToISO(d.getTime()) : null;
  };

  // const highlightRow = (aws: any, row: number) => {
  //   try {
  //     const range = aws.getRange(row, 0, 1, 28);
  //     range.useThemeStyle("light-green");
  //     const theme = range.getUsedThemeStyle();
  //     setTimeout(() => {
  //       try {
  //         range.removeThemeStyle(theme);
  //       } catch { }
  //     }, 1000);
  //   } catch { }
  // };

  const letterToColumnIndex = (letter: string): number =>
    letter.charCodeAt(0) - "A".charCodeAt(0);

  const isCellLockedForManager = (
    listName: string,
    row: number,
    col: number,
    store: ReturnType<typeof useSheetStore>
  ) => {
    if (row <= 0) return false;
    if (MANAGER_LOCKED_COLUMNS.has(col)) return true; // ВСЕГДА заблокировано для менеджера
    if (col === 0) return false;
    const items = (store.records as any)?.[listName] as any[] | undefined;
    const rec = Array.isArray(items) ? items[row - 1] : undefined;
    if (!rec?.managerBlockListCell) return false;
    for (const rng of rec.managerBlockListCell) {
      if (!rng?.length) continue;
      if (rng.length === 1 && typeof rng[0] === "string") {
        if (letterToColumnIndex(rng[0]) === col) return true;
      } else if (typeof rng[0] === "string" && typeof rng[1] === "string") {
        const a = letterToColumnIndex(rng[0]),
          b = letterToColumnIndex(rng[1]);
        if (col >= a && col <= b) return true;
      }
    }
    return false;
  };

  let cachedMe: any | undefined;
  const getMe = async () => (cachedMe ??= getUser());

  // --- соответствие индекс->ключ DTO (0..27)
  const COL_TO_KEY = [
    "dateOfPickup", // 0  A
    "numberOfContainer", // 1  B
    "cargo", // 2  C
    "typeOfContainer", // 3  D
    "dateOfSubmission", // 4  E
    "addressOfDelivery", // 5  F
    "ourFirm", // 6  G
    "client", // 7  H
    "formPayAs", // 8  I
    "summa", // 9  J
    "numberOfBill", // 10 K
    "dateOfBill", // 11 L
    "datePayment", // 12 M
    "contractor", // 13 N
    "driver", // 14 O
    "formPayHim", // 15 P
    "contractorRate", // 16 Q
    "sumIssued", // 17 R
    "numberOfBillAdd", // 18 S
    "dateOfPaymentContractor", // 19 T
    "manager", // 20 U
    "departmentHead", // 21 V
    "clientLead", // 22 W
    "salesManager", // 23 X
    "additionalExpenses", // 24 Y
    "income", // 25 Z
    "incomeLearned", // 26 AA
    "id", // 27 AB
  ] as const;

  // buildSR: нормализация дат
  const buildSR = (rowVals: any[], listName: string, id: number = 0) => {
    const v = (i: number) => {
      if (dateCols.has(i)) {
        return normalizeDateInput(rowVals[i]) ?? "";
      } else if (NUMERIC_COLS.has(i)) {
        return normalizeNumberStr(toStr(rowVals[i]));
      } else return toStr(rowVals[i])
    };

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
      taxes: "",
      typeOfContainer: v(3),
    };
  };

  const maskDtoForManager = (
    dto: any,
    listName: string,
    row0: number,
    store: ReturnType<typeof useSheetStore>,
    prevRec?: TransportAccounting
  ) => {
    if (!prevRec) return dto;
    for (let col = 0; col <= 26; col++) {
      if (isCellLockedForManager(listName, row0, col, store)) {
        const key = COL_TO_KEY[col];
        // @ts-expect-error — доступ по ключу
        dto[key] = (prevRec as any)?.[key] ?? "";
      }
    }
    return dto;
  };

  const createManagerSafeDto = (
    dto: any,
    listName: string,
    row0: number,
    store: ReturnType<typeof useSheetStore>
  ) => {
    const safeDto = { ...dto };
    for (let col = 0; col <= 26; col++) {
      if (isCellLockedForManager(listName, row0, col, store)) {
        const key = COL_TO_KEY[col];
        // @ts-expect-error — доступ по ключу
        safeDto[key] = "";
      }
    }
    return safeDto;
  };

  const rowHasData = (rv: any[]): boolean => {
    for (let c = 0; c <= 26; c++) {
      const cell = rv?.[c];
      const val =
        cell && typeof cell === "object" && "v" in cell ? cell.v : cell;
      if (String(val ?? "").trim() !== "") return true;
    }
    return false;
  };

  const isNumericOrEmpty = (v: any): boolean => {
    if (v == null) return true;
    const s = String(v).trim();
    if (!s) return true;
    if (s.startsWith("#")) return false;
    if (typeof v === "number") return Number.isFinite(v);
    return /^[-+]?\d+(?:\.\d+)?$/.test(s) && Number.isFinite(Number(s));
  };

  // ====== СИНХ: UI <- SOCKET (удаление)
  const extractIdsFromDeleteMessage = (msg: any): number[] => {
    const out: number[] = [];
    const fromList = msg?.listToDel;
    if (Array.isArray(fromList))
      out.push(...fromList.map(Number).filter(Number.isFinite));
    else if (typeof fromList === "string" && fromList.trim()) {
      fromList.split(/[,;\s]+/).forEach((s: string) => {
        const n = Number(s);
        if (Number.isFinite(n)) out.push(n);
      });
    }
    const dtoArr = msg?.transportAccountingDto ?? msg?.transportAccountingDTO;
    if (Array.isArray(dtoArr)) {
      for (const it of dtoArr) {
        const n = Number(it?.id);
        if (Number.isFinite(n)) out.push(n);
      }
    }
    return Array.from(new Set(out));
  };

  const resolveTargetList = (msg: any): string | null => {
    const byList =
      msg?.transportAccountingDto?.object ??
      msg?.transportAccountingDto?.body?.object ??
      msg?.transportAccountingDTO?.object ??
      msg?.transportAccountingDTO?.body?.object ??
      msg?.object ??
      msg?.body?.object ??
      {};

    const dto0 =
      msg?.transportAccountingDto?.[0] ?? msg?.transportAccountingDTO?.[0];
    return (
      msg?.listName || dto0?.listName || Object.keys(byList || {})[0] || null
    );
  };

  const offAction = sheetStore.$onAction(({ name, args, after }) => {
    if (name !== "applySocketMessage") return;
    const msg = args?.[0];
    const listNameArg = args?.[1];
    if (!msg || msg.type !== "status_delete") return;

    // Ждём завершения экшена (стор уже удалил записи) и чистим UI
    after(() => {
      const target = resolveTargetList(msg) || listNameArg;
      const wb = univerAPI.getActiveWorkbook();
      const aws = wb?.getActiveSheet();
      const sheet = aws?.getSheet();
      if (!wb || !aws || !sheet) return;
      if (!target || sheet.getName?.() !== target) return;

      const ids = extractIdsFromDeleteMessage(msg);
      if (!ids.length) return;

      try {
        univerStore.beginQuiet?.();
      } catch { }
      try {
        // оценим сколько строк сканировать по длине стора
        const storeLen = (sheetStore.records as any)?.[target]?.length ?? 0;
        const scanRows = Math.max(storeLen + ids.length + 50, 200);

        // читаем колонку ID (AB, index 27) и строим карту id -> row0 (1-based)
        const unwrapV = (x: any): any =>
          x && typeof x === "object" && "v" in x ? x.v?.v ?? x.v : x;
        const idCol = aws.getRange(1, 27, scanRows, 1).getValues();
        const idToRow = new Map<number, number>();
        for (let i = 0; i < idCol.length; i++) {
          const n = Number(unwrapV(idCol[i]?.[0]));
          if (Number.isFinite(n)) idToRow.set(n, i + 1);
        }

        // чистим строки с найденными id
        for (const id of ids) {
          const r = idToRow.get(id);
          if (!r) continue;
          const emptyRow = Array.from({ length: 28 }, () => ({ v: "" }));
          aws.getRange(r, 0, 1, 28).setValues([emptyRow]);
        }
      } catch (e) {
        console.warn("[univer-events] socket delete -> UI failed", e);
      } finally {
        try {
          univerStore.endQuiet?.();
        } catch { }
      }
    });
  });

  // ====== Откат заблокированных ячеек и далее — ваш существующий код ======
  const getPrevValueForCell = (
    listName: string,
    row0: number,
    col0: number,
    store: ReturnType<typeof useSheetStore>
  ): string => {
    const arr = (store.records as any)?.[listName] as
      | TransportAccounting[]
      | undefined;
    const prevRec = Array.isArray(arr) ? arr[row0 - 1] : undefined;
    if (!prevRec) return "";
    const key = COL_TO_KEY[col0] as keyof TransportAccounting;
    const raw = (prevRec as any)?.[key];
    return dateCols.has(col0)
      ? normalizeDateInput(raw) ?? ""
      : String(raw ?? "");
  };

  const revertLockedCells = (
    ws: any,
    listName: string,
    lockedCells: Array<{ row0: number; col0: number }>,
    store: ReturnType<typeof useSheetStore>
  ) => {
    if (!lockedCells.length) return;
    try {
      univerStore.beginQuiet?.();
    } catch { }
    try {
      for (const { row0, col0 } of lockedCells) {
        const prev = getPrevValueForCell(listName, row0, col0, store);
        ws.getRange(row0, col0).setValue({ v: prev, s: "lockedCol" });
      }
    } finally {
      try {
        univerStore.endQuiet?.();
      } catch { }
    }
  };

  const revertSingleLockedCell = (
    ws: any,
    listName: string,
    row0: number,
    col0: number,
    store: ReturnType<typeof useSheetStore>
  ) => revertLockedCells(ws, listName, [{ row0, col0 }], store);

  const paintManagerLockedColsOnRow = async (ws: any, row0: number) => {
    const me = await getMe();
    if (me?.roleCode !== "ROLE_MANAGER") return;
    try {
      univerStore.beginQuiet?.();
    } catch { }
    try {
      for (const col of MANAGER_LOCKED_COLUMNS) {
        if (col === 27) continue;
        ws.getRange(row0, col).setValue({ s: "lockedCol" });
      }
    } finally {
      try {
        univerStore.endQuiet?.();
      } catch { }
    }
  };

  // ====== Вставка: до / после ======
  const normalizeNumberStr = (raw: any): string =>
    (raw ?? "").toString().replace(/\s+/g, "").replace(",", ".");

  const offBeforePaste = univerAPI.addEvent(
    univerAPI.Event.BeforeClipboardPaste,
    async (params: any) => {
      batchPasteInProgress = true;
      const wb = univerAPI.getActiveWorkbook();
      const aws = wb?.getActiveSheet();
      const startCol = aws?.getSelection()?.getActiveRange?.()?.getRange().startColumn ?? 0;

      let changed = false;

      const norm = (v: any, c: number) => {
        const absoluteCol = startCol + c 

        if (dateCols.has(absoluteCol)) {
          return normalizeDateInput(v) ?? v 
        } else if (NUMERIC_COLS.has(absoluteCol)) {
          return normalizeNumberStr(v)
        } else return v
      }
        

      if (typeof (params as any)?.text === "string") {
        const rows = ((params as any).text as string).split(/\r?\n/);
        const next = rows
          .map((line) =>
            !line
              ? line
              : line
                .split("\t")
                .map((cell, i) => {
                  const nv = norm(cell, i);
                  if (nv !== cell) changed = true;
                  return nv;
                })
                .join("\t")
          )
          .join("\n");
        if (next !== (params as any).text) {
          (params as any).text = next;
          changed = true;
        }
      }

      if (typeof (params as any)?.html === "string") {
        const prev = (params as any).html as string;

        let next = prev.replace(
          /\b(\d{2})\.(\d{2})\.(\d{4})\b/g,
          (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`
        );

        next = next.replace(
          /(\d+),(\d+)/g, 
          (_m, int, dec) => `${int}.${dec}`
        )

        if (next !== prev) {
          (params as any).html = next;
          changed = true;
        }
      }

      const data = (params as any)?.data ?? (params as any)?.clipboardData;
      if (data) {
        if (typeof data.html === "string") {
          const prev = data.html as string;
          let next = prev.replace(
            /\b(\d{2})\.(\d{2})\.(\d{4})\b/g,
            (_m, dd, mm, yyyy) => `${yyyy}-${mm}-${dd}`
          );

          next = next.replace(
            /(\d+),(\d+)/g, 
            (_m, int, dec) => `${int}.${dec}`
          );

          if (next !== prev) {
            data.html = next;
            changed = true;
          }
        }

        if (Array.isArray(data.cells)) {
          data.cells = data.cells.map((row: any[]) =>
            Array.isArray(row)
              ? row.map((cell: any, i: number) => {
                const nv = norm(cell, startCol + i);
                if (nv !== cell) changed = true;
                return nv;
              })
              : row
          );
        }
      }

      if (Array.isArray((params as any)?.cells)) {
        (params as any).cells = (params as any).cells.map((row: any[]) =>
          Array.isArray(row)
            ? row.map((cell: any, i: number) => {
              const nv = norm(cell, startCol + i);
              if (nv !== cell) changed = true;
              return nv;
            })
            : row
        );
      }
    }
  );

  const offPasted = univerAPI.addEvent(
    univerAPI.Event.ClipboardPasted,
    async () => {
      const wb = univerAPI.getActiveWorkbook();
      const aws = wb?.getActiveSheet();
      const s = aws?.getSheet();
      if (!wb || !aws || !s) {
        batchPasteInProgress = false;
        return;
      }

      try {
        const active = aws.getSelection()?.getActiveRange?.()?.getRange();
        if (!active) return;

        const startRow = Math.max(1, active.startRow);
        const endRow = active.endRow;
        const startCol = active.startColumn;
        const endCol = active.endColumn;

        const listName = s.getName();
        const sheetStore = useSheetStore();
        const me = await getMe();
        const token = me?.token

        if (me?.roleCode === "ROLE_MANAGER") {
          for (let r = startRow; r <= endRow; r++) {
            let locked = false;
            for (let c = startCol; c <= endCol; c++) {
              if (isCellLockedForManager(listName, r, c, sheetStore)) {
                locked = true;
                break;
              }
            }
            if (locked) {
              await univerAPI.undo();
              return;
            }
          }
        }

        const createDtos: any[] = [];
        const updateDtos: any[] = [];

        try {
          univerStore.beginQuiet?.() 
          for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
              if (c === 27) continue 

              const currentValue = aws.getRange(r, c).getValue() 
              aws.getRange(r, c).setValue({
                v: currentValue?.v ?? currentValue,
              })
              .clearFormat()
            }
          }
        } catch (e) {
          console.error(e)
        } finally {
          univerStore.endQuiet?.()
        }
        
        for (let r = startRow; r <= endRow; r++) {
          const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? [];

          const idStr = toStr(rowVals[27]);
          let hasData = false;

          for (let c = 0; c <= 26; c++) {
            if (toStr(rowVals[c])) {
              hasData = true;
              break;
            }
          }

          if (idStr && Number.isFinite(Number(idStr)) && Number(idStr) > 0) {
            let dto = buildSR(rowVals, listName, Number(idStr));
            if (me?.roleCode === "ROLE_MANAGER") {
              const arr = (sheetStore.records as any)?.[listName];
              const prevRec = Array.isArray(arr) ? arr[r - 1] : undefined;
              dto = maskDtoForManager(dto, listName, r, sheetStore, prevRec);
            }
            updateDtos.push(dto);
          } else if (hasData) {
            let createDto = buildSR(rowVals, listName);
            if (me?.roleCode === "ROLE_MANAGER") {
              createDto = createManagerSafeDto(
                createDto,
                listName,
                r,
                sheetStore
              );
            }
            createDtos.push(createDto);
          }
        }
        if (createDtos.length > 0) {
          await rpcClient.call('batchRecords', {
            type: 'create',
            listName,
            records: createDtos,
            token,
            kingsApiBase: kingsApiBase
          })
        }
        if (updateDtos.length > 0) {
          await rpcClient.call('batchRecords', {
            type: 'update',
            listName,
            records: updateDtos,
            token,
            kingsApiBase: kingsApiBase
          })
        }

        if (me?.roleCode === 'ROLE_MANAGER') {
          for (let r = startRow; r <= endRow; r++) {
            await paintManagerLockedColsOnRow(aws, r)
          }
        }

        for (let r = startRow; r <= endRow; r++) {
          const rowVals = aws.getRange(r, 0, 1, 28).getValues()?.[0] ?? [];
          let hasData = false;
          for (let c = 0; c <= 26; c++) {
            if (toStr(rowVals[c])) {
              hasData = true;
              break;
            }
          }
          // if (hasData || toStr(rowVals[27])) {
          //   highlightRow(aws, r);
          // }
        }
      } catch (e) {
        console.error("[univer-events] paste handler failed:", e);
      } finally {
        setTimeout(() => {
          batchPasteInProgress = false
        }, 100)
      }
    }
  );

  const PASTE_TRIGGERS = new Set([
    'sheet.command.clipboard-paste',
    'sheet.command.paste',
    'sheet.command.paste-values',
    'sheet.command.paste-formula',
    'sheet.command.paste-all',
  ]);

  let timeoutId: NodeJS.Timeout 
  const debounceCheckKPP = (dataStream: string, column: number, row: number, worksheet: any) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(async () => {
      await performKPPCheck(dataStream, column, row, worksheet)
    }, 2000)
  }

  const performKPPCheck = async (dataStream: string, column: number, row: number, worksheet: any) => {
    const toast = useToast();
    try {
      const cleanKPP = dataStream.replace(/[^\d]/g, '')
      const result = await checkKPP(cleanKPP);
      if (result.suggestions.length === 0) {
        if (column === 7) {
          toast.add({
            title: 'ИНН клиента не найден',
            icon: 'i-lucide-x',
            color: 'error'
          });
      } else {
          toast.add({
            title: 'ИНН подрядчика не найден',
            icon: 'i-lucide-x',
            color: 'error'
          });
        }
      } else {
        const suggestions = result.suggestions[0]
        const companyName = suggestions.value.replace(/"/g, '')
        const inn = suggestions.data.inn 
        const kpp = suggestions.data.kpp

        const newValue = `${companyName} ИНН ${inn}`

        try {
          univerStore.beginQuiet?.() 
          worksheet.getRange(row, column).setValue({ v: newValue })
        } catch (e) {
          console.error(e)
        } finally {
          univerStore.endQuiet?.()
        }
      }
    } catch (error) {
        console.error('Error checking KPP:', error);
    }
  };

  const offEditChanging = univerAPI.addEvent(univerAPI.Event.SheetEditChanging, async (params: any) => {
    if (params.column === 7 || params.column === 13) {
      const dataStream = params.value._data.body.dataStream 

      if (dataStream)  {
        const ws = params.worksheet 
        const row = params.row 
        const column = params.column

        debounceCheckKPP(dataStream, column, row, ws)
      }
    }

    if (NUMERIC_COLS.has(params.column)) {
      const dataStream = params.value._data.body.dataStream
      if (dataStream && dataStream.includes(',')) {
        params.value._data.body.dataStream = dataStream.replace(/,/g, '.')
      }
    }
  })

  const offValueChanged = univerAPI.addEvent(
    univerAPI.Event.SheetValueChanged,
    async (params: any) => {      
      // Guards
      if (univerStore.isQuiet?.() ?? univerStore.batchProgress) return;
      if (batchPasteInProgress) return;

      const trigger = params?.trigger ?? params?.payload?.params?.trigger ?? '';

      // Пропускаем явные вставки — у них свой пайплайн
      if (PASTE_TRIGGERS.has(trigger) || trigger.includes('paste')) return;

      if (batchPasteInProgress) return;

      const wb = univerAPI.getActiveWorkbook();
      const ws = wb?.getActiveSheet();
      const sheet = ws?.getSheet();
      if (!wb || !ws || !sheet) return;

      const activeSheetId = sheet.getSheetId?.();
      const subUnitId = params?.subUnitId ?? params?.payload?.params?.subUnitId;
      if (activeSheetId && subUnitId && subUnitId !== activeSheetId) return;

      // cellValue из события
      const payload = params?.payload;
      const pparams = payload?.params ?? {};
      let cv: Record<string, Record<string, any>> | undefined =
        params?.cellValue ?? pparams?.cellValue ?? payload?.cellValue;

      // Если move-range и cv нет — синтезируем из целевого диапазона
      const isMoveRange = trigger === 'sheet.command.move-range';
      if ((!cv || Object.keys(cv).length === 0) && isMoveRange) {
        const normRange = (r: any) => {
          if (!r || typeof r !== 'object') return null;
          const sr = Number(r.startRow ?? r.rowStart ?? r.row ?? r.r1);
          const sc = Number(r.startColumn ?? r.colStart ?? r.column ?? r.c1);
          const er = Number(r.endRow ?? r.rowEnd ?? r.r2);
          const ec = Number(r.endColumn ?? r.colEnd ?? r.c2);
          const rc = Number(r.rowCount ?? r.rows);
          const cc = Number(r.columnCount ?? r.cols ?? r.columns);
          if (Number.isFinite(sr) && Number.isFinite(sc)) {
            if (Number.isFinite(rc) && Number.isFinite(cc)) {
              return { startRow: sr, startColumn: sc, rowCount: rc, columnCount: cc };
            }
            if (Number.isFinite(er) && Number.isFinite(ec)) {
              return { startRow: sr, startColumn: sc, rowCount: er - sr + 1, columnCount: ec - sc + 1 };
            }
          }
          return null;
        };

        const srcRaw = pparams.sourceRange ?? pparams.fromRange ?? pparams.source ?? pparams.srcRange ?? pparams.range;
        const dstRaw = pparams.targetRange ?? pparams.toRange ?? pparams.target ?? pparams.destRange ?? pparams.destination;
        const dstNorm = normRange(dstRaw);

        let target = dstNorm;
        if (!target) {
          const ar = ws.getSelection?.()?.getActiveRange?.()?.getRange?.();
          if (!ar) return;
          target = {
            startRow: Number(ar.startRow ?? 0),
            startColumn: Number(ar.startColumn ?? 0),
            rowCount: Number(ar.endRow - ar.startRow + 1),
            columnCount: Number(ar.endColumn - ar.startColumn + 1)
          };
        }

        const { startRow, startColumn, rowCount, columnCount } = target;
        const values = ws.getRange(startRow, startColumn, rowCount, columnCount).getValues();
        const synthetic: Record<string, Record<string, any>> = {};

        for (let r = 0; r < rowCount; r++) {
          const rowIdx = startRow + r;
          const rowArr = values?.[r] ?? [];
          for (let c = 0; c < columnCount; c++) {
            const colIdx = startColumn + c;
            const v = unwrapV(rowArr?.[c]);
            if (String(v ?? '').trim() !== '') {
              (synthetic[String(rowIdx)] ??= {})[String(colIdx)] = { v };
            }
          }
        }

        cv = synthetic;
      }

      if (!cv || Object.keys(cv).length === 0) return;

      // AUTO-FILL: копируем seed из ячейки-источника, без инкремента
      if (trigger === 'sheet.command.auto-fill') {
        const rowIndexes = Object.keys(cv).map(Number).sort((a, b) => a - b);
        const colSet = new Set<number>();
        for (const r of rowIndexes) {
          for (const ck of Object.keys(cv[String(r)] ?? {})) {
            const c = Number(ck);
            if (Number.isFinite(c)) colSet.add(c);
          }
        }
        const colIndexes = Array.from(colSet).sort((a, b) => a - b);
        if (rowIndexes.length && colIndexes.length) {
          const minRow = rowIndexes[0];
          const maxRow = rowIndexes[rowIndexes.length - 1];
          const minCol = colIndexes[0];
          const maxCol = colIndexes[colIndexes.length - 1];
          const isVertical = rowIndexes.length >= colIndexes.length;

          const readSeed = (r: number, c: number) => {
            try {
              const v2d = ws.getRange(r, c, 1, 1).getValues();
              return unwrapV(v2d?.[0]?.[0]);
            } catch {
              return undefined;
            }
          };

          const seedsByCol = new Map<number, any>();
          for (const col of colIndexes) {
            let seed: any;
            if (isVertical) {
              seed = (minRow - 1 >= 0 && readSeed(minRow - 1, col)) ?? readSeed(maxRow + 1, col);
            } else {
              seed = (minCol - 1 >= 0 && readSeed(rowIndexes[0], minCol - 1)) ?? readSeed(rowIndexes[0], maxCol + 1);
            }
            if (seed === undefined) seed = unwrapV(cv[String(minRow)]?.[String(col)]?.v);
            seedsByCol.set(col, seed);
          }

          try { univerStore.beginQuiet?.(); } catch { }
          try {
            for (const r of rowIndexes) {
              for (const col of colIndexes) {
                const seed = seedsByCol.get(col);
                ws.getRange(r, col).setValue({ v: seed });
                (cv[String(r)] ??= {})[String(col)] = { v: seed };
              }
            }
          } finally { try { univerStore.endQuiet?.(); } catch { } }
        }
      }

      // Собираем изменённые ячейки из cv
      const perRowRaw = new Map<number, Set<number>>();
      for (const rk of Object.keys(cv)) {
        const row0 = Number(rk);
        if (!Number.isFinite(row0) || row0 <= 0) continue;
        const rowObj = cv[rk];
        for (const ck of Object.keys(rowObj)) {
          const col0 = Number(ck);
          if (!Number.isFinite(col0) || col0 === 27) continue; // AB (ID) не редактируем
          (perRowRaw.get(row0) ?? perRowRaw.set(row0, new Set()).get(row0)!).add(col0);
        }
      }
      if (perRowRaw.size === 0) return;

      const listName = sheet.getName?.() || '';
      const store = useSheetStore();
      const me = await getMe();
      const token = me?.token;

      // Блокировки для менеджера
      let hadLocked = false;
      const lockedCells: Array<{ row0: number; col0: number }> = [];
      const perRowAllowed = new Map<number, Set<number>>();

      if (me?.roleCode === 'ROLE_MANAGER') {
        for (const [row0, cols] of perRowRaw) {
          const allowed = new Set<number>();
          for (const col0 of cols) {
            const isLocked = isCellLockedForManager(listName, row0, col0, store);
            if (!NUMERIC_COLS.has(col0)) {
              const v = cv[String(row0)]?.[String(col0)]?.v 
              if (typeof v === 'string' && v.includes(',')) {
                const normalized = normalizeNumberStr(v)
                ws.getRange(row0, col0).setValue({ v: normalized });
                (cv[String(row0)] ??= {})[String(col0)] = { v: normalized }
              }
            }
              
            if (isLocked) {
              hadLocked = true;
              lockedCells.push({ row0, col0 });
            } else {
              allowed.add(col0);
            }
          }
          if (allowed.size) perRowAllowed.set(row0, allowed);
        }

        if (hadLocked) {
          revertLockedCells(ws, listName, lockedCells, store);
        }
      }

      const perRow = me?.roleCode === 'ROLE_MANAGER' ? perRowAllowed : perRowRaw;

      if (perRow.size === 0) {
        return
      }

      // Валидация числовых колонок
      {
        const getOld = (rec: TransportAccounting, col0: number) =>
          (rec as any)?.[COL_TO_KEY[col0] as keyof TransportAccounting];

        const isValidDate = (value: any): boolean => {
          if (!value) return true 
          const strValue = String(value).trim();
          if (!strValue) return true 

          const dateFormats = [
            /^\d{4}-\d{2}-\d{2}$/, 
            /^\d{2}\.\d{2}\.\d{4}&/
          ]

          if (dateFormats.some(format => format.test(strValue))) {
            const date = new Date(strValue)
            return !isNaN(date.getTime())
          }

          if (/^\d+(\.\d+)?$/.test(strValue)) {
            const num = Number(strValue)
            if (num >= 25569) {
              return true
            }
          }

          return false
        };

        let hasInvalidData = false 
        const invalidCells: Array<{row0: number, col0: number, hadPreviousData: boolean}> = []

        for (const [row0, cols] of perRow) {
          for (const col0 of cols) {
            const newValue = cv[String(row0)]?.[String(col0)]?.v 
            const stringValue = String(newValue ?? '').trim() 

            if (NUMERIC_COLS.has(col0) && stringValue !== '') {
              if (!isNumericOrEmpty(newValue)) {
                const prevRec = Array.isArray(store.records[listName]) ? store.records[listName][row0 - 1] : undefined 
                const prevValue = prevRec ? getOld(prevRec, col0) : null
                const hadPreviousData = prevValue !== null && prevValue !== undefined && String(prevValue).trim() !== '' 

                invalidCells.push({ row0, col0, hadPreviousData })
                hasInvalidData = true
              }
            }

            if (dateCols.has(col0) && stringValue !== '') {
              if (!isValidDate(newValue)) {
                const prevRec = Array.isArray(store.records[listName]) ? store.records[listName][row0 - 1] : undefined 
                const prevValue = prevRec ? getOld(prevRec, col0) : null
                const hadPreviousData = prevValue !== null && prevValue !== undefined && String(prevValue).trim() !== '' 

                invalidCells.push({ row0, col0, hadPreviousData })
                hasInvalidData = true
              }
            }
          }
        }

        if (hasInvalidData) {
          try {
            univerStore.beginQuiet?.()
          } catch { }

          try {
            const cellsWithPreviousData = invalidCells.filter(c => c.hadPreviousData)
            const cellsWithoutData = invalidCells.filter(c => !c.hadPreviousData)

            if (cellsWithPreviousData.length > 0) {
              const numericInvalid = cellsWithPreviousData.filter(c => NUMERIC_COLS.has(c.col0))
              const dateInvalid = cellsWithPreviousData.filter(c => dateCols.has(c.col0))

              univerAPI.undo() 

              let errorMessage = 'Обнаружены неверные данные' 
              if (numericInvalid.length > 0) {
                errorMessage += ` в числовых колонках (строки: ${[...new Set(numericInvalid.map(cell => cell.row0 + 1))].join(', ')});`; 
              }
              if (dateInvalid.length > 0) {
                errorMessage += ` в колонках с датами (строки: ${[...new Set(dateInvalid.map(cell => cell.row0 + 1))].join(', ')});`; 
              }
              errorMessage += ' Изменения отменены.'

              useToast().add({
                title: 'Неверный формат данных',
                description: errorMessage,
                color: 'error',
                icon: 'i-lucide-alert-triangle',
                duration: 4000
              })
            }

            if (cellsWithoutData.length > 0) {
              for (const { row0, col0 } of cellsWithoutData) {
                ws.getRange(row0, col0).setValue({ v: '' });
              }
              
              useToast().add({
                title: 'Неверный формат данных',
                description: 'Введены неверные данные в пустые ячейки. Ячейки очищены.',
                color: 'warning',
                icon: 'i-lucide-info',
                duration: 3000,
              });
            }
          } finally {
            try {
              univerStore.endQuiet?.()
            } catch { }
          }

          if (invalidCells.some(cell => cell.hadPreviousData)) {
            return
          }
        } 
      }

      // Список строк для обработки
      const allowCreate = !isMoveRange;
      const arrAll = (store.records as any)?.[listName] as TransportAccounting[] | undefined;
      const getOld = (rec: TransportAccounting, col0: number) =>
        (rec as any)?.[COL_TO_KEY[col0] as keyof TransportAccounting];
      const isNonEmpty = (v: any) => String(v ?? '').trim() !== '';

      const rowsToProcess: number[] = [];
      for (const [row0, cols] of perRow) {
        const prevRec = Array.isArray(arrAll) ? arrAll[row0 - 1] : undefined;

        if (isMoveRange) {
          let hasNonEmpty = false;
          for (const c of cols) {
            const v = cv[String(row0)]?.[String(c)]?.v;
            if (isNonEmpty(v)) { hasNonEmpty = true; break; }
          }
          if (hasNonEmpty) rowsToProcess.push(row0);
          continue;
        }

        if (!prevRec) {
          let nonEmpty = false;
          for (const c of cols) {
            const v = cv[String(row0)]?.[String(c)]?.v;
            if (isNonEmpty(v)) { nonEmpty = true; break; }
          }
          if (nonEmpty) rowsToProcess.push(row0);
          continue;
        }

        let changed = false;
        for (const c of cols) {
          const nv = cv[String(row0)]?.[String(c)]?.v;
          const old = getOld(prevRec, c);
          if (String(nv ?? '').trim() !== String(old ?? '').trim()) { changed = true; break; }
        }
        if (changed) rowsToProcess.push(row0);
      }
      if (!rowsToProcess.length) return;

      // Исключаем строки, уже в обработке
      const keyFor = (r: number) => `${listName}#${r}`;
      const rowsFinal = rowsToProcess.filter((r) => {
        const k = keyFor(r);
        const busy = processingRows.has(k);
        if (!busy) processingRows.add(k);
        return !busy;
      });
      if (!rowsFinal.length) return;

      // Формируем DTO и отправляем в воркер
      const createDtos: any[] = [];
      const updateDtos: any[] = [];
      const createdRows: number[] = [];

      try {
        for (const row0 of rowsFinal) {
          const rowVals = ws.getRange(row0, 0, 1, 28).getValues()?.[0] ?? [];
          const cols = perRow.get(row0)!;

          for (const c of cols) {
            const vFromPayload = cv[String(row0)]?.[String(c)]?.v;
            rowVals[c] = rowVals[c] && typeof rowVals[c] === 'object' && 'v' in rowVals[c]
              ? { ...rowVals[c], v: vFromPayload }
              : { v: vFromPayload };
          }

          // ID: сначала из листа, затем fallback к стору (важно для move-range)
          let idStr = String(rowVals?.[27]?.v ?? rowVals?.[27] ?? '').trim();
          let idNum = Number(idStr);
          if (!Number.isFinite(idNum) || idNum <= 0) {
            const prevRecAtRow = Array.isArray(arrAll) ? arrAll[row0 - 1] : undefined;
            const prevId = Number(prevRecAtRow?.id);
            if (Number.isFinite(prevId) && prevId > 0) idNum = prevId;
          }

          const prevRec = Array.isArray(arrAll) ? arrAll[row0 - 1] : undefined;

          if (Number.isFinite(idNum) && idNum > 0) {
            let dto = { ...buildSR(rowVals, listName, idNum), id: idNum };
            if (me?.roleCode === 'ROLE_MANAGER') {
              dto = maskDtoForManager(dto, listName, row0, store, prevRec);
            }
            updateDtos.push(dto);
          } else {
            if (!allowCreate) continue;
            if (rowHasData(rowVals)) {
              let createDto = buildSR(rowVals, listName);
              if (me?.roleCode === 'ROLE_MANAGER') {
                createDto = createManagerSafeDto(createDto, listName, row0, store);
              }
              createDtos.push(createDto);
              createdRows.push(row0);
            }
          }
        }

        // ВЫЗОВ ВОРКЕРА ДЛЯ ПАКЕТНОЙ ОБРАБОТКИ
        if (updateDtos.length) {
          try {
            await rpcClient.call('batchRecords', {
              type: 'update',
              listName,
              records: updateDtos,
              token,
              kingsApiBase: kingsApiBase
            });
          } catch (e) {
          }
        }
        if (createDtos.length) {
          try {
            await rpcClient.call('batchRecords', {
              type: 'create',
              listName,
              records: createDtos,
              token,
              kingsApiBase: kingsApiBase
            });
          } catch (e) {
          } 
        }

        for (const r of createdRows) await paintManagerLockedColsOnRow(ws, r);

        // const aws = wb.getActiveSheet();
        // for (const r of rowsFinal) highlightRow(aws, r);
      } catch (e) {
      } finally {
        for (const r of rowsFinal) processingRows.delete(keyFor(r));
      }
    }
  );

  const offClipboardChanged = univerAPI.addEvent(univerAPI.Event.ClipboardChanged, async (params: any) => {
    const startRow = params.fromRange._range.startRow
    const endRow = params.fromRange._range.endRow

    if (!startRow || !endRow) return

    const me = getUser()

    if (me?.roleCode === 'ROLE_ADMIN' || me?.roleCode === 'ROLE_BUH') return
    
    const toast = useToast()

    if (endRow - startRow >= 10) {
      toast.add({
        title: 'Копирование больше 10 строк',
        description: 'Вам запрещено копировать больше 10 строк за раз. Обратитесь к администратору.',
        color: 'error',
        icon: 'i-lucide-alert-triangle'
      })
      params.text = ''
      params.html = ''
      
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText('')
        }

        else if (document.execCommand) {
          const textArea = document.createElement('textarea');
          textArea.value = ''
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      } catch (e) {
        console.error(e)
      }
    }
  });

  // ====== Disposer ======
  return () => {
    try {
      (offBeforePaste as any)?.dispose?.();
    } catch { }
    try {
      (offPasted as any)?.dispose?.();
    } catch { }
    try {
      (offEditChanging as any)?.dispose?.();
    } catch { }
    try {
      (offValueChanged as any)?.dispose?.();
    } catch { }
    try {
      offAction?.();
    } catch { }
    try {
      (offClipboardChanged as any)?.dispose?.();
    } catch { }
  }
}