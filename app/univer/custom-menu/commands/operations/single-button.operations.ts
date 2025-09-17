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