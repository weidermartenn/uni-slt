import type { FUniver } from "@univerjs/presets";
import { useValidationStore } from "~/stores/validation-store";

export async function addDataValidation(api: FUniver) {
    const wb = api.getActiveWorkbook(); 
    const ws = wb?.getActiveSheet();

    const validationStore = useValidationStore()
    await validationStore.fetchCompaniesNames()

    const firmR = ws?.getRange('G2:G1000');
    const firmRule = api.newDataValidation() 
        .requireValueInList(validationStore.companies)
        .setOptions({
            showErrorMessage: true,
            error: 'Значение должно быть из списка',
        })
        .build();

    firmR?.setDataValidation(firmRule);

    const managerR = ws?.getRange('U2:X1000');
    const managerRule = api.newDataValidation() 
        .requireValueInList(['asdasd'])
        .setOptions({
            showErrorMessage: true,
            error: 'Значение должно быть из списка',
        })
        .build();

    managerR?.setDataValidation(managerRule);
}