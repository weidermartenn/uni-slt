import type { IMenuButtonItem } from '@univerjs/ui'
import { MenuItemType } from '@univerjs/ui'
import { Observable } from 'rxjs'
import {
  SingleButtonOperation,
  BidButtonOperation,
  AgreementButtonOperation,
  UpdateHistoryButtonOperation,
} from '../commands/operations/single-button.operations'
import { useUniverStore } from '~/stores/univer-store'

function readActiveCell() {
  const api = useUniverStore().getUniver()
  const wb  = api?.getActiveWorkbook?.()
  const sh  = wb?.getActiveSheet?.()
  const sel = sh?.getSelection?.()?.getActiveRange?.()
  const rg  = sel?.getRange?.()
  const row0 = typeof rg?.startRow === 'number' ? rg.startRow : -1  // 0-based
  const col0 = typeof rg?.startColumn === 'number' ? rg.startColumn : -1
  return { row0, col0 }
}

/**
 * Делает 'живой' hidden$ для пунктов меню на основе колонок.
 * cols — массив 0-based колонок, где пункт должен быть видим.
 */
function hiddenForColumns$(cols: number[]): Observable<boolean> {
  return new Observable<boolean>((subscriber) => {
    const api = useUniverStore().getUniver()
    if (!api) { subscriber.next(true); subscriber.complete(); return }

    const compute = () => {
      const { row0, col0 } = readActiveCell()
      const visible = row0 > 0 && cols.includes(col0)
      subscriber.next(!visible) // hidden = !visible
    }

    // 1) сразу отдать текущее состояние
    compute()

    // 2) слушать смену выделения и обновлять состояние
    const disposer = api.addEvent(api.Event.SelectionChanged, () => compute())

    // 3) отписка
    return () => {
      try { (disposer as any)?.dispose?.() } catch {}
    }
  })
}

export function CustomMenuItemSingleButtonFactory(): IMenuButtonItem<string> {
  return {
    id: SingleButtonOperation.id,
    type: MenuItemType.BUTTON,
    tooltip: 'customMenu.singleButton',
    title: 'customMenu.button',
  }
}

// Видим только в колонке 7 (0-based) — например, Client
export function BidButtonMenuItemFactory(): IMenuButtonItem<string> {
  return {
    id: BidButtonOperation.id,
    type: MenuItemType.BUTTON,
    icon: 'BidButtonIcon',
    title: 'bidButton.button',
    hidden$: hiddenForColumns$([7, 13]),
  }
}

// Видим только в колонке 13 (0-based) — например, Contractor
export function AgreementButtonMenuItemFactory(): IMenuButtonItem<string> {
  return {
    id: AgreementButtonOperation.id,
    type: MenuItemType.BUTTON,
    icon: 'AgreementButtonIcon',
    title: 'agreementButton.button',
    hidden$: hiddenForColumns$([7, 13]),
  }
}

export function UpdateHistoryMenuItemFactory(): IMenuButtonItem<string> {
  return {
    id: UpdateHistoryButtonOperation.id,
    type: MenuItemType.BUTTON,
    icon: 'UpdateHistoryButtonIcon',
    title: 'updateHistoryButton.button',
  }
}
