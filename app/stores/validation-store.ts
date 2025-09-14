import { defineStore } from "pinia"

export const useValidationStore = defineStore('validation', {
    state: () =>({
        companies: [] as string[],
        employees: {} as any,
        loading: false,
        error: "" as string | null
    }),

    actions: {
        async fetchCompaniesNames() {
            this.loading = true
            this.error = ""
            try {
                const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined
                const data = await $fetch('/api/company/names', { headers })
                // @ts-ignore
                const names = data.object as string[] 
                this.companies = names
            } catch (e: any) {
                this.error = e.message 
                throw e
            } finally {
                this.loading = false;
            }
        }
    }
})