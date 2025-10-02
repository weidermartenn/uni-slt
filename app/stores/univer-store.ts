import { defineStore } from "pinia";
import type { FUniver } from "@univerjs/core/facade";
import { get, set } from "@nuxt/ui/runtime/utils/index.js";

export const useUniverStore = defineStore("univer", {
    state: () => ({
        univerAPI: null as FUniver | null,
        cellHistoryList: [] as Array<any>,
        cellHistoryMeta: null as null | { 
            a1: string;
        },
        batchProgress: true,
        suppressLevel: 0,
        uiReady: false,
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
        },

        setBatchProgress(data: boolean) {
            this.batchProgress = data
        },

        getBatchProgress() {
            return this.batchProgress
        },
        
        beginQuiet() { this.suppressLevel++ },
        endQuiet() { this.suppressLevel = Math.max(0, this.suppressLevel - 1) },
        isQuiet() { return this.suppressLevel > 0 || this.batchProgress },
        setUiReady(v: boolean) { this.uiReady = v },
    }
});