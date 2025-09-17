import { WrapStrategy, type FUniver } from "@univerjs/presets";
import { useEmployeeStore } from "~/stores/employee-store";
import { useSheetStore } from "~/stores/sheet-store";
import { useValidationStore } from "~/stores/validation-store";

export async function addDataValidation(api: FUniver) {
    const wb = api.getActiveWorkbook(); 
    const ws = wb?.getActiveSheet();

    const validationStore = useValidationStore()
    const employeeStore = useEmployeeStore()

    await validationStore.fetchCompaniesNames()
    await employeeStore.fetchEmployees()

    const options = ['С НДС', 'БЕЗ НДС']

    const firmR = ws?.getRange('G2:G1000');
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
      const range = ws?.getRange(a1)
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

    applyDateValidation('A2:A1000')
    applyDateValidation('E2:E1000')
    applyDateValidation('L2:L1000')
    applyDateValidation('M2:M1000')
    applyDateValidation('T2:T1000')

    const applyOptionValidation = (a1: string) => {
      const range = ws?.getRange(a1)
      if (!range) return 
      const rule = api.newDataValidation() 
        .requireValueInList(options)
        .setOptions({
          showErrorMessage: true,
          error: 'Выберите один из вариантов',
        })
        .build();
      range.setDataValidation(rule);
      range.setHorizontalAlignment('left')
    }

    applyOptionValidation('I2:I1000')
    applyOptionValidation('P2:P1000')

    const managerR = ws?.getRange('U2:X1000');

    const managerRule = api.newDataValidation() 
        .requireValueInList(employeeStore.employees)
        .setOptions({
            showErrorMessage: true,
            error: 'Значение должно быть из списка менеджеров',
        })
        .build();

    managerR?.setDataValidation(managerRule);
}