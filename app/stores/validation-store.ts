import { defineStore } from "pinia"
import { getUser } from "~/helpers/getUser";

const { public: { sltApiBase } } = useRuntimeConfig();
function authHeaders(extra?: HeadersInit): HeadersInit {
  const u = getUser?.();
  const token = u?.token
  const base: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (token) (base as Record<string, string>).Authorization = `Bearer ${token}`

  return { ...base, ...(extra || {}) }
}

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
                const data = await $fetch(`${sltApiBase}/company/nameList`, { headers: authHeaders() });
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