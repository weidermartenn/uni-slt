import { defineStore } from "pinia";
import { getUser } from "~/helpers/getUser";
import type { User } from "~/entities/User/types";
import type { UserDto } from "~/entities/UserDto/types";

const { public: { kingsApiBase } } = useRuntimeConfig();
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
    listForLK: [] as any[],
    listForLKById: [] as any[]
  }),

  actions: {
    async fetchEmployees() {
        const data = await $fetch(`${kingsApiBase}/employee/nameList`, { headers: authHeaders() });

        // @ts-ignore
        this.employees = data?.object || []
    },

    async fetchAllEmployeeInfos() {
      const data = await $fetch(`${kingsApiBase}/admin/employees`, { headers: authHeaders() });

      // @ts-ignore
      this.employeesAllInfo = data?.object || {}
    },

    async deleteEmployee(id: number) {
      await $fetch(`${kingsApiBase}/admin/employees/${id}`, { method: "DELETE", headers: authHeaders() });
      this.employeesAllInfo = this.employeesAllInfo.filter(u => u.id !== id);
    },

    async fetchForLK() {
      const userInfo = getUser();
      const id = userInfo?.id
      const data = await $fetch(`${kingsApiBase}/user/${id}`, { method: 'GET', headers: authHeaders() })
      this.listForLK = data
    },

    async fetchForLKById(id: number) {
      const data = await $fetch(`${kingsApiBase}/user/${id}`, { method: 'GET', headers: authHeaders() })
      this.listForLKById = data
    },

    async addEmployee(dto: User) {
      try {
        await $fetch(`${kingsApiBase}/admin/employees`, {
          method: 'POST',
          headers: authHeaders(),
          body: dto
        })

        if (typeof this.fetchAllEmployeeInfos === 'function') {
          await this.fetchAllEmployeeInfos()
        }
      } catch (e) {
        throw e
      }
    },

    async editEmployeeInfo(dto: UserDto) {
      await $fetch(`${kingsApiBase}/admin/employees`, { method: "PATCH", headers: authHeaders(), body: dto });
    }
  }
});