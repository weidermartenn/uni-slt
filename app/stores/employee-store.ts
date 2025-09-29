import { defineStore } from "pinia";
import { getUser } from "~/helpers/getUser";
import type { User } from "~/entities/User/types";

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
    employeesAllInfo: [] as User[],
  }),

  actions: {
    async fetchEmployees() {
        const data = await $fetch(`${sltApiBase}/employee/nameList`, { headers: authHeaders() });

        // @ts-ignore
        this.employees = data?.object || []
    },

    async fetchAllEmployeeInfos() {
      const data = await $fetch(`${sltApiBase}/admin/employees`, { headers: authHeaders() });

      // @ts-ignore
      this.employeesAllInfo = data?.object || {}
    },

    async deleteEmployee(id: number) {
      await $fetch(`${sltApiBase}/admin/employees/${id}`, { method: "DELETE", headers: authHeaders() });
      this.employeesAllInfo = this.employeesAllInfo.filter(u => u.id !== id);
    }
  }
});