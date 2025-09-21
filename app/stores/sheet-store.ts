import { defineStore } from "pinia";
import type { TransportAccounting } from "~/entities/TransportAccountingDto/types";
import type { TransportAccountingSR } from "~/entities/TransportAccountingSaveRequestDto/types";
import type { TransportAccountingUpdate } from "~/entities/TransportAccountingUpdateDto/types";

interface SocketEvent {
  type: "status_create" | "status_update" | "status_delete";
  userId: number;
  listToDel?: string | null;
  transportAccountingDto?: TransportAccounting[] | any;
}

export const useSheetStore = defineStore("sheet", {
  state: () => ({
    records: {} as Record<string, TransportAccounting[]>,
    tempIdMap: new Map(),
    loading: false,
    error: "" as string | null,
    socketHandlers: [] as Array<(event: SocketEvent) => void>,
  }),

  getters: {
    periods: (state) => Object.keys(state.records),
    entries: (state) => Object.entries(state.records),
  },

  actions: {
    async fetchRecords() {
      this.loading = true;
      this.error = "";
      try {
        const headers = import.meta.server
          ? useRequestHeaders(["cookie"])
          : undefined;
        const me = await $fetch("/api/auth/me", { headers });

        let path = "";
        if (me?.roleCode === "ROLE_ADMIN" || me?.roleCode === "ROLE_BUH") {
          path = "/api/worktable/admin-worktable-records";
        } else {
          path = "/api/worktable/user-worktable-records";
        }

        const data = await $fetch<TransportAccounting[]>(path, { headers });

        // @ts-ignore
        const obj = data?.object ?? data?.body?.object ?? {};
        // sort each list by id ascending
        const sorted: Record<string, TransportAccounting[]> = {};
        for (const [key, value] of Object.entries(
          obj as Record<string, any[]>
        )) {
          const arr = Array.isArray(value) ? [...value] : [];
          sorted[key] = arr.sort(
            (a: any, b: any) => Number(a?.id ?? 0) - Number(b?.id ?? 0)
          );
        }
        this.records = sorted;
      } catch (e) {
        console.error(e);
      } finally {
        this.loading = false;
      }
    },

    async addRecords(dtos: TransportAccountingSR[]) {
      await $fetch("/api/worktable/record-add", {
        method: "POST",
        body: dtos,
      });
    },

    async updateRecords(dtos: TransportAccountingUpdate[]) {
      if (!Array.isArray(dtos) || dtos.length === 0) return;
      await $fetch("/api/worktable/record-update", {
        method: "PATCH",
        body: dtos,
      });
    },

    async deleteRecords(listToDelete: number[]) {
      if (!Array.isArray(listToDelete) || listToDelete.length === 0) return;
      await $fetch("/api/worktable/record-remove", {
        method: "DELETE",
        body: { transportAccountingIds: listToDelete },
      });
    },

    applySocketMessage(msg: SocketEvent, listName: string) {
      this.socketHandlers.forEach((handler) => handler(msg));

      const dto =
        (msg as any).transportAccountingDto?.[0] ??
        (msg as any).transportAccountingDTO?.[0];

      const byList: Record<string, TransportAccounting[]> =
        (msg as any).transportAccountingDto?.object ??
        (msg as any).transportAccountingDto?.body?.object ??
        (msg as any).transportAccountingDTO?.object ??
        (msg as any).transportAccountingDTO?.body?.object ??
        (msg as any).object ??
        (msg as any).body?.object ??
        {};

      let dtoArray: TransportAccounting[] | undefined =
        (msg as any).transportAccountingDto ??
        (msg as any).transportAccountingDTO;
      if (
        Array.isArray(dtoArray) &&
        dtoArray.length > 0 &&
        Object.keys(byList).length === 0
      ) {
        const grouped = dtoArray.reduce((acc, item: any) => {
          const list = item?.listName;
          if (list) {
            if (!acc[list]) acc[list] = [];
            acc[list].push(item);
          }
          return acc;
        }, {} as Record<string, TransportAccounting[]>);
        Object.assign(byList, grouped);
      }

      const firstKey = Object.keys(byList || {})[0];
      let targetList = (dto && (dto as any).listName) || firstKey || listName;

      // компактный лог без больших объектов
      console.log("[socket]", msg.type, {
        targetList,
        lists: Object.keys(byList || {}).length,
        batch: Array.isArray(dtoArray) ? dtoArray.length : 0,
      });

      if (!targetList) {
        console.warn("[socket] target list is unknown, skip message");
        return;
      }

      if (msg.type === "status_create") {
        const created =
          (byList[targetList] && byList[targetList].length
            ? byList[targetList]
            : undefined) ?? (Array.isArray(dtoArray) ? dtoArray : undefined);

        if (!created || !created.length) {
          return;
        }

        const arr = this.records[targetList] || (this.records[targetList] = []);
        // добавляем только те, которых нет
        for (const rec of created) {
          const id = Number((rec as any)?.id);
          if (!Number.isFinite(id)) continue;
          const existsIdx = arr.findIndex((r) => Number((r as any)?.id) === id);
          if (existsIdx < 0) arr.push(rec);
        }
        return;
      }

      if (msg.type === "status_update") {
        const list =
          (byList[targetList] && byList[targetList].length
            ? byList[targetList]
            : undefined) ?? (Array.isArray(dtoArray) ? dtoArray : undefined);
        const upd = Array.isArray(list)
          ? list[0]
          : (msg as any).transportAccountingDto?.[0] ??
            (msg as any).transportAccountingDTO?.[0];
        if (!upd) return;

        if (!targetList && (upd as any)?.id) {
          targetList = Object.keys(this.records).find((k) =>
            this.records[k]?.some((r) => r.id === (upd as any).id)
          ) as string;
        }
        if (!targetList) return;

        const arr = this.records[targetList] || (this.records[targetList] = []);
        const idx = arr.findIndex((r) => r.id === (upd as any).id);
        if (idx >= 0) arr.splice(idx, 1, upd);
        else arr.push(upd);
        return;
      }

      if (msg.type === "status_delete") {
        const ids: number[] = [];
        const listToDel = (msg as any).listToDel as number[] | undefined;
        if (Array.isArray(listToDel))
          ids.push(...listToDel.filter((n) => Number.isFinite(n)));
        if (Array.isArray(dtoArray)) {
          for (const it of dtoArray) {
            const id = Number((it as any)?.id);
            if (Number.isFinite(id)) ids.push(id);
          }
        }
        if (!ids.length) return;

        if (!targetList) {
          targetList = Object.keys(this.records).find((k) =>
            this.records[k]?.some((r) => ids.includes(Number((r as any)?.id)))
          ) as string;
        }
        if (!targetList) return;

        const arr = this.records[targetList] || (this.records[targetList] = []);
        if (!arr.length) return;

        let removed = 0;
        for (let i = arr.length - 1; i >= 0; i--) {
          if (ids.includes(Number((arr[i] as any)?.id))) {
            arr.splice(i, 1);
            removed++;
          }
        }
        console.log("[socket] deleted", { targetList, count: removed });
        return;
      }
    },
  },
});
