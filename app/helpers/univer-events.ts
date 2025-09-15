import type { FUniver } from '@univerjs/presets';

// Centralized Univer event registrations
export function registerUniverEvents(univerAPI: FUniver) {
  // Date columns: A, E, L, M, T -> indices 0, 4, 11, 12, 19
  const dateCols = new Set([0, 4, 11, 12, 19]);

  // Extract date from mixed strings and normalize to YYYY-MM-DD
  const normalizeDateInput = (raw: any): string | null => {
    const str = String((raw && typeof raw === 'object' && 'v' in raw) ? (raw as any).v : (raw ?? '')).trim();
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
    if (!dateCols.has(col)) return;

    const wb = univerAPI.getActiveWorkbook();
    if (!wb) return;
    const aws = wb.getActiveSheet();
    const s = aws.getSheet();
    if (!s) return;

    const cellValue = s.getCell(row, col);
    const normalizedDate = normalizeDateInput(cellValue);
    if (!normalizedDate) {
      await univerAPI.undo();
      try {
        const toast = useToast();
        toast.add({
          title: 'Значение не в формате даты',
          description: `В ячейке ${aws.getRange(row, col).getA1Notation()} значение не является датой\nИспользуйте формат "YYYY-MM-DD" или "dd.mm.yyyy"`,
          color: 'error',
          duration: 3000,
        });
      } catch {}
      return;
    }

    const range = aws.getRange(row, col);
    range.setValue({ v: normalizedDate });
  });

  // Return disposer to allow cleanup by caller if needed
  return () => {
    try { (offEditEnded as any)?.dispose?.(); } catch {}
  };
}