import { Disposable, ICommandService, Injector } from "@univerjs/presets";
import { Inject } from "@wendellhu/redi";
import { ComponentManager, IMenuManagerService } from "@univerjs/ui";
import { BidButtonOperation, AgreementButtonOperation, SingleButtonOperation } from "../commands/operations/single-button.operations";
import { ContextMenuGroup, ContextMenuPosition } from "@univerjs/ui";
import { CustomMenuItemSingleButtonFactory, BidButtonMenuItemFactory, AgreementButtonMenuItemFactory } from "./menu";

export class CustomMenuController extends Disposable {
    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @ICommandService private readonly _commandService: ICommandService,
        @IMenuManagerService private readonly _menuManagerService: IMenuManagerService,
        @Inject(ComponentManager) private readonly _componentManager: ComponentManager,
    ) {
        super() 

        this._initCommands()
        this._registerComponents()
        this._initMenus()
    }

    private _initCommands(): void { 
        [
            SingleButtonOperation,
        ].forEach((c) => {
            this.disposeWithMe(this._commandService.registerCommand(c))
        })
    }

    private _registerComponents(): void { 

    }

    private _initMenus(): void {
        this._menuManagerService.mergeMenu({
            [ContextMenuPosition.MAIN_AREA]: {
                [ContextMenuGroup.OTHERS]: {
                    [BidButtonOperation.id]: {
                        order: 12,
                        menuItemFactory: BidButtonMenuItemFactory
                    },
                    [AgreementButtonOperation.id]: {
                        order: 13,
                        menuItemFactory: AgreementButtonMenuItemFactory
                    },
                }
            }
        })
    }
}