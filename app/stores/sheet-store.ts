import { defineStore } from 'pinia'
import type { TransportAccounting } from '~/entities/TransportAccountingDto/types';
import type { TransportAccountingSR } from '~/entities/TransportAccountingSaveRequestDto/types';
import type { TransportAccountingUpdate } from '~/entities/TransportAccountingUpdateDto/types';

interface SocketEvent {
    type: 'status_create' | 'status_update' | 'status_delete';
    userId: number;
    listToDel?: string | null;
    transportAccountingDto?: TransportAccounting[];
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
            if (!Array.isArray(dtos) || dtos.length === 0) return 
            await $fetch('/api/worktable/record-add', {
                method: 'POST',
                body: dtos
            })
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

            const dto = msg.transportAccountingDto?.[0]
            if (msg.type === 'status_create' && msg.transportAccountingDto?.length) {
                const index = this.records[listName]?.findIndex(r => r.id === dto?.id)
                if (index) return
                // @ts-ignore
                const obj = msg.transportAccountingDto?.object ?? msg.transportAccountingDto?.body?.object ?? {};
                this.records[listName] = this.records[listName]!.concat(obj[listName])
                console.log(`[socket] добавлена запись, id = `, dto?.id)
            }
        }
    }
}) 