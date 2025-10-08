// ~/stores/sheet-store-optimized.ts
import { defineStore } from "pinia"
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types"
import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types"
import type { TransportAccountingUpdate } from "~/entities/TransportAccountingUpdateDto/types"
import { getUser } from "~/helpers/getUser"

const { public: { kingsApiBase } } = useRuntimeConfig()

interface SocketEvent {
  type: "status_create" | "status_update" | "status_delete"
  userId: number
  listName?: string | null
  listToDel?: number[] | string | null
  transportAccountingDto?: any
  transportAccountingDTO?: any
  object?: Record<string, any[]>
  body?: { object?: Record<string, any[]> }
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const u = getUser?.()
  const token = (u as any)?.token
  const base: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }
  if (token) (base as Record<string, string>).Authorization = `Bearer ${token}`
  return { ...base, ...(extra || {}) }
}

function parseDeleteIds(msg: any): number[] {
  const ids: number[] = []

  // listToDel: number[] | "1,2,3"
  const fromList = msg?.listToDel
  if (Array.isArray(fromList)) {
    ids.push(...fromList.map(Number).filter(Number.isFinite))
  } else if (typeof fromList === 'string' && fromList.trim()) {
    fromList.split(/[,;\s]+/).forEach((s: string) => {
      const n = Number(s)
      if (Number.isFinite(n)) ids.push(n)
    })
  }

  // transportAccountingDto / DTO массивы
  const dtoArr = msg?.transportAccountingDto ?? msg?.transportAccountingDTO
  if (Array.isArray(dtoArr)) {
    for (const it of dtoArr) {
      const n = Number(it?.id)
      if (Number.isFinite(n)) ids.push(n)
    }
  }

  // object[targetList] как запасной источник
  const byList =
    msg?.transportAccountingDto?.object ??
    msg?.transportAccountingDto?.body?.object ??
    msg?.transportAccountingDTO?.object ??
    msg?.transportAccountingDTO?.body?.object ??
    msg?.object ??
    msg?.body?.object ?? {}

  const k = Object.keys(byList || {})[0]
  if (k && Array.isArray(byList[k])) {
    for (const it of byList[k]) {
      const n = Number(it?.id)
      if (Number.isFinite(n)) ids.push(n)
    }
  }

  return Array.from(new Set(ids))
}

export const useSheetStore = defineStore("sheet", {
  state: () => ({
    records: {} as Record<string, TransportAccounting[]>,
    tempIdMap: new Map<number, number>(),
    loading: false,
    error: "" as string | null,
    socketHandlers: [] as Array<(event: SocketEvent) => void>,
    // очередь "якорей" для авто-подсветки/фокуса после создания строк (0-based индексы)
    pendingCreateRows: {} as Record<string, number[]>,
  }),

  getters: {
    periods: (state) => Object.keys(state.records),
    entries: (state) => Object.entries(state.records),
  },

  actions: {
    // --- утилиты для подсветки созданных строк
    anchorCreateRow(listName: string, rowIndex0: number) {
      (this.pendingCreateRows[listName] ||= []).push(rowIndex0)
    },
    takeAnchoredCreateRow(listName: string): number | undefined {
      const q = this.pendingCreateRows[listName]
      return q && q.length ? q.shift() : undefined
    },

    // --- загрузка списков
    async fetchRecords() {
      this.loading = true
      this.error = ""
      try {
        const currentUser = getUser()
        let path = ""
        if (currentUser?.roleCode === "ROLE_ADMIN" || currentUser?.roleCode === "ROLE_BUH") {
          path = `${kingsApiBase}/workTable/transportAccounting/admin`
        } else {
          path = `${kingsApiBase}/workTable/transportAccounting/user`
        }

        const data = await $fetch<any>(path, { headers: authHeaders() })
        const obj = (data?.object ?? data?.body?.object ?? {}) as Record<string, any[]>

        const sorted: Record<string, TransportAccounting[]> = {}
        for (const [key, value] of Object.entries(obj)) {
          const arr = Array.isArray(value) ? [...value] : []
          sorted[key] = arr.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0))
        }
        this.records = sorted
      } catch (e) {
        console.error(e)
        this.error = (e as Error)?.message || "Ошибка загрузки таблицы"
      } finally {
        this.loading = false
      }
    },

    // --- CRUD
    async addRecords(dtos: TransportAccountingSR[]) {
      await $fetch(`${kingsApiBase}/workTable/transportAccounting`, {
        method: "POST",
        headers: authHeaders(),
        body: dtos,
      })
    },

    async updateRecords(dtos: TransportAccountingUpdate[]) {
      if (!Array.isArray(dtos) || dtos.length === 0) return
      await $fetch(`${kingsApiBase}/workTable/transportAccounting`, {
        method: "PATCH",
        headers: authHeaders(),
        body: dtos,
      })
    },

    async deleteRecords(listToDelete: number[]) {
      if (!Array.isArray(listToDelete) || listToDelete.length === 0) return
      await $fetch(`${kingsApiBase}/workTable/transportAccounting`, {
        method: "DELETE",
        headers: authHeaders(),
        body: listToDelete,
      })
    },

    // --- приём сообщений от сокета и синхронизация локального состояния
    applySocketMessage(msg: SocketEvent, listName: string) {
      // даём шанс внешним подписчикам
      this.socketHandlers.forEach((handler) => handler(msg))

      const dto =
        (msg as any).transportAccountingDto?.[0] ??
        (msg as any).transportAccountingDTO?.[0]

      const byList: Record<string, TransportAccounting[]> =
        (msg as any).transportAccountingDto?.object ??
        (msg as any).transportAccountingDto?.body?.object ??
        (msg as any).transportAccountingDTO?.object ??
        (msg as any).transportAccountingDTO?.body?.object ??
        (msg as any).object ??
        (msg as any).body?.object ??
        {}

      let dtoArray: TransportAccounting[] | undefined =
        (msg as any).transportAccountingDto ??
        (msg as any).transportAccountingDTO

      // если пришёл "плоский" массив без object — сгруппируем по listName
      if (Array.isArray(dtoArray) && dtoArray.length > 0 && Object.keys(byList).length === 0) {
        const grouped = dtoArray.reduce((acc, item: any) => {
          const ln = item?.listName
          if (ln) {
            if (!acc[ln]) acc[ln] = []
            acc[ln].push(item)
          }
          return acc
        }, {} as Record<string, TransportAccounting[]>)
        Object.assign(byList, grouped)
      }

      const firstKey = Object.keys(byList || {})[0]
      let targetList: string | undefined =
        (msg as any)?.listName ||
        (dto as any)?.listName ||
        firstKey ||
        listName

      console.log("[socket]", msg.type, {
        targetList,
        lists: Object.keys(byList || {}).length,
        batch: Array.isArray(dtoArray) ? dtoArray.length : 0,
      })

      if (!targetList) {
        console.warn("[socket] target list is unknown, skip message")
        return
      }

      // CREATE
      if (msg.type === "status_create") {
        const created = byList[targetList]?.length ? byList[targetList] : undefined
        if (!created || !created.length) return

        const arr = this.records[targetList] || (this.records[targetList] = [])
        for (const rec of created) {
          const id = Number((rec as any)?.id)
          if (!Number.isFinite(id)) continue
          const exists = arr.some((r: any) => Number((r as any)?.id) === id)
          if (!exists) arr.push(rec as any)
        }
        arr.sort((a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0))
        return
      }

      // UPDATE
      if (msg.type === "status_update") {
        const list = byList[targetList]
        const upd =
          Array.isArray(list) && list.length ? list[0] :
          (msg as any).transportAccountingDto?.[0] ??
          (msg as any).transportAccountingDTO?.[0]

        if (!upd) return

        if (!targetList && (upd as any)?.id) {
          targetList = Object.keys(this.records).find((k) =>
            this.records[k]?.some((r: any) => (r as any).id === (upd as any).id)
          ) as string
        }
        if (!targetList) return

        const arr = this.records[targetList] || (this.records[targetList] = [])
        const idx = arr.findIndex((r: any) => (r as any).id === (upd as any).id)
        if (idx >= 0) arr.splice(idx, 1, upd as any)
        else arr.push(upd as any)
        return
      }

      // DELETE
      if (msg.type === "status_delete") {
        const ids = parseDeleteIds(msg)
        if (!ids.length) {
          console.warn("[socket] status_delete: нет ID для удаления — пропускаю")
          return
        }

        if (!targetList) {
          targetList = Object.keys(this.records).find((k) =>
            this.records[k]?.some((r: any) => ids.includes(Number((r as any)?.id)))
          ) as string
        }
        if (!targetList) return

        const arr = this.records[targetList] || (this.records[targetList] = [])
        if (!arr.length) return

        let removed = 0
        for (let i = arr.length - 1; i >= 0; i--) {
          if (ids.includes(Number((arr[i] as any)?.id))) {
            arr.splice(i, 1)
            removed++
          }
        }
        console.log("[socket] deleted", { targetList, count: removed })
        return
      }
    },

    // подписки на «сырые» сокет-сообщения
    onSocket(handler: (e: SocketEvent) => void) {
      this.socketHandlers.push(handler)
      return () => {
        const i = this.socketHandlers.indexOf(handler)
        if (i >= 0) this.socketHandlers.splice(i, 1)
      }
    },
  },
})
