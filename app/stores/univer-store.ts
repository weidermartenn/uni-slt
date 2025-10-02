import { defineStore } from "pinia";
import type { FUniver } from "@univerjs/core/facade";
import { get } from "@nuxt/ui/runtime/utils/index.js";

export const useUniverStore = defineStore("univer", {
    state: () => ({
        univerAPI: null as FUniver | null,
        cellHistoryList: [] as Array<any>,
        cellHistoryMeta: null as null | { 
            a1: string;
        }
    }),

    actions: {
        setUniver(api: FUniver) {
            this.univerAPI = api;
        },

        getUniver() {
            return this.univerAPI;
        },

        setCellHistory(data: any[], meta: {
            a1: string;
        }) {
            this.cellHistoryList = data || []
            this.cellHistoryMeta = meta
        }
    }
});