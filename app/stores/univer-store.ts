import { defineStore } from "pinia";
import type { FUniver } from "@univerjs/core/facade";
import { get } from "@nuxt/ui/runtime/utils/index.js";

export const useUniverStore = defineStore("univer", {
    state: () => ({
        univerAPI: null as FUniver | null,
    }),

    actions: {
        setUniver(api: FUniver) {
            this.univerAPI = api;
        },

        getUniver() {
            return this.univerAPI;
        },
    }
});