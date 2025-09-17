import type { Dependency } from "@univerjs/core";
import { Injector, Plugin, touchDependencies, UniverInstanceType } from '@univerjs/core';
import { Inject } from "@wendellhu/redi";
import { CustomMenuController } from "./controllers/custom-menu.controller"
import { LocaleService } from "@univerjs/core";
import ruRU from "./locale/ru-RU";
const SHEET_CUSTOM_MENU_PLUGIN = 'SHEET_CUSTOM_MENU_PLUGIN'

export class UniverSheetsCustomMenuPlugin extends Plugin {
    static override type = UniverInstanceType.UNIVER_SHEET
    static override pluginName = SHEET_CUSTOM_MENU_PLUGIN

    constructor(
        @Inject(Injector) protected readonly _injector: Injector,
        @Inject(LocaleService) private readonly _localeService: LocaleService
    ) {
        super()

        this._localeService.load({
            ruRU
        })
    }

    override onStarting(): void {
        ([
            [CustomMenuController],
        ] as Dependency[]).forEach(d => this._injector.add(d))
    }

    override onRendered(): void {
        touchDependencies(this._injector, [
            [CustomMenuController],
        ])
    }
}