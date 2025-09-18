import type { IAccessor, ICommand } from "@univerjs/core";
import { CommandType } from '@univerjs/core'
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