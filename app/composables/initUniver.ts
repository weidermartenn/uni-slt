import type { FUniver } from '@univerjs/presets';
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types';
import { autoFitColumnAndRowData } from '~/helpers/autoFit';
import { buildRowCells } from '~/helpers/build-rows';
import { addDataValidation } from '~/helpers/validation';
import { HEADERS } from '~/pages/sheet/attributes/headers';
import { styles } from '~/pages/sheet/attributes/styles';

export async function initUniver(records: Record<string, any[]>): Promise<FUniver> {
  if (typeof window === 'undefined') {
    throw new Error('initUniver must be called on the client');
  }

  const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
  const me: any = $fetch("/api/auth/me", { headers })

  const [{ createUniver, LocaleType, mergeLocales }, { UniverSheetsCorePreset }, SheetsCoreRuRU, SheetsCoreEnUS, { UniverSheetsDataValidationPreset }, SheetsDVEnUS, SheetsDVRuRU] = await Promise.all([
    import('@univerjs/presets'),
    import('@univerjs/preset-sheets-core'),
    import('@univerjs/preset-sheets-core/locales/ru-RU'),
    import('@univerjs/preset-sheets-core/locales/en-US'),
    import('@univerjs/preset-sheets-data-validation'),
    import('@univerjs/preset-sheets-data-validation/locales/en-US'),
    import('@univerjs/preset-sheets-data-validation/locales/ru-RU'),
  ]);

  await import('@univerjs/network/facade');

  const { univerAPI } = createUniver({
    locale: LocaleType.RU_RU,
    locales: {
      [LocaleType.EN_US]: mergeLocales(
        (SheetsCoreEnUS as any).default ?? SheetsCoreEnUS,
        (SheetsDVEnUS as any).default ?? SheetsDVEnUS
      ),
      [LocaleType.RU_RU]: mergeLocales(
        (SheetsCoreRuRU as any).default ?? SheetsCoreRuRU,
        (SheetsDVRuRU as any).default ?? SheetsDVRuRU
      ),
    },
    presets: [
      UniverSheetsCorePreset({
        container: 'univer',
        ribbonType: 'simple',
      }),
      UniverSheetsDataValidationPreset(),
    ],
  });

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
      for (let c = 0; c < 28; c++) empty[c] = { v: '', s: 'allrows' }
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
    // expects "MM.YYYY"
    const m = /^([01]?\d)\.(\d{4})$/.exec(String(name).trim());
    if (!m) return Number.MAX_SAFE_INTEGER;
    const mm = Number(m[1]);
    const yyyy = Number(m[2]);
    return yyyy * 100 + mm; // sortable numeric key
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

  await addDataValidation(univerAPI);

  return univerAPI;
}