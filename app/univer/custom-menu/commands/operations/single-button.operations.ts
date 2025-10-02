import type { IAccessor, ICommand } from "@univerjs/core";
import { CommandType, IUniverInstanceService } from '@univerjs/core'
import { getUser } from "~/helpers/getUser";
import { useUniverStore } from "~/stores/univer-store";
export const SingleButtonOperation: ICommand = {
    id: 'custom-menu.operation.single-button',
    type: CommandType.OPERATION,
    handler: async (accessor: IAccessor) => {
        console.log('Single new button operation');
        return true;
    }
}

export const BidButtonOperation: ICommand = {
    id: 'custom-menu.operation.bid-button',
    type: CommandType.OPERATION,
    handler: async (accessor: IAccessor) => {
        console.log('Bid new button operation');
        return true;
    }
}

export const AgreementButtonOperation: ICommand = {
    id: 'custom-menu.operation.agreement-button',
    type: CommandType.OPERATION,
    handler: async (accessor: IAccessor) => {
        console.log('Agreement new button operation');
        return true;
    }
}

export const UpdateHistoryButtonOperation: ICommand = {
    id: 'custom-menu.operation.update-history-button',
    type: CommandType.OPERATION,
    handler: async (accessor: IAccessor) => {
        const uniStore = useUniverStore()
        const api = uniStore.getUniver()

        const selection = api?.getActiveWorkbook()?.getActiveSheet().getSelection()?.getActiveRange()
        const a1 = selection?.getA1Notation()
        const range = selection?.getRange()
        const startRow = range ? range.startRow : 1
        const startColumn = range ? range.startColumn : 1
        const fullRange = api?.getActiveWorkbook()?.getActiveSheet().getRange(startRow, 27)

        const response = await $fetch(`${kingsApiBase}/workTable/transportAccounting/${fullRange?.getValue()}/${columnNames[startColumn]}`, { headers: authHeaders() })
        console.log(response)
        const items = (response as any)?.object ?? []
        uniStore.setCellHistory(items, {
            a1: a1 ?? ''
        })

        api?.openSidebar({
            header: { title: 'История изменений'},
            children: { label: 'CellHistorySidebar' },
            width: 450,
            onClose: () => { 
                
            }
        })
        return true
    }
}

const { public: { kingsApiBase } } = useRuntimeConfig();
function authHeaders(extra?: HeadersInit): HeadersInit {
  const u = getUser?.();
  const token = u?.token
  const base: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (token) (base as Record<string, string>).Authorization = `Bearer ${token}`

  return { ...base, ...(extra || {}) }
}

const columnNames: Record<number, string> = {
    0: 'DateOfPickup',
    1: 'NumberOfContainer',
    2: 'Cargo',
    3: 'TypeOfContainer',
    4: 'DateOfSubmission',
    5: 'AddressOfDelivery',
    6: 'OurFirm',
    7: 'Client',
    8: 'FormPayAs',
    9: 'Summa',
    10: 'NumberOfBill',
    11: 'DateOfBill',
    12: 'DatePayment',
    13: 'Contractor',
    14: 'Driver',
    15: 'FormPayHim',
    16: 'ContractorRate',
    17: 'SumIssued',
    18: 'NumberOfBillAdd',
    19: 'DateOfPaymentContractor',
    20: 'Manager',
    21: 'DepartmentHead',
    22: 'ClientLead',
    23: 'SalesManager',
    24: 'AdditionalExpenses',
    25: 'Income',
    26: 'IncomeLearned',
}