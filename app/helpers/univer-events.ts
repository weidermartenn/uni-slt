// univer-events.ts
import type { FUniver } from "@univerjs/presets"
import { useToast } from "#imports"
import { useSheetStore } from "~/stores/sheet-store-optimized"
import { useUniverStore } from "~/stores/univer-store"
import { getUser } from "./getUser"
import { useUniverWorker } from "~/composables/useUniverWorker"
import { unwrapV, toStr, normalizeDateInput, isNumericOrEmpty } from "~/helpers/utils"
import { buildSR } from "~/helpers/buildSR"

export function registerUniverEvents(univerAPI: FUniver) {
  console.log('🔄 [registerUniverEvents] регистрация событий Univer');
  const { handleRowChangeOptimized } = useUniverWorker()
  const univerStore = useUniverStore()
  const sheetStore = useSheetStore()
  const toast = useToast()

  let pasteProcessing = false
  let isQuietUpdate = false
  let cachedMe: any | undefined
  const processingRows = new Set<string>()

  const getMe = async () => {
    if (!cachedMe) {
      console.log('👤 [registerUniverEvents.getMe] получение пользователя');
      cachedMe = getUser();
    }
    return cachedMe;
  }

  const dateCols = new Set([0, 4, 11, 12, 19])
  const NUMERIC_COLS = new Set([9, 16, 17, 24, 25, 26])
  const MANAGER_LOCKED_COLUMNS = new Set([4, 10, 11, 12, 17, 19, 25, 26, 27])

  const letterToCol = (l: string) => l.charCodeAt(0) - 65

  const isCellLockedForManager = (listName: string, row: number, col: number): boolean => {
    if (row <= 0) {
      console.log(`🔒 [registerUniverEvents.isCellLockedForManager] строка ${row} <= 0 - заблокировано`);
      return true;
    }
    if (MANAGER_LOCKED_COLUMNS.has(col)) {
      console.log(`🔒 [registerUniverEvents.isCellLockedForManager] колонка ${col} в MANAGER_LOCKED_COLUMNS - заблокировано`);
      return true;
    }
    
    const rec = sheetStore.records?.[listName]?.[row - 1]
    const locks = rec?.managerBlockListCell
    if (!Array.isArray(locks)) {
      console.log(`🔓 [registerUniverEvents.isCellLockedForManager] нет блокировок для строки ${row}`);
      return false;
    }
    
    for (const l of locks) {
      if (l.length === 1 && l[0]) {
        if (letterToCol(l[0]) === col) {
          console.log(`🔒 [registerUniverEvents.isCellLockedForManager] ячейка ${row},${col} заблокирована (одиночная)`);
          return true;
        }
      } else if (l.length === 2) {
        const a = letterToCol(l[0] ?? ""), b = letterToCol(l[1] ?? "");
        if (col >= a && col <= b) {
          console.log(`🔒 [registerUniverEvents.isCellLockedForManager] ячейка ${row},${col} заблокирована (диапазон ${l[0]}-${l[1]})`);
          return true;
        }
      }
    }
    
    console.log(`🔓 [registerUniverEvents.isCellLockedForManager] ячейка ${row},${col} не заблокирована`);
    return false;
  }

  const offBeforePaste = univerAPI.addEvent(
    univerAPI.Event.BeforeClipboardPaste,
    (params: any) => {
      console.log('📋 [registerUniverEvents.BeforeClipboardPaste] начало обработки вставки');
      pasteProcessing = true
      
      const normalize = (v: any, c: number) => {
        let result = v;
        if (dateCols.has(c)) {
          result = normalizeDateInput(v) ?? v;
          console.log(`📅 [registerUniverEvents.BeforeClipboardPaste] нормализация даты: ${v} -> ${result}`);
        } else if (NUMERIC_COLS.has(c)) {
          result = String(v).replace(/\s/g, "").replace(",", ".");
          console.log(`🔢 [registerUniverEvents.BeforeClipboardPaste] нормализация числа: ${v} -> ${result}`);
        }
        return result;
      }

      if (Array.isArray(params.cells)) {
        console.log('📋 [registerUniverEvents.BeforeClipboardPaste] нормализация вставленных данных');
        params.cells = params.cells.map((row: any[]) => 
          row.map((val, colIndex) => normalize(val, colIndex))
        );
      }
    }
  )

  const offPasted = univerAPI.addEvent(
    univerAPI.Event.ClipboardPasted,
    async () => {
      console.log('📋 [registerUniverEvents.ClipboardPasted] вставка завершена');
      setTimeout(() => {
        pasteProcessing = false;
        console.log('📋 [registerUniverEvents.ClipboardPasted] флаг pasteProcessing сброшен');
      }, 30);
    }
  )

  const offValueChanged = univerAPI.addEvent(
    univerAPI.Event.SheetValueChanged,
    async (params: any) => {
      console.log('🔄 [registerUniverEvents.SheetValueChanged] изменение значения');
      const trigger = params?.trigger ?? params?.payload?.params?.trigger ?? "";
      console.log(`🔧 [registerUniverEvents.SheetValueChanged] триггер: ${trigger}`);
      
      if (univerStore.isQuiet?.() || isQuietUpdate || pasteProcessing) {
        console.log('⏭️ [registerUniverEvents.SheetValueChanged] тихое обновление или вставка - пропускаем');
        return;
      }

      const wb = univerAPI.getActiveWorkbook()
      const ws = wb?.getActiveSheet()
      const sheet = ws?.getSheet()
      if (!sheet || !ws) {
        console.warn('⚠️ [registerUniverEvents.SheetValueChanged] лист не найден');
        return;
      }

      const listName = sheet.getName()
      console.log(`📊 [registerUniverEvents.SheetValueChanged] имя листа: ${listName}`);
      
      const me = await getMe()
      const cv = params?.cellValue ?? params?.payload?.params?.cellValue
      if (!cv || typeof cv !== "object") {
        console.warn('⚠️ [registerUniverEvents.SheetValueChanged] нет данных cellValue');
        return;
      }

      console.log(`📝 [registerUniverEvents.SheetValueChanged] измененные строки: ${Object.keys(cv).length}`);

      for (const rowKey of Object.keys(cv)) {
        const row = Number(rowKey)
        if (row <= 0) {
          console.log(`⏭️ [registerUniverEvents.SheetValueChanged] строка ${row} <= 0 - пропускаем`);
          continue;
        }
        
        const colSet = Object.keys(cv[rowKey]).map(Number)
        console.log(`📝 [registerUniverEvents.SheetValueChanged] строка ${row}, измененные колонки: ${colSet}`);

        // 🔒 Блокировка менеджера
        if (me?.roleCode === "ROLE_MANAGER") {
          console.log('👨‍💼 [registerUniverEvents.SheetValueChanged] проверка блокировок для менеджера');
          const blocked = colSet.some(col => isCellLockedForManager(listName, row, col))
          if (blocked) {
            console.log('🚫 [registerUniverEvents.SheetValueChanged] ячейки заблокированы для менеджера - отмена изменений');
            try { 
              univerStore.beginQuiet?.();
              console.log('🔇 [registerUniverEvents.SheetValueChanged] включен тихий режим');
            } catch {}
            
            isQuietUpdate = true;
            for (const c of colSet) {
              console.log(`❌ [registerUniverEvents.SheetValueChanged] сброс значения ячейки ${row},${c}`);
              ws.getRange(row, c).setValue({ v: "" });
            }
            
            isQuietUpdate = false;
            try { 
              univerStore.endQuiet?.();
              console.log('🔊 [registerUniverEvents.SheetValueChanged] выключен тихий режим');
            } catch {}
            return;
          }
        }

        // 🔢 Валидация чисел
        for (const col of colSet) {
          const val = cv[rowKey][col]?.v;
          if (NUMERIC_COLS.has(col) && !isNumericOrEmpty(val)) {
            console.warn(`⚠️ [registerUniverEvents.SheetValueChanged] некорректное число в ячейке ${row},${col}: ${val}`);
            toast.add({
              title: "Ошибка",
              description: `В ячейке ${row + 1}, ${col + 1} должно быть число`,
              color: "warning",
              icon: "i-lucide-alert-triangle",
              duration: 3000,
            });
            
            try { 
              univerStore.beginQuiet?.();
              console.log('🔇 [registerUniverEvents.SheetValueChanged] включен тихий режим для сброса значения');
            } catch {}
            
            isQuietUpdate = true;
            ws.getRange(row, col).setValue({ v: "" });
            isQuietUpdate = false;
            
            try { 
              univerStore.endQuiet?.();
              console.log('🔊 [registerUniverEvents.SheetValueChanged] выключен тихий режим');
            } catch {}
            return;
          }
        }

        const rowVals = ws.getRange(row, 0, 1, 28).getValues()?.[0] ?? [];
        const idStr = toStr(rowVals[27]);
        const processingKey = `${listName}#${row}`;

        if (processingRows.has(processingKey)) {
          console.log(`⏳ [registerUniverEvents.SheetValueChanged] строка ${row} уже обрабатывается - пропускаем`);
          return;
        }
        
        processingRows.add(processingKey);
        console.log(`🔒 [registerUniverEvents.SheetValueChanged] добавлена блокировка для строки: ${processingKey}`);

        try {
          console.log(`🔄 [registerUniverEvents.SheetValueChanged] вызов handleRowChangeOptimized для строки ${row}`);
          await handleRowChangeOptimized(
            row,
            -1,
            rowVals,
            listName,
            idStr,
            buildSR
          );
          console.log(`✅ [registerUniverEvents.SheetValueChanged] handleRowChangeOptimized завершен для строки ${row}`);
        } catch (e) {
          console.error('❌ [registerUniverEvents.SheetValueChanged] handleRowChangeOptimized failed:', e);
        } finally {
          processingRows.delete(processingKey);
          console.log(`🔓 [registerUniverEvents.SheetValueChanged] снята блокировка для строки: ${processingKey}`);
        }
      }
    }
  )

  return () => {
    console.log('🧹 [registerUniverEvents] отписка от событий');
    offBeforePaste?.dispose?.();
    offPasted?.dispose?.();
    offValueChanged?.dispose?.();
  }
}