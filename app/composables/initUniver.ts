// initUniver.ts
import type { FUniver } from '@univerjs/core/facade';
import('@univerjs/network/facade');
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types';
import { useNuxtApp } from '#app';
import { autoFitColumnAndRowData } from '~/helpers/autoFit';
import { buildRowCells } from '~/helpers/build-rows';
import { addDataValidation } from '~/helpers/validation';
import { HEADERS } from '~/pages/sheet/attributes/headers';
import { styles } from '~/pages/sheet/attributes/styles';
import { lockHeaders, withHeaderUnlocked } from '~/helpers/univer-protect';
import { registerUniverEvents } from '~/helpers/univer-events';
import { useSheetStore } from '~/stores/sheet-store';
import { addFilters } from '~/helpers/filters';
import { UniverSheetsCustomMenuPlugin } from '~/univer/custom-menu'
import { UniverVue3AdapterPlugin } from '@univerjs/ui-adapter-vue3';
import BidButtonIcon from '~/univer/custom-menu/components/button-icon/BidButtonIcon.vue';
import AgreementButtonIcon from '~/univer/custom-menu/components/button-icon/AgreementButtonIcon.vue';
import UpdateHistoryButtonIcon from '~/univer/custom-menu/components/button-icon/UpdateHistoryButtonIcon.vue';
import CellHistorySidebar from '~/components/CellHistorySidebar.vue';
import { addConditionalFormatting } from '~/helpers/conditionalFormatting';
import type { FWorksheet } from '@univerjs/preset-sheets-core';
import { getUser } from '~/helpers/getUser';
import { useUniverStore } from '~/stores/univer-store';
import { nextTick } from 'vue';

const tr = ref<number>(0);

// Функция для нормализации числовых значений
const normalizeNumericValue = (value: any): any => {
  if (value == null || value === '') return value;
  
  // Если уже число - возвращаем как есть
  if (typeof value === 'number') return value;
  
  // Если строка - пытаемся преобразовать
  if (typeof value === 'string') {
    // Убираем пробелы и заменяем запятые на точки
    const normalized = value.toString()
      .replace(/\s/g, '') // убираем пробелы
      .replace(/,/g, '.'); // заменяем запятые на точки
    
    // Пытаемся преобразовать в число
    const num = parseFloat(normalized);
    
    // Если получилось валидное число - возвращаем его
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }
  
  // Если не удалось преобразовать - возвращаем исходное значение
  return value;
};

// Функция для нормализации числовых колонок в rowCells
const normalizeRowCellsNumericValues = (rowCells: Record<number, { v: any; s?: string }>): Record<number, { v: any; s?: string }> => {
  // Числовые колонки: J(9), Q(16), R(17), Y(24), Z(25), AA(26)
  const numericColumns = new Set([9, 16, 17, 24, 25, 26]);
  
  const normalized = { ...rowCells };
  numericColumns.forEach(col => {
    if (normalized[col]) {
      normalized[col] = {
        ...normalized[col],
        v: normalizeNumericValue(normalized[col].v)
      };
    }
  });
  
  return normalized;
};

export async function initUniver(records: Record<string, any[]>): Promise<FUniver> {
  if (typeof window === 'undefined') throw new Error('initUniver must be called on the client');

  const univerStore = useUniverStore();
  // --- старт загрузки ---
  univerStore.setBatchProgress(true);
  univerStore.beginQuiet();
  univerStore.setUiReady(false);

  const me = getUser();

  const [
    { createUniver, LocaleType, mergeLocales },
    { UniverSheetsCorePreset },
    SheetsCoreRuRU, SheetsCoreEnUS,
    { UniverSheetsDataValidationPreset },
    SheetsDVEnUS, SheetsDVRuRU,
    { UniverSheetsFilterPreset },
    UniverPresetSheetsFilterEnUS,
    UniverPresetSheetsFilterRuRU,
    { UniverSheetsConditionalFormattingPreset },
    UniverPresetSheetsConditionalFormattingEnUS,
    UniverPresetSheetsConditionalFormattingRuRU,
    { UniverSheetsFindReplacePreset },
    SheetFindReplaceEnUS, SheetFindReplaceRuRU,
  ] = await Promise.all([
    import('@univerjs/presets'),
    import('@univerjs/preset-sheets-core'),
    import('@univerjs/preset-sheets-core/locales/ru-RU'),
    import('@univerjs/preset-sheets-core/locales/en-US'),
    import('@univerjs/preset-sheets-data-validation'),
    import('@univerjs/preset-sheets-data-validation/locales/en-US'),
    import('@univerjs/preset-sheets-data-validation/locales/ru-RU'),
    import('@univerjs/preset-sheets-filter'),
    import('@univerjs/preset-sheets-filter/locales/en-US'),
    import('@univerjs/preset-sheets-filter/locales/ru-RU'),
    import('@univerjs/preset-sheets-conditional-formatting'),
    import('@univerjs/preset-sheets-conditional-formatting/locales/en-US'),
    import('@univerjs/preset-sheets-conditional-formatting/locales/ru-RU'),
    import('@univerjs/preset-sheets-find-replace'),
    import('@univerjs/preset-sheets-find-replace/locales/en-US'),
    import('@univerjs/preset-sheets-find-replace/locales/ru-RU'),
  ]);
  await import('@univerjs/preset-sheets-filter/lib/index.css');
  await import('@univerjs/preset-sheets-conditional-formatting/lib/index.css');
  await import('@univerjs/preset-sheets-find-replace/lib/index.css')

  const { univer, univerAPI } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        (SheetsCoreEnUS as any).default ?? SheetsCoreEnUS,
        (SheetsDVEnUS as any).default ?? SheetsDVEnUS,
        (UniverPresetSheetsFilterEnUS as any).default ?? UniverPresetSheetsFilterEnUS,
        (UniverPresetSheetsConditionalFormattingEnUS as any).default ?? UniverPresetSheetsConditionalFormattingEnUS,
        (SheetFindReplaceEnUS as any).default ?? SheetFindReplaceEnUS
      ),
      [LocaleType.RU_RU]: mergeLocales(
        (SheetsCoreRuRU as any).default ?? SheetsCoreRuRU,
        (SheetsDVRuRU as any).default ?? SheetsDVRuRU,
        (UniverPresetSheetsFilterRuRU as any).default ?? UniverPresetSheetsFilterRuRU,
        (UniverPresetSheetsConditionalFormattingRuRU as any).default ?? UniverPresetSheetsConditionalFormattingRuRU,
        (SheetFindReplaceRuRU as any).default ?? SheetFindReplaceRuRU
      ),
    },
    presets: [
      UniverSheetsCorePreset({
        container: 'univer',
        ribbonType: 'simple',
        footer: { menus: false },
        menu: {
          'sheet.menu.paste-special': { hidden: true },
          'sheet.menu.delete': { hidden: true },
          'sheet.menu.cell-insert': { hidden: false },
          'sheet.menu.clear-selection': { hidden: true },
          'sheet.contextMenu.permission': { hidden: true },
          'sheet.menu.sheet-frozen': { hidden: true },
          'sheet.command.numfmt.set.currency': { hidden: false },
        }
      }),
      UniverSheetsDataValidationPreset(),
      UniverSheetsFilterPreset(),
      UniverSheetsConditionalFormattingPreset(),
      UniverSheetsFindReplacePreset(),
    ],
  });

  univer.registerPlugin(UniverVue3AdapterPlugin);
  univer.registerPlugin(UniverSheetsCustomMenuPlugin);

  // регистрируем кастомные компоненты заранее
  univerAPI.registerComponent('BidButtonIcon', BidButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('AgreementButtonIcon', AgreementButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('UpdateHistoryButtonIcon', UpdateHistoryButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('CellHistorySidebar', CellHistorySidebar, { framework: 'vue3' });

  // ---------- helpers ----------
  const lettersToIndex = (s: string): number => {
    if (!s) return -1;
    const up = String(s).toUpperCase();
    let n = 0;
    for (let i = 0; i < up.length; i++) n = n * 26 + (up.charCodeAt(i) - 64);
    return n - 1;
  };

  const mapValueByCol = (item: TransportAccounting, col: number): any => {
    let value: any;
    switch (col) {
      case 0: value = item.dateOfPickup; break;
      case 1: value = item.numberOfContainer; break;
      case 2: value = item.cargo; break;
      case 3: value = item.typeOfContainer; break;
      case 4: value = item.dateOfSubmission; break;
      case 5: value = item.addressOfDelivery; break;
      case 6: value = item.ourFirm; break;
      case 7: value = item.client; break;
      case 8: value = item.formPayAs; break;
      case 9: value = item.summa; break;
      case 10: value = item.numberOfBill; break;
      case 11: value = item.dateOfBill; break;
      case 12: value = item.datePayment; break;
      case 13: value = item.contractor; break;
      case 14: value = item.driver; break;
      case 15: value = item.formPayHim; break;
      case 16: value = item.contractorRate; break;
      case 17: value = item.sumIssued; break;
      case 18: value = item.numberOfBillAdd; break;
      case 19: value = item.dateOfPaymentContractor; break;
      case 20: value = item.manager; break;
      case 21: value = item.departmentHead; break;
      case 22: value = item.clientLead; break;
      case 23: value = item.salesManager; break;
      case 24: value = item.additionalExpenses; break;
      case 25: value = item.income; break;
      case 26: value = item.incomeLearned; break;
      case 27: value = item.id; break;
      default: value = ''; break;
    }

    // Нормализуем числовые колонки
    const numericColumns = new Set([9, 16, 17, 24, 25, 26]);
    if (numericColumns.has(col)) {
      return normalizeNumericValue(value);
    }

    return value;
  };

  // --- ВСЕГДА заблокированные колонки для менеджера (E,K,L,M,R,T,Z,AA,AB) ---
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27]);

  /**
   * renderRow:
   * собирает строку через buildRowCells(item, me) и делает единый setValues для всей строки.
   * Это гарантирует, что значение и стиль применятся одновременно (без множественных setValue по одной ячейке).
   */
  const renderRow = async (sheet: any, item: TransportAccounting, rowIndex: number) => {
    try {
      let rowCells = await buildRowCells(item, me);
      // Нормализуем числовые значения
      rowCells = normalizeRowCellsNumericValues(rowCells);
      
      const rowArray = Array.from({ length: 28 }, (_, col) => {
        const c = (rowCells as any)[col];
        if (!c) {
          return { v: '', s: col === 27 ? 'id' : 'ar' };
        }
        return { v: c.v ?? '', s: c.s ?? (col === 27 ? 'id' : 'ar') };
      });

      sheet.getRange(rowIndex, 0, 1, 28).setValues([rowArray]);
    } catch (e) {
      console.error('[renderRow] failed', e);
    }
  };

  // Оставляем для совместимости — но теперь не используем setValue по ячейке.
  const applyRowStyles = (sheet: any, item: any, rowIndex: number) => {
    try {
      const isManager = me?.roleCode === 'ROLE_MANAGER';
      const isAdminOrBuh = me?.roleCode === 'ROLE_ADMIN' || me?.roleCode === 'ROLE_BUH';

      const blocked = new Set<number>();
      if (isManager && Array.isArray(item?.managerBlockListCell)) {
        for (const rng of item.managerBlockListCell) {
          if (!Array.isArray(rng)) continue;
          if (rng.length === 1 && rng[0]) blocked.add(lettersToIndex(rng[0]));
          else if (rng.length >= 2 && rng[0] && rng[1]) {
            const a = lettersToIndex(rng[0]); const b = lettersToIndex(rng[1]);
            for (let c = a; c <= b; c++) blocked.add(c);
          }
        }
      }

      // NOTE: этот метод оставлен для редких случаев, но основной путь установки значений/стилей —
      // через renderRow / rerenderSheet (batch setValues).
      for (let col = 0; col < 27; col++) {
        let s = 'ar';
        if (isManager && (MANAGER_LOCKED_COLUMNS.has(col) || blocked.has(col))) {
          s = 'lockedCol';
        } else if (item?.managerBlock && !isAdminOrBuh) {
          s = 'lockedRow';
        }
        try {
          // безопасная запись стиля (не трогаем значение)
          sheet.getRange(rowIndex, col).setValue({ s });
        } catch { /* noop */ }
      }
    } catch (e) {
      console.warn('[applyRowStyles] failed', e);
    }
  };

  const renderRowSyncFast = (sheet: any, item: TransportAccounting, rowIndex: number) => {
    // fallback synchronous render without calling buildRowCells (если нужно)
    try {
      const rowVals = Array.from({ length: 28 }, (_, col) => {
        const v = mapValueByCol(item, col); // mapValueByCol уже нормализует числовые значения
        const s = (col === 27) ? 'id' : (me?.roleCode === 'ROLE_MANAGER' && MANAGER_LOCKED_COLUMNS.has(col) ? 'lockedCol' : 'ar');
        return { v, s };
      });
      sheet.getRange(rowIndex, 0, 1, 28).setValues([rowVals]);
    } catch (e) {
      console.error('[renderRowSyncFast] failed', e);
    }
  };

  // ---------- build initial workbook ----------
  const initialRowIndexMap = new Map<string, Map<number, number>>();
  const sheetsDef: Record<string, any> = {};
  let i = 0;

  for (const [periodName, items] of Object.entries(records || {})) {
    const id = `sheet-${++i}`;
    const data = (items as TransportAccounting[]) ?? [];
    const rowsToAdd = 100;

    const headerRow: Record<number, { v: any, s?: string }> = {};
    HEADERS.forEach((h, col) => { headerRow[col] = { v: h, s: 'hdr' }; });

    const cellData: Record<number, Record<number, { v: any, s?: string }>> = { 0: headerRow };

    const rowIndexMap = new Map<number, number>();
    for (let r = 0; r < data.length; r++) {
      const rec = data[r]!;
      // buildRowCells возвращает структуру { colIndex: { v, s }, ... }
      let rowCells = await buildRowCells(rec, me);
      // Нормализуем числовые значения в rowCells
      rowCells = normalizeRowCellsNumericValues(rowCells);
      cellData[r + 1] = rowCells;
      const recId = Number(rec?.id);
      if (Number.isFinite(recId)) rowIndexMap.set(recId, r + 1);
    }
    initialRowIndexMap.set(periodName, rowIndexMap);

    const totalRows = data.length + rowsToAdd;
    tr.value = totalRows;

    for (let r = data.length + 1; r < totalRows; r++) {
      const empty: Record<number, { v: any, s?: string }> = {};
      for (let c = 0; c < 28; c++) {
        // исправлено: ранее было 'a' (опечатка) — используем 'ar' (defined in styles.ts)
        let style = 'ar';
        if (c === 27) style = 'id';
        else if (me?.roleCode === 'ROLE_MANAGER' && MANAGER_LOCKED_COLUMNS.has(c)) style = 'lockedCol'; // <- ВСЕГДА для менеджера
        else if (c === 0) style = 'ar';
        empty[c] = { v: '', s: style };
      }
      cellData[r] = empty;
    }

    const { columnData, rowData } = autoFitColumnAndRowData(cellData, 28);
    sheetsDef[id] = {
      id, name: periodName, tabColor: '#009999', hidden: 0,
      rowCount: totalRows, columnCount: 28, zoomRatio: 1,
      freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
      defaultColumnWidth: 120, defaultRowHeight: 28, columnData, rowData,
      cellData, showGridLines: 1, rowHeader: { width: 50, hidden: 0 },
      columnHeader: { height: 28, hidden: 0 }, rightToLeft: 0
    };
  }

  const parsePeriod = (name: string): number => {
    const m = /^([01]?\d)\.(\d{4})$/.exec(String(name).trim());
    if (!m) return Number.MAX_SAFE_INTEGER;
    return Number(m[2]) * 100 + Number(m[1]);
  };
  const order = Object.keys(sheetsDef).sort((a, b) => {
    const na = sheetsDef[a]?.name ?? '';
    const nb = sheetsDef[b]?.name ?? '';
    return parsePeriod(na) - parsePeriod(nb);
  });

  univerAPI.createWorkbook({
    id: 'workbook-1',
    sheetOrder: order,
    name: 'TransportAccounting',
    styles, sheets: sheetsDef, resources: []
  });

  // сохранить API в стор
  try {
    const uniStore = useUniverStore();
    uniStore.setUniver(univerAPI);
  } catch (e) {
  }

  // ---------- expose API & header styling ----------
  try {
    const { setUniverApi } = await import('~/composables/useUniverApi');
    setUniverApi(univerAPI);

    try {
      const { useTheme } = await import('~/composables/useTheme');
      const { darkTheme } = useTheme();
      const isDark = !!darkTheme.value;
      await withHeaderUnlocked(univerAPI, async () => {
        const wb = univerAPI.getActiveWorkbook?.();
        const sheets = wb?.getSheets?.() || [];
        for (const s of sheets as any[]) {
          for (let col = 0; col < 28; col++) {
            s.getRange(0, col)?.setValue?.({ s: isDark ? 'hdrDark' : 'hdr' });
          }
        }
      });
    } catch {}
  } catch {}

  // ---------- socket wiring with address-only rendering ----------
  try {
    const store = useSheetStore();
    const { $wsOnMessage } = useNuxtApp();

    const rowIndexMapByList = new Map(initialRowIndexMap);
    const lastCounts = new Map<string, number>(
      Object.entries(records || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
    );

    type QItem = { type: 'create' | 'update'; rec: any };
    const queue = new Map<string, QItem[]>();
    let scheduled = false;
    const RENDER_ONLY_ACTIVE_SHEET = me?.roleCode === 'ROLE_ADMIN';

    // flush теперь async — ожидает renderRow, который использует batch setValues
    const flush = async () => {
      scheduled = false;
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return;
      const activeName = wb.getActiveSheet()?.getSheet()?.getName?.() || '';

      for (const [listName, items] of queue) {
        queue.delete(listName);
        if (!items.length) continue;
        if (RENDER_ONLY_ACTIVE_SHEET && listName !== activeName) continue;

        const sheet = wb.getSheetByName(listName);
        if (!sheet) continue;

        const idToRow = rowIndexMapByList.get(listName) || new Map<number, number>();
        rowIndexMapByList.set(listName, idToRow);

        const creates: any[] = [];
        const updates: any[] = [];
        for (const qi of items) (qi.type === 'create' ? creates : updates).push(qi.rec);

        if (updates.length) {
          const arr = store.records[listName] || [];
          for (const it of updates) {
            const id = Number(it?.id);
            let rowIndex = idToRow.get(id);
            if (!rowIndex) {
              const idx = arr.findIndex((r: any) => Number(r?.id) === id);
              if (idx >= 0) rowIndex = idx + 1;
            }
            if (rowIndex) {
              // ожидаем renderRow, чтобы гарантировать порядок и консистентность
              await renderRow(sheet, it as TransportAccounting, rowIndex);
            }
          }
        }

        if (creates.length) {
          const baseLen = store.records[listName]?.length ?? (lastCounts.get(listName) ?? 0);
          let cursor = baseLen;
          for (const it of creates) {
            const anchored = store.takeAnchoredCreateRow(listName);
            const rowIndex = (typeof anchored === 'number' && anchored >= 1) ? anchored : (cursor + 1);
            await renderRow(sheet, it as TransportAccounting, rowIndex);
            const id = Number(it?.id);
            if (Number.isFinite(id)) idToRow.set(id, rowIndex);
            if (!(typeof anchored === 'number' && anchored >= 1)) cursor++;
          }
          lastCounts.set(listName, Math.max(lastCounts.get(listName) ?? 0, cursor));
        }
      }
    };

    const rerenderSheet = async (listName: string) => {
      const wb = univerAPI.getActiveWorkbook();
      const sheet = wb?.getSheetByName(listName);
      if (!sheet) return;
      const items = store.records[listName] || [];
      const rows = items.length;

      if (rows > 0) {
        const matrix: any[] = [];
        for (let i = 0; i < items.length; i++) {
          let obj = await buildRowCells(items[i], me);
          // Нормализуем числовые значения
          obj = normalizeRowCellsNumericValues(obj);
          const rowArr = Array.from({ length: 28 }, (_, col) => {
            const c = (obj as any)[col];
            return c ? { v: c.v ?? '', s: c.s ?? (col === 27 ? 'id' : 'ar') } : { v: '', s: col === 27 ? 'id' : 'ar' };
          });
          matrix.push(rowArr);
        }
        sheet.getRange(1, 0, rows, 28).setValues(matrix);
      }

      // обновляем id->row карту
      const idToRow = new Map<number, number>();
      for (let r = 0; r < rows; r++) {
        const id = Number(items[r]?.id);
        if (Number.isFinite(id)) idToRow.set(id, r + 1);
      }
      rowIndexMapByList.set(listName, idToRow);

      const prev = lastCounts.get(listName) ?? rows;
      if (prev > rows) {
        const toClear = prev - rows;
        const empty = Array.from({ length: toClear }, () =>
          Array.from({ length: 28 }, () => ({ v: '', s: 'ar' }))
        );
        sheet.getRange(rows + 1, 0, toClear, 28).setValues(empty);
      }
      lastCounts.set(listName, rows);
    };

    if (typeof $wsOnMessage === 'function') {
      $wsOnMessage((payload: any) => {
        const wb = univerAPI.getActiveWorkbook();
        const activeName = wb?.getActiveSheet()?.getSheet()?.getName() || '';
        store.applySocketMessage?.(payload as any, activeName);
      });
    }

    store.socketHandlers.push((msg: any) => {
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return;

      const byList: Record<string, any[]> =
        msg?.transportAccountingDto?.object ??
        msg?.transportAccountingDTO?.object ??
        msg?.object ?? {};

      let dtoArray: any[] | undefined = msg?.transportAccountingDto ?? msg?.transportAccountingDTO;

      if (Array.isArray(dtoArray) && dtoArray.length && !Object.keys(byList).length) {
        const ln = wb.getActiveSheet()?.getSheet()?.getName?.() || '';
        for (const it of dtoArray) {
          const key = it?.listName || ln;
          (byList[key] ||= []).push(it);
        }
      }

      for (const [listName, items] of Object.entries(byList)) {
        if (!items?.length) continue;

        if (msg.type === 'status_delete') {
          // rerenderSheet async
          setTimeout(() => { rerenderSheet(listName).catch(console.error); }, 0);
          continue;
        }

        const arr = queue.get(listName) || [];
        for (const it of items) {
          const type: 'create' | 'update' = msg.type === 'status_create' ? 'create' : 'update';
          arr.push({ type, rec: it });
        }
        queue.set(listName, arr);
      }

      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          // flush может быть async
          (async () => { try { await flush(); } catch (e) { console.error(e); } })();
        });
      }
    });
  } catch (e) {
    console.error('[socket/handlers] wiring failed:', e);
  }

  // ---------- post-init: validations/filters/CF for ALL sheets; then protect headers ----------
  const allSheets = univerAPI.getActiveWorkbook()?.getSheets() || [];
  for (const s of allSheets as FWorksheet[]) {
    await addDataValidation(univerAPI, s);
    await addFilters(univerAPI, s);
    await addConditionalFormatting(univerAPI, s);
  }
  await lockHeaders(univerAPI);

  // дождаться полного рендера UI
  await nextTick();
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => requestAnimationFrame(() => r(null)));

  // финальные флаги готовности
  univerStore.setUiReady(true);
  univerStore.endQuiet();
  univerStore.setBatchProgress(false);

  // ---------- register UI edit events (ПОСЛЕ готовности) ----------
  registerUniverEvents(univerAPI);

  ;(globalThis as any).univerInstance = univerAPI
  return univerAPI;
}