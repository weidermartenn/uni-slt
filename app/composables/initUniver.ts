import type { FUniver } from '@univerjs/presets';
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types';
import { watch } from 'vue';
import { useNuxtApp } from '#app';
import { autoFitColumnAndRowData } from '~/helpers/autoFit';
import { buildRowCells } from '~/helpers/build-rows';
import { addDataValidation } from '~/helpers/validation';
import { HEADERS } from '~/pages/sheet/attributes/headers';
import { styles } from '~/pages/sheet/attributes/styles';
import { lockHeaders } from '~/helpers/univer-protect';
import { registerUniverEvents } from '~/helpers/univer-events';
import { useSheetStore } from '~/stores/sheet-store';
import { addFilters } from '~/helpers/filters';
import { UniverSheetsCustomMenuPlugin } from '~/univer/custom-menu'

export async function initUniver(records: Record<string, any[]>): Promise<FUniver> {
  if (typeof window === 'undefined') {
    throw new Error('initUniver must be called on the client');
  }

  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const me: any = await $fetch("/api/auth/me", { headers }).catch(() => null)

  const [
    { createUniver, LocaleType, mergeLocales }, 
    { UniverSheetsCorePreset }, 
    SheetsCoreRuRU, SheetsCoreEnUS, 
    { UniverSheetsDataValidationPreset }, 
    SheetsDVEnUS, SheetsDVRuRU,
    { UniverSheetsFilterPreset },
    UniverPresetSheetsFilterEnUS,
    UniverPresetSheetsFilterRuRU,
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
    import('@univerjs/preset-sheets-filter/locales/ru-RU')
  ]);

  await import('@univerjs/network/facade');
  await import('@univerjs/preset-sheets-filter/lib/index.css');

  const { univer, univerAPI } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        (SheetsCoreEnUS as any).default ?? SheetsCoreEnUS,
        (SheetsDVEnUS as any).default ?? SheetsDVEnUS,
        (UniverPresetSheetsFilterEnUS as any).default ?? UniverPresetSheetsFilterEnUS
      ),
      [LocaleType.RU_RU]: mergeLocales(
        (SheetsCoreRuRU as any).default ?? SheetsCoreRuRU,
        (SheetsDVRuRU as any).default ?? SheetsDVRuRU,
        (UniverPresetSheetsFilterRuRU as any).default ?? UniverPresetSheetsFilterRuRU
      ),
    },
    presets: [
      UniverSheetsCorePreset({
        container: 'univer',
        ribbonType: 'simple',
        footer: {
          menus: false,
        },
      }),
      UniverSheetsDataValidationPreset(),
      UniverSheetsFilterPreset()
    ],
  });

  univer.registerPlugin(UniverSheetsCustomMenuPlugin)

  const sheets: Record<string, any> = {};
  let i = 0;

  for (const [periodName, items] of Object.entries(records || {})) {
    const id = `sheet-${++i}`
    const data = items as TransportAccounting[]
    const rowsToAdd = 100;

    const headerRow: Record<number, { v: any, s?: string }> = {}
    HEADERS.forEach((h, col) => {
      headerRow[col] = { v: h, s: 'hdr' }
    })

    const cellData: Record<number, Record<number, { v: any, s?: string }>> = { 0: headerRow }
    for (let r = 0; r < data.length; r++ ) {
      const rec = data[r]!
      cellData[r + 1] = await buildRowCells(rec, me)
      if (rec?.managerBlock && me?.roleCode !== "ROLE_ADMIN" && me?.roleCode !== "ROLE_BUH") {
        [26, 27].push(r + 1)
      }
    }

    const totalRows = data.length + rowsToAdd 
    for (let r = data.length + 1; r < totalRows; r++) {
      const empty: Record<number, { v: any, s?: string }> = {}
      for (let c = 0; c < 28; c++) {
        // Z (25) and AA (26) are locked, AB (27) has id style
        empty[c] = { v: '', s: c === 27 ? 'id' : ([25, 26].includes(c) ? 'lockedCol' : 'ar') }
      } 
      cellData[r] = empty
    }

    const { columnData, rowData } = autoFitColumnAndRowData(cellData, 28)
    sheets[id] = {
      id, name: periodName, tabColor: '#009999', hidden: 0, 
      rowCount: totalRows, columnCount: 28, zoomRatio: 1,
      freeze: { startRow: 1, startColumn: 0, ySplit: 1, xSplit: 0 },
      defaultColumnWidth: 120, defaultRowHeight: 28, columnData, rowData,
      cellData, showGridLines: 1, rowHeader: { width: 50, hidden: 0 },
      columnHeader: { height: 28, hidden: 0 }, rightToLeft: 0
    }
  }

  const parsePeriod = (name: string): number => {
    const m = /^([01]?\d)\.(\d{4})$/.exec(String(name).trim());
    if (!m) return Number.MAX_SAFE_INTEGER;
    const mm = Number(m[1]);
    const yyyy = Number(m[2]);
    return yyyy * 100 + mm;
  };
  const order = Object.keys(sheets).sort((a, b) => {
    const na = sheets[a]?.name ?? "";
    const nb = sheets[b]?.name ?? "";
    return parsePeriod(na) - parsePeriod(nb);
  });

  univerAPI.createWorkbook({
    id: 'workbook-1',
    sheetOrder: order,
    name: "TransportAccounting",
    styles: styles,
    sheets,
    resources: []
  });

  // Expose API globally for theme and other controls
  try {
    const { setUniverApi } = await import('~/composables/useUniverApi')
    setUniverApi(univerAPI)

    // Apply initial header style depending on theme
    try {
      const { useTheme } = await import('~/composables/useTheme')
      const { withHeaderUnlocked } = await import('~/helpers/univer-protect')
      const { darkTheme } = useTheme()
      const isDark = !!darkTheme.value
      await withHeaderUnlocked(univerAPI, async () => {
        const wb = univerAPI.getActiveWorkbook?.()
        const sheets = wb?.getSheets?.() || []
        for (const s of sheets as any[]) {
          for (let col = 0; col < 28; col++) {
            s.getRange(0, col)?.setValue?.({ s: isDark ? 'hdrDark' : 'hdr' })
          }
        }
      })
    } catch {}
  } catch {}

  // Register sheet events (1: user edits → 2: send add/update)
  registerUniverEvents(univerAPI);

  // 3: receive data from socket → 4: apply on clients via watch() on store.records
  try {
    const store = useSheetStore();
    const { $wsOnMessage } = useNuxtApp();

    // Wire raw socket → store (normalize is inside store.applySocketMessage)
    if (typeof $wsOnMessage === 'function') {
      $wsOnMessage((payload: any) => {
        // Try to infer listName hint from active sheet (fallback)
        const wb = univerAPI.getActiveWorkbook();
        const activeName = wb?.getActiveSheet()?.getSheet()?.getName() || '';
        store.applySocketMessage?.(payload as any, activeName);
      });
    }

    // Column mapping for Univer: index -> value from TransportAccounting
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

    // Track previous rendered count per sheet to clear stale rows on delete
    const lastCounts = new Map<string, number>();

    // Watch per period to update only affected sheet/rows
    watch(() => store.records, (records) => {
      const wb = univerAPI.getActiveWorkbook();
      if (!wb) return;

      Object.entries(records || {}).forEach(([periodName, items]) => {
        const sheet = wb.getSheetByName(periodName);
        if (!sheet) return;

        // Render/refresh rows for actual items
        items.forEach((item: TransportAccounting, index: number) => {
          const row = index + 1; // +1 because 0 is header
          for (let col = 0; col < 28; col++) {
            const v = mapValueByCol(item, col);
            sheet.getRange(row, col).setValue({ v });
          }
          // Apply lock styling only for managers if managerBlock
          const isManager = me?.roleCode === 'ROLE_MANAGER';
          if (isManager && item?.managerBlock) {
            // gray all columns except ID (27)
            for (let col = 0; col < 27; col++) {
              sheet.getRange(row, col).setValue({ s: 'lockedRow'})
            }
          } else {
            // reset to default styles: lockedCol for 25/26, 'ar' for others, keep id (27)
            for (let col = 0; col < 27; col++) {
              const style = (col === 25 || col === 26) ? 'lockedCol' : 'ar';
              sheet.getRange(row, col)
            }
          }
        });

        // Clear stale rows if list shrank (e.g., after delete)
        const prev = lastCounts.get(periodName) ?? 0;
        const curr = Array.isArray(items) ? items.length : 0;
        if (prev > curr) {
          // очищаем только значения, без влияния на стили/валидации
          for (let row = curr + 1; row <= prev; row++) {
            for (let col = 0; col < 28; col++) {
              sheet.getRange(row, col).setValue({ v: '' });
            }
          }
        }
        lastCounts.set(periodName, curr);
      });
    }, { deep: true });
  } catch (e) {
    console.error('[socket/watch] wiring failed:', e);
  }

  await addDataValidation(univerAPI);
  await lockHeaders(univerAPI);

  return univerAPI;
}