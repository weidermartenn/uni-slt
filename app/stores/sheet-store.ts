import { defineStore } from 'pinia'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types';
import type { TransportAccountingSR } from '~/entities/TransportAccountingSaveRequestDto/types';
import type { TransportAccountingUpdate } from '~/entities/TransportAccountingUpdateDto/types';

interface SocketEvent {
    type: 'status_create' | 'status_update' | 'status_delete';
    userId: number;
    listToDel?: string | null;
    transportAccountingDto?: TransportAccounting[] | any;
}

export const useSheetStore = defineStore('sheet', {
    state: () => ({
        records: {} as Record<string, TransportAccounting[]>,
        loading: false,
        error: '' as string | null,
        socketHandlers: [] as Array<(event: SocketEvent) => void>,
    }),

    getters: {
        periods: (state) => Object.keys(state.records),
        entries: (state) => Object.entries(state.records),
    },

    actions: {
        async fetchRecords() {
            this.loading = true 
            this.error = ''
            try {
                const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
                const me = await $fetch('/api/auth/me', { headers })

                let path = ''
                if (me?.roleCode === 'ROLE_ADMIN' || me?.roleCode === 'ROLE_BUH') {
                    path = '/api/worktable/admin-worktable-records'
                } else {
                    path = '/api/worktable/user-worktable-records'
                }

                const data = await $fetch<TransportAccounting[]>(path, { headers })

                // @ts-ignore
                const obj = data?.object ?? data?.body?.object ?? {};
                this.records = { ...obj }
            } catch (e) {
                console.error(e)
            } finally {
                this.loading = false
            }
        },

        async addRecords(dtos: TransportAccountingSR[]) {
            if (!Array.isArray(dtos) || dtos.length === 0) return null
            const res = await $fetch('/api/worktable/record-add', {
                method: 'POST',
                body: dtos
            })
            console.log('[server] ответ сервера', res)
            return res
        },

        async updateRecords(dtos: TransportAccountingUpdate[]) {
            if (!Array.isArray(dtos) || dtos.length === 0) return 
            await $fetch('/api/worktable/record-update', {
                method: 'PATCH',
                body: dtos
            })
        },

        async deleteRecords(listToDelete: number[]) {
            if (!Array.isArray(listToDelete) || listToDelete.length === 0) return 
            await $fetch('/api/worktable/record-delete', {
                method: 'DELETE',
                body: listToDelete
            })
        },

        applySocketMessage(msg: SocketEvent, listName: string) {
            this.socketHandlers.forEach(handler => handler(msg))

            const dto = (msg as any).transportAccountingDto?.[0]

            // normalize payload shape
            const byList: Record<string, TransportAccounting[]> =
                (msg as any).transportAccountingDto?.object ??
                (msg as any).transportAccountingDto?.body?.object ??
                (msg as any).transportAccountingDTO?.object ??  // Добавлена обработка DTO
                (msg as any).transportAccountingDTO?.body?.object ??
                (msg as any).object ??
                (msg as any).body?.object ??
                {};

            let dtoArray = (msg as any).transportAccountingDto ?? (msg as any).transportAccountingDTO;
            if (Array.isArray(dtoArray) && dtoArray.length > 0 && Object.keys(byList).length === 0) {
                // Если byList пуст, но есть массив записей, группируем их по listName
                const grouped = dtoArray.reduce((acc, item) => {
                    const list = item.listName;
                    if (list) {
                        if (!acc[list]) acc[list] = [];
                        acc[list].push(item);
                    }
                    return acc;
                }, {} as Record<string, TransportAccounting[]>);
                Object.assign(byList, grouped);
            }

            console.log('[socket] incoming:', {
              type: msg.type,
              listNameHint: listName,
              byListKeys: Object.keys(byList || {}),
              dto,
            })

            // determine actual target list from payload
            const firstKey = Object.keys(byList || {})[0]
            const targetList = (dto && (dto as any).listName) || firstKey || listName

            if (!targetList) {
              console.warn('[socket] target list is unknown, skip message')
              return
            }

            if (msg.type === 'status_create' && (((msg as any).transportAccountingDto?.length ?? 0) > 0 || (byList[targetList]?.length ?? 0) > 0)) {
                const created = byList[targetList] ?? ((msg as any).transportAccountingDto as TransportAccounting[]);
                if (!created || !created.length) { console.log('[socket] create: empty payload, skip'); return }
                const first = created[0]
                const existsIndex = this.records[targetList]?.findIndex(r => r.id === first?.id) ?? -1
                if (existsIndex >= 0) { console.log('[socket] create: already exists, skip', { targetList, id: first?.id }); return }
                this.records[targetList] = (this.records[targetList] || []).concat(created)
                console.log(`[socket] добавлена запись`, { targetList, id: first?.id, count: created.length })
                return
            } 

            if (msg.type === 'status_update' && ((msg as any).transportAccountingDto?.length ?? 0) > 0) {
                const dto = (msg as any).transportAccountingDto[0]

                // if target list wasn't found, try find by current records map
                let tl = targetList
                if (!tl && dto?.id) {
                  tl = Object.keys(this.records).find(k => this.records[k]?.some(r => r.id === dto.id)) as string
                }
                if (!tl) { console.log('[socket] update: target list unresolved, skip', { id: dto?.id }); return }

                const index = this.records[tl]?.findIndex(r => r.id === dto?.id) ?? -1
                if (index >= 0) {
                    this.records[tl]![index] = dto
                    console.log(`[socket] обновлена запись`, { targetList: tl, id: dto?.id })
                } else {
                    // if record not found locally, append it to keep clients in sync
                    this.records[tl] = (this.records[tl] || []).concat([dto])
                    console.log('[socket] update: record not found locally, appended', { targetList: tl, id: dto?.id })
                }
                return
            }
        }
    }
}) 