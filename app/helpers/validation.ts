import { useToast } from "#imports";
import { WrapStrategy } from "@univerjs/core";
import type { FUniver } from "@univerjs/core/facade";
import type { FWorksheet } from "@univerjs/presets/lib/types/preset-sheets-core/index.js";
import { useEmployeeStore } from "~/stores/employee-store";
import { useValidationStore } from "~/stores/validation-store";
import { registerDropdownValueChanged } from "./univer-events";

export async function addDataValidation(api: FUniver, sheet: FWorksheet) {
    const toast = useToast()

    const validationStore = useValidationStore()
    const employeeStore = useEmployeeStore()

    await validationStore.fetchCompaniesNames()
    await employeeStore.fetchEmployees()

    const vatOptions = ['С НДС', 'БЕЗ НДС', 'НДС 0', 'НАЛ']

    const firmR = sheet?.getRange('G2:G3000');
    const firmRule = api.newDataValidation() 
        .requireValueInList(validationStore.companies)
        .setOptions({
            showErrorMessage: true,
            error: 'Значение должно быть из списка фирм',
        })
        .build();

    firmR?.setDataValidation(firmRule);
    firmR?.setWrapStrategy(WrapStrategy.CLIP)

    // Date validation and display format for A, E, L, T columns
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

    const applyOptionValidation = (a1: string) => {
        const range = sheet?.getRange(a1)
        if (!range) return 
        const rule = api.newDataValidation() 
            .requireValueInList(vatOptions)
            .setOptions({
                showErrorMessage: true,
                error: 'Выберите один из вариантов',
            })
            .build();
        range.setDataValidation(rule);
        range.setHorizontalAlignment('left')
    }

    applyOptionValidation('I2:I3000')
    applyOptionValidation('P2:P3000')

    const managerR = sheet?.getRange('U2:X3000');

    const names = computed(() => {
        return employeeStore.employees
            .filter(e => e != null) // Filter out null/undefined values
            .map((e: string) => {
                const parts = e.split(' ');
                if (parts.length === 3) {
                    return `${parts[0]} ${parts[1]}`;
                }
                return e;
            });
    });

    const managerRule = api.newDataValidation() 
        .requireValueInList(names.value)
        .setOptions({
            showErrorMessage: true,
            error: 'Значение должно быть из списка менеджеров',
        })
        .build();

    managerR?.setDataValidation(managerRule);

    const numericRule = api.newDataValidation()
        .requireNumberBetween(-1e15, 1e15)
        .setOptions({
            showErrorMessage: true,
            error: 'В этой колонке должно быть число',
            errorStyle: api.Enum.DataValidationErrorStyle.STOP
        })
        .build()
    
    sheet.getRange('J2:J3000')?.setDataValidation(numericRule)
    sheet.getRange('Q2:Q3000')?.setDataValidation(numericRule)
    sheet.getRange('R2:R3000')?.setDataValidation(numericRule)
    sheet.getRange('Y2:Y3000')?.setDataValidation(numericRule)

    const numericLetters = new Set(['J', 'Q', 'R', 'Y'])

    const isNumericLike = (val: unknown) => {
        if (val == null || val === '') return true 
        if (typeof val === 'number') return Number.isFinite(val)
        if (typeof val === 'string') {
            const s = val.replace(/[\s\u00A0]/g, '').replace(',', '.')
            return /^(?:[+-]?\d+(?:\.\d+)?|\.\d+)$/.test(s) && Number.isFinite(Number(s))
        }
        return false
    }

    let undoing = false;
    api.addEvent(api.Event.SheetEditEnded, (params) => {
        const { worksheet, row, column, isConfirm } = params
        if (!isConfirm) return 
        if (worksheet.getSheetId() !== sheet.getSheetId()) return 

        const a1 = worksheet.getRange(row, column).getA1Notation()
        const colLetter = a1.replace(/\d+/g, '')

        if (!numericLetters.has(colLetter)) return 

        const raw = worksheet.getRange(row, column).getRawValue()
        if (!isNumericLike(raw) && !undoing) {
            undoing = true 
            try {
                api.undo()
            } finally {
                undoing = false
            }
            toast.add({
                title: 'Только числа',
                description: `Колонка ${colLetter} принимает только числовые значения`,
                color: 'warning',
                icon: 'i-lucide-alert-triangle'
            })
        }
    })

    const normalizeVat = (v: unknown): string | null => {
        const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
        if (!s) return null 
        const map: Record<string, string> = {
            'НДС': 'С НДС',
            'С НДС': 'С НДС',
            'БЕЗ': 'БЕЗ НДС',
            'БЕЗ НДС': 'БЕЗ НДС',
            '0': 'НДС 0',
            'НДС 0': 'НДС 0',
            'НАЛИЧНЫЕ': 'НАЛ',
            'НАЛ': 'НАЛ'
        }
        const canon = map[s] ?? s
        return vatOptions.includes(canon) ? canon : null
    }

    registerDropdownValueChanged(api, sheet, {
        G: ({ row, value }, apply) => {
            apply([{ row, column: 7, value: String(value ?? '') }])
        },
        I: ({ row, value }, apply) => {
            const v = normalizeVat(value);
            if (v) apply([{ row, column: 9, value: v }])
        },
        P: ({ row, value }, apply) => {
            const v = normalizeVat(value)
            if (v) apply([{ row, column: 16, value: v }])
        },
        U: ({ row, value }, apply) => apply([{ row, column: 21, value: String(value ?? '') }]),
        V: ({ row, value }, apply) => apply([{ row, column: 22, value: String(value ?? '') }]),
        W: ({ row, value }, apply) => apply([{ row, column: 23, value: String(value ?? '') }]),
        X: ({ row, value }, apply) => apply([{ row, column: 24, value: String(value ?? '') }]),
    })
}