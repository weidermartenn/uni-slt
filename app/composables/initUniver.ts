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
import { addConditionalFormatting } from '~/helpers/conditionalFormatting';
import type { FWorksheet } from '@univerjs/preset-sheets-core';
import { getUser } from '~/helpers/getUser';
import UpdateHistoryButtonIcon from '~/univer/custom-menu/components/button-icon/UpdateHistoryButtonIcon.vue';
import { useUniverStore } from '~/stores/univer-store';
import CellHistorySidebar from '~/components/CellHistorySidebar.vue';

const tr = ref<number>(0);

export async function initUniver(records: Record<string, any[]>): Promise<FUniver> {
  if (typeof window === 'undefined') throw new Error('initUniver must be called on the client');

  const me = getUser()

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
    UniverPresetSheetsConditionalFormattingRuRU
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
  ]);
  await import('@univerjs/preset-sheets-filter/lib/index.css');
  await import('@univerjs/preset-sheets-conditional-formatting/lib/index.css');

  const { univer, univerAPI } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        (SheetsCoreEnUS as any).default ?? SheetsCoreEnUS,
        (SheetsDVEnUS as any).default ?? SheetsDVEnUS,
        (UniverPresetSheetsFilterEnUS as any).default ?? UniverPresetSheetsFilterEnUS,
        (UniverPresetSheetsConditionalFormattingEnUS as any).default ?? UniverPresetSheetsConditionalFormattingEnUS
      ),
      [LocaleType.RU_RU]: mergeLocales(
        (SheetsCoreRuRU as any).default ?? SheetsCoreRuRU,
        (SheetsDVRuRU as any).default ?? SheetsDVRuRU,
        (UniverPresetSheetsFilterRuRU as any).default ?? UniverPresetSheetsFilterRuRU,
        (UniverPresetSheetsConditionalFormattingRuRU as any).default ?? UniverPresetSheetsConditionalFormattingRuRU
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
    ],
  });

  univer.registerPlugin(UniverVue3AdapterPlugin);
  univer.registerPlugin(UniverSheetsCustomMenuPlugin);

  univerAPI.registerComponent('BidButtonIcon', BidButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('AgreementButtonIcon', AgreementButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('UpdateHistoryButtonIcon', UpdateHistoryButtonIcon, { framework: 'vue3' });
  univerAPI.registerComponent('CellHistorySidebar', CellHistorySidebar, { framework: 'vue3' });

  // ---------- helpers ----------
  const lettersToIndex = (s: string): number => {
    // A->0, Z->25, AA->26, AB->27 ...
    let n = 0;
    for (let i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  };

  const mapValueByCol = (item: TransportAccounting, col: number): any => {
    switch (col) {
      case 0: return item.dateOfPickup;
      case 1: return item.numberOfContainer;
      case 2: return item.cargo;
      case 3: return item.typeOfContainer;
      case 4: return item.dateOfSubmission;
      case 5: return item.addressOfDelivery;
      case 6: return item.ourFirm;
      case 7: return item.client;
      case 8: return item.formPayAs;
      case 9: return item.summa;
      case 10: return item.numberOfBill;
      case 11: return item.dateOfBill;
      case 12: return item.datePayment;
      case 13: return item.contractor;
      case 14: return item.driver;
      case 15: return item.formPayHim;
      case 16: return item.contractorRate;
      case 17: return item.sumIssued;
      case 18: return item.numberOfBillAdd;
      case 19: return item.dateOfPaymentContractor;
      case 20: return item.manager;
      case 21: return item.departmentHead;
      case 22: return item.clientLead;
      case 23: return item.salesManager;
      case 24: return item.additionalExpenses;
      case 25: return item.income;
      case 26: return item.incomeLearned;
      case 27: return item.id;
      default: return '';
    }
  };

  const applyRowStyles = (sheet: any, item: any, rowIndex: number) => {
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
    for (let col = 0; col < 27; col++) { // exclude ID style
      let s = 'ar';
      if ([25, 26].includes(col) || (isManager && blocked.has(col))) s = 'lockedCol';
      else if (item?.managerBlock && !isAdminOrBuh) s = 'lockedRow';
      sheet.getRange(rowIndex, col).setValue({ s });
    }
  };

  const renderRow = (sheet: any, item: TransportAccounting, rowIndex: number) => {
    const rowVals = Array.from({ length: 28 }, (_, col) => ({ v: mapValueByCol(item, col) }));
    sheet.getRange(rowIndex, 0, 1, 28).setValues([rowVals]);
    applyRowStyles(sheet, item, rowIndex);
  };

  // ---------- build initial workbook ----------
  const initialRowIndexMap = new Map<string, Map<number, number>>(); // listName -> (id -> rowIndex)
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
      const rowCells = await buildRowCells(rec, me);
      cellData[r + 1] = rowCells;
      const recId = Number(rec?.id);
      if (Number.isFinite(recId)) rowIndexMap.set(recId, r + 1);
    }
    initialRowIndexMap.set(periodName, rowIndexMap);

    const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27]);

    const totalRows = data.length + rowsToAdd;
    tr.value = totalRows;

    for (let r = data.length + 1; r < totalRows; r++) {
      const empty: Record<number, { v: any, s?: string }> = {};
      for (let c = 0; c < 28; c++) {
        let style = 'a';
        if (c === 27) style = 'id';
        else if (me?.roleCode === 'ROLE_MANAGER' && MANAGER_LOCKED_COLUMNS.has(c)) style = 'lockedCol';
        else if ([25, 26].includes(c)) style = 'lockedCol';
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

  try {
    const uniStore = useUniverStore();
    uniStore.setUniver(univerAPI);
  } catch (e) {
    console.log(e);
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

  // ---------- register UI edit events ----------
  registerUniverEvents(univerAPI);

  // ---------- socket wiring with address-only rendering ----------
  try {
    const store = useSheetStore();
    const { $wsOnMessage } = useNuxtApp();

    // Быстрый доступ к строке по id
    const rowIndexMapByList = new Map(initialRowIndexMap); // копия, будем дополнять
    const lastCounts = new Map<string, number>(
      Object.entries(records || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])
    );

    // Батч-очередь на один кадр
    type QItem = { type: 'create' | 'update'; rec: any };
    const queue = new Map<string, QItem[]>(); // listName -> items
    let scheduled = false;
    const RENDER_ONLY_ACTIVE_SHEET = me?.roleCode === 'ROLE_ADMIN'; // критично для админа

    const flush = () => {
      scheduled = false;
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return;
      const activeName = wb.getActiveSheet()?.getSheet()?.getName?.() || '';

      for (const [listName, items] of queue) {
        queue.delete(listName);
        if (!items.length) continue;

        if (RENDER_ONLY_ACTIVE_SHEET && listName !== activeName) {
          // Пропускаем оффскрин-рендер для админа — обновим UI, когда откроет вкладку.
          continue;
        }

        const sheet = wb.getSheetByName(listName);
        if (!sheet) continue;

        const idToRow = rowIndexMapByList.get(listName) || new Map<number, number>();
        rowIndexMapByList.set(listName, idToRow);

        // Разделим на create & update для корректных индексов
        const creates: any[] = [];
        const updates: any[] = [];
        for (const qi of items) (qi.type === 'create' ? creates : updates).push(qi.rec);

        // updates — адресные
        if (updates.length) {
          const arr = store.records[listName] || [];
          for (const it of updates) {
            const id = Number(it?.id);
            let rowIndex = idToRow.get(id);
            if (!rowIndex) {
              // fallback: найдём по массиву (редкий случай)
              const idx = arr.findIndex((r: any) => Number(r?.id) === id);
              if (idx >= 0) rowIndex = idx + 1;
            }
            if (rowIndex) renderRow(sheet, it as TransportAccounting, rowIndex);
          }
        }

        // creates — добавляем в конец
        if (creates.length) {
          // длина ДО мутации стора (socketHandlers вызываются до splice/push)
          const baseLen = store.records[listName]?.length ?? (lastCounts.get(listName) ?? 0);
          let cursor = baseLen;
          for (const it of creates) {
            const anchored = store.takeAnchoredCreateRow(listName);
            const rowIndex = (typeof anchored === 'number' && anchored >= 1) ? anchored : (cursor + 1)                                     
            renderRow(sheet, it as TransportAccounting, rowIndex);
            const id = Number(it?.id);
            if (Number.isFinite(id)) idToRow.set(id, rowIndex);
            if (!(typeof anchored === 'number' && anchored >= 1)) cursor++;
          }
          lastCounts.set(listName, Math.max(lastCounts.get(listName) ?? 0, cursor));
        }
      }                 
    };

    // Полная перерисовка листа (используем для delete)
    const rerenderSheet = (listName: string) => {
      const wb = univerAPI.getActiveWorkbook();
      const sheet = wb?.getSheetByName(listName);
      if (!sheet) return;
      const items = store.records[listName] || [];
      const rows = items.length;

      if (rows > 0) {
        const matrix = items.map((it: TransportAccounting) =>
          Array.from({ length: 28 }, (_, col) => ({ v: mapValueByCol(it, col) }))
        );
        sheet.getRange(1, 0, rows, 28).setValues(matrix);
        // стили построчно
        for (let r = 0; r < rows; r++) applyRowStyles(sheet, items[r], r + 1);
      }

      // пересобираем карту индексов
      const idToRow = new Map<number, number>();
      for (let r = 0; r < rows; r++) {
        const id = Number(items[r]?.id);
        if (Number.isFinite(id)) idToRow.set(id, r + 1);
      }
      rowIndexMapByList.set(listName, idToRow);

      // очистка хвоста
      const prev = lastCounts.get(listName) ?? rows;
      if (prev > rows) {
        const toClear = prev - rows;
        const empty = Array.from({ length: toClear }, () =>
          Array.from({ length: 28 }, () => ({ v: '' }))
        );
        sheet.getRange(rows + 1, 0, toClear, 28).setValues(empty);
      }
      lastCounts.set(listName, rows);
    };

    // Сырой сокет → нормализованный стор
    if (typeof $wsOnMessage === 'function') {
      $wsOnMessage((payload: any) => {
        const wb = univerAPI.getActiveWorkbook();
        const activeName = wb?.getActiveSheet()?.getSheet()?.getName() || '';
        store.applySocketMessage?.(payload as any, activeName);
      });
    }

    // Адресные UI-апдейты ДО мутации стора (socketHandlers вызываются в начале applySocketMessage)
    store.socketHandlers.push((msg: any) => {
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return;

      // Собираем byList
      const byList: Record<string, any[]> =
        msg?.transportAccountingDto?.object ??
        msg?.transportAccountingDTO?.object ??
        msg?.object ?? {};

      let dtoArray: any[] | undefined =
        msg?.transportAccountingDto ?? msg?.transportAccountingDTO;

      if (Array.isArray(dtoArray) && dtoArray.length && !Object.keys(byList).length) {
        // fallback: сгруппировать по listName; если его нет — в активный лист
        const ln = wb.getActiveSheet()?.getSheet()?.getName?.() || '';
        for (const it of dtoArray) {
          const key = it?.listName || ln;
          (byList[key] ||= []).push(it);
        }
      }

      for (const [listName, items] of Object.entries(byList)) {
        if (!items?.length) continue;

        if (msg.type === 'status_delete') {
          // Перерисуем целиком после того, как стор применит изменения
          setTimeout(() => rerenderSheet(listName), 0);
          continue;
        }

        // Скопим creates/updates и отрисуем единым фреймом
        const arr = queue.get(listName) || [];
        for (const it of items) {
          const type: 'create' | 'update' =
            msg.type === 'status_create' ? 'create' : 'update';
          arr.push({ type, rec: it });
        }
        queue.set(listName, arr);
      }

      if (!scheduled) {
        scheduled = true;
        // один батч в кадр
        requestAnimationFrame(flush);
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

  return univerAPI;
}
