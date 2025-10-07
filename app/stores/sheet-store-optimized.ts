// stores/sheet-store-optimized.ts
import { defineStore } from "pinia";
import { getUser } from "~/helpers/getUser";

export const useSheetStore = defineStore("sheet", {
  state: () => ({
    records: {} as Record<string, any[]>,
    loading: false,
    error: null as string | null,
    worker: null as Worker | null,
    pendingTasks: new Map<string, { resolve: Function; reject: Function }>()
  }),

  actions: {
    async initWorker() {
      if (typeof window === 'undefined') return
        
      this.worker = new Worker('/workers/api-worker.js')
      
      const config = useRuntimeConfig()
      const user = getUser()
      
      this.worker.postMessage({
        type: 'init',
        payload: {
          apiBase: config.public.kingsApiBase,
          token: user?.token
        }
      })

      this.worker.onmessage = (e) => {
        const { type, taskId, result, error } = e.data
        
        const pending = this.pendingTasks.get(taskId)
        if (!pending) return

        if (type === 'success') {
          pending.resolve(result)
        } else {
          pending.reject(new Error(error))
        }
        
        this.pendingTasks.delete(taskId)
      }
    },

    async executeWorkerTask(type: 'create' | 'update' | 'delete', payload: any) {
      if (!this.worker) await this.initWorker()

      const taskId = `${type}_${Date.now()}_${Math.random()}`
      
      return new Promise((resolve, reject) => {
        this.pendingTasks.set(taskId, { resolve, reject })
        
        this.worker!.postMessage({
          type: 'task',
          payload: {
            type,
            taskId,
            payload
          }
        })
      })
    },

    async addRecords(dtos: any[]) {
      return this.executeWorkerTask('create', dtos)
    },

    async updateRecords(dtos: any[]) {
      return this.executeWorkerTask('update', dtos)
    },

    async deleteRecords(ids: number[]) {
      return this.executeWorkerTask('delete', ids)
    },

    updateToken(token: string) {
      if (this.worker) {
        this.worker.postMessage({
          type: 'updateToken',
          payload: { token }
        })
      }
    }
  }
})