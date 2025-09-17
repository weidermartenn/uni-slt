import type { IMenuButtonItem } from "@univerjs/ui"
import { MenuItemType } from "@univerjs/ui"
import { SingleButtonOperation } from "../commands/operations/single-button.operations"

export function CustomMenuItemSingleButtonFactory(): IMenuButtonItem<string> {
    return {
        id: SingleButtonOperation.id,
        type: MenuItemType.BUTTON,
        tooltip: 'customMenu.singleButton',
        title: 'customMenu.button'
    }
}