import { defineStore } from "pinia";
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

export const useEmployeeStore = defineStore("employee", {
  state: () => ({
    employees: [],
  }),

  actions: {
    async fetchEmployees() {
        const data = await $fetch(`${sltApiBase}/employee/nameList`, { headers: authHeaders() });

        // @ts-ignore
        this.employees = data?.object || []
    }
  }
});