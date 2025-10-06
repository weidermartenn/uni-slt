// validation.ts
import { useToast } from '#imports'
import { WrapStrategy } from '@univerjs/core'
import type { FUniver } from '@univerjs/core/facade'
import type { FWorksheet } from '@univerjs/presets/lib/types/preset-sheets-core/index.js'
import { useEmployeeStore } from '~/stores/employee-store'
import { useValidationStore } from '~/stores/validation-store'

/**
 * Добавляет правила валидации и локальные обработчики ввода на конкретный лист.
 * ВАЖНО: никакой registerDropdownValueChanged — всё делаем через SheetEditEnded для этого листа.
 */
export async function addDataValidation(api: FUniver, sheet: FWorksheet) {
  const toast = useToast()

  const validationStore = useValidationStore()
  const employeeStore = useEmployeeStore()

  await validationStore.fetchCompaniesNames()
  await employeeStore.fetchEmployees()

  // --- Справочники ----------------------------------------------------------
  const vatOptions = ['С НДС', 'БЕЗ НДС', 'НДС 0', 'НАЛ'] as const

  const names = (() => {
    const raw = employeeStore.employees.filter(Boolean) as string[]
    return raw.map((e) => {
      const parts = e.split(' ')
      // “Фамилия Имя Отчество” -> “Фамилия Имя”, остальное как есть
      return parts.length === 3 ? `${parts[0]} ${parts[1]}` : e
    })
  })()

  // --- Утилиты --------------------------------------------------------------
  const letterToIndex = (letter: string): number => {
    let n = 0
    for (let i = 0; i < letter.length; i++) {
      n = n * 26 + (letter.charCodeAt(i) - 64)
    }
    return n - 1 // 0-based
  }

  const indexToLetter = (col0: number) => {
    let n = col0 + 1
    let s = ''
    while (n) {
      n--
      s = String.fromCharCode(65 + (n % 26)) + s
      n = Math.floor(n / 26)
    }
    return s
  }

  const getA1Letter = (a1: string) => a1.replace(/\d+/g, '')

  const normalizeVat = (v: unknown): string | null => {
    const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '')
    if (!s) return null
    const map: Record<string, string> = {
      'НДС': 'С НДС',
      'СНДС': 'С НДС',
      'С НДС': 'С НДС',
      'БЕЗ': 'БЕЗ НДС',
      'БЕЗНДС': 'БЕЗ НДС',
      'БЕЗ НДС': 'БЕЗ НДС',
      '0': 'НДС 0',
      'НДС0': 'НДС 0',
      'НДС 0': 'НДС 0',
      'НАЛИЧНЫЕ': 'НАЛ',
      'НАЛ': 'НАЛ',
    }
    const canon = map[s] ?? s
    return (vatOptions as readonly string[]).includes(canon) ? canon : null
  }

  const isNumericLike = (val: unknown) => {
    if (val == null || val === '') return true
    if (typeof val === 'number') return Number.isFinite(val)
    if (typeof val === 'string') {
      const s = val.replace(/[\s\u00A0]/g, '').replace(',', '.')
      return /^(?:[+-]?\d+(?:\.\d+)?|\.\d+)$/.test(s) && Number.isFinite(Number(s))
    }
    return false
  }

  // --- Валидации списков ----------------------------------------------------
  // G: фирмы
  {
    const firmR = sheet?.getRange('G2:G3000')
    const firmRule = api
      .newDataValidation()
      .requireValueInList(validationStore.companies)
      .setOptions({
        showErrorMessage: true,
        error: 'Значение должно быть из списка фирм',
      })
      .build()
    firmR?.setDataValidation(firmRule)
    firmR?.setWrapStrategy(WrapStrategy.CLIP)
  }

  // I, P: VAT
  const applyOptionValidation = (a1: string) => {
    const range = sheet?.getRange(a1)
    if (!range) return
    const rule = api
      .newDataValidation()
      .requireValueInList(vatOptions as unknown as string[])
      .setOptions({
        showErrorMessage: true,
        error: 'Выберите один из вариантов',
      })
      .build()
    range.setDataValidation(rule)
    range.setHorizontalAlignment('left')
  }
  applyOptionValidation('I2:I3000')
  applyOptionValidation('P2:P3000')

  // U:X — менеджеры из справочника
  {
    const managerR = sheet?.getRange('U2:X3000')
    const managerRule = api
      .newDataValidation()
      .requireValueInList(names)
      .setOptions({
        showErrorMessage: true,
        error: 'Значение должно быть из списка менеджеров',
      })
      .build()
    managerR?.setWrapStrategy(WrapStrategy.CLIP)
    managerR?.setDataValidation(managerRule)
  }

  // --- Валидации дат --------------------------------------------------------
  const applyDateValidation = (a1: string) => {
    const range = sheet?.getRange(a1)
    if (!range) return
    const rule = api
      .newDataValidation()
      .requireDateBetween(new Date('1900-01-01'), new Date('2100-01-01'))
      .setOptions({
        showErrorMessage: true,
        error: 'Введите дату в формате YYYY-MM-DD',
      })
      .build()
    range.setDataValidation(rule)
    range.setHorizontalAlignment('left')
  }
  applyDateValidation('A2:A3000')
  applyDateValidation('E2:E3000')
  applyDateValidation('L2:L3000')
  applyDateValidation('M2:M3000')
  applyDateValidation('T2:T3000')

  // --- Валидации чисел ------------------------------------------------------
  const numericRule = api
    .newDataValidation()
    .requireNumberBetween(-1e15, 1e15)
    .setOptions({
      showErrorMessage: true,
      error: 'В этой колонке должно быть число',
      errorStyle: api.Enum.DataValidationErrorStyle.STOP,
    })
    .build()

  sheet.getRange('J2:J3000')?.setDataValidation(numericRule)
  sheet.getRange('Q2:Q3000')?.setDataValidation(numericRule)
  sheet.getRange('R2:R3000')?.setDataValidation(numericRule)
  sheet.getRange('Y2:Y3000')?.setDataValidation(numericRule)

  // --- Локальный обработчик SheetEditEnded для этого листа ------------------
  // Цель: отреагировать на изменения в «дропдаунах» (и вообще ввод) в колонках G/I/P/U/V/W/X.
  // Маппинг действий:
  //   G -> писать то же значение в H (колонка index 7)
  //   I -> нормализовать VAT -> писать в J (index 9)
  //   P -> нормализовать VAT -> писать в Q (index 16)
  //   U -> писать в V (index 21)
  //   V -> писать в W (index 22)
  //   W -> писать в X (index 23)
  //   X -> писать в Y (index 24)
  const watchedLetters = new Set(['G', 'I', 'P', 'U', 'V', 'W', 'X'])
  const targetByLetter: Record<string, number> = {
    G: 7,  // H
    I: 9,  // J
    P: 16, // Q
    U: 21, // V
    V: 22, // W
    W: 23, // X
    X: 24, // Y
  }

  // Для числовых колонок локально подтверждаем «только числа» (мягкий UX с undo)
  const numericLetters = new Set(['J', 'Q', 'R', 'Y'])

  let internalWrite = false
  const offEditEnded = api.addEvent(api.Event.SheetEditEnded, async (params: any) => {
    try {
      const { worksheet, row, column, isConfirm } = params
      if (!isConfirm) return
      if (worksheet.getSheetId() !== sheet.getSheetId()) return

      // 0-based row/column. Пропускаем шапку.
      if (row <= 0) return

      const a1 = worksheet.getRange(row, column).getA1Notation()
      const letter = getA1Letter(a1)

      // 1) Числовые поля — если не число, откатываем и подсказка
      if (numericLetters.has(letter)) {
        const raw = worksheet.getRange(row, column).getRawValue()
        if (!isNumericLike(raw) && !internalWrite) {
          try {
            await api.undo()
          } finally {
            toast.add({
              title: 'Только числа',
              description: `Колонка ${letter} принимает только числовые значения`,
              color: 'warning',
              icon: 'i-lucide-alert-triangle',
            })
          }
          return
        }
      }

      // 2) «Дропдауны»: обрабатываем только наблюдаемые колонки
      if (!watchedLetters.has(letter)) return

      const srcRange = worksheet.getRange(row, column)
      const rawValue =
        typeof srcRange.getRawValue === 'function'
          ? srcRange.getRawValue()
          : typeof srcRange.getValue === 'function'
            ? srcRange.getValue()
            : undefined

      let nextValue: any = rawValue
      if (letter === 'I' || letter === 'P') {
        const nv = normalizeVat(rawValue)
        if (!nv) {
          // Некорректный ввод — не трогаем целевую, просто выходим
          return
        }
        nextValue = nv
      } else if (letter === 'G' || letter === 'U' || letter === 'V' || letter === 'W' || letter === 'X') {
        // Просто строка (если null/undefined -> пустая строка)
        nextValue = String(rawValue ?? '')
      }

      const targetCol = targetByLetter[letter]
      if (typeof targetCol !== 'number') return

      internalWrite = true
      try {
        worksheet.getRange(row, targetCol).setValue(nextValue)
      } finally {
        internalWrite = false
      }
    } catch (e) {
      console.error('[validation] SheetEditEnded handler failed:', e)
    }
  })

  // Вернём disposer на случай, если вызывающая сторона захочет очистить слушатель.
  return () => {
    try { (offEditEnded as any)?.dispose?.() } catch {}
  }
}
