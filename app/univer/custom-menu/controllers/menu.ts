import type { IMenuButtonItem } from "@univerjs/ui"
import { MenuItemType } from "@univerjs/ui"
import { SingleButtonOperation, BidButtonOperation, AgreementButtonOperation } from "../commands/operations/single-button.operations"

export function CustomMenuItemSingleButtonFactory(): IMenuButtonItem<string> {
    return {
        id: SingleButtonOperation.id,
        type: MenuItemType.BUTTON,
        tooltip: 'customMenu.singleButton',
        title: 'customMenu.button'
    }
}

export function BidButtonMenuItemFactory(): IMenuButtonItem<string> {
    return {
        id: BidButtonOperation.id,
        type: MenuItemType.BUTTON,
        title: 'bidButton.button'
    }
}

export function AgreementButtonMenuItemFactory(): IMenuButtonItem<string> {
    return {
        id: AgreementButtonOperation.id,
        type: MenuItemType.BUTTON,
        title: 'agreementButton.button'
    }
}