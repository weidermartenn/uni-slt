import type { IAccessor, ICommand } from "@univerjs/core";
import { CommandType, IUniverInstanceService } from '@univerjs/core'
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
        const range = api?.getActiveWorkbook()?.getActiveSheet().getSelection()?.getActiveRange()?.getRange()
        const startRow = range ? range.startRow : 1
        const fullRange = api?.getActiveWorkbook()?.getActiveSheet().getRange(startRow, 27)
        console.log(fullRange?.getValues())
        return true
    }
}