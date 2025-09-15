import { defineStore } from "pinia";

export const useEmployeeStore = defineStore("employee", {
  state: () => ({
    employees: [],
  }),

  actions: {
    async fetchEmployees() {
        const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
        const data = await $fetch('/api/employee/names', { headers })

        // @ts-ignore
        this.employees = data?.object || []
    }
  }
});