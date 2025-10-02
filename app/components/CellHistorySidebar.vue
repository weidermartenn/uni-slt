<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <header
      class="px-4 py-3 border-b bg-white/70 backdrop-blur dark:bg-zinc-900/70"
    >
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold tracking-tight">История изменений</h2>
        <div class="flex items-center gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-zinc-50 dark:bg-zinc-800"
          >
            <span class="font-mono font-medium">{{ meta?.a1 || "—" }}</span>
          </span>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 mt-2">
        <h2 class="text-sm font-semibold tracking-tight">Автор изменений</h2>
        <div class="flex items-center gap-2 text-xs">
          <span
            class="inline-flex items-center gap-1 rounded-full border px-2 py-1 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="lucide lucide-circle-user-icon lucide-circle-user"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="10" r="3" />
              <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
            </svg>
            <span class="font-mono font-medium">Неизвестный пользователь</span>
          </span>
        </div>
      </div>
      <!-- Controls -->
      <div class="mt-3 grid grid-cols-2 gap-2">
        <div class="col-span-1">
          <div class="relative">
            <input
              v-model.trim="q"
              type="text"
              placeholder="Поиск по значениям…"
              class="w-full h-9 rounded-md border px-3 pr-8 text-sm bg-white dark:bg-zinc-900"
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <select
            v-model="order"
            class="h-9 w-full rounded-md border px-2 text-sm bg-white dark:bg-zinc-900"
          >
            <option value="desc">Сначала новые</option>
            <option value="asc">Сначала старые</option>
          </select>
        </div>
      </div>
    </header>
    <!-- Body -->
    <div class="flex-1 overflow-auto px-4 py-3">
      <!-- Empty state -->
      <div v-if="!filtered.length" class="h-full grid place-items-center">
        <div class="text-center">
          <div class="text-4xl mb-2">🗂️</div>
          <p class="text-sm text-zinc-500">
            Нет изменений (или не найдено по фильтрам).
          </p>
        </div>
      </div>
      <!-- List -->
      <ul v-else class="space-y-2">
        <li
          v-for="item in filtered"
          :key="item.id"
          class="group rounded-xl border bg-white/60 dark:bg-zinc-900/60 backdrop-blur p-3 hover:shadow-sm transition"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span
                class="inline-flex h-6 items-center rounded-md border px-2 text-xs font-mono"
              >
                #{{ item.id }}
              </span>
              <span class="text-xs text-zinc-500">{{
                formatFull(item.date)
              }}</span>
              <span class="text-[11px] text-zinc-400"
                >· {{ fromNow(item.date) }}</span
              >
            </div>
            <button
              class="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded-md border hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              @click="copyDiff(item)"
              title="Скопировать строку"
            >
              Скопировать
            </button>
          </div>
          <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div
              class="rounded-lg border p-2 bg-zinc-50/60 dark:bg-zinc-800/60"
            >
              <div class="text-[11px] uppercase tracking-wide text-zinc-500">
                Было
              </div>
              <div class="mt-1 font-mono line-through opacity-70 break-words">
                {{ showValue(item.dataBefore) }}
              </div>
            </div>
            <div
              class="rounded-lg border p-2 bg-emerald-50/60 dark:bg-emerald-900/20"
            >
              <div class="text-[11px] uppercase tracking-wide text-zinc-500">
                Стало
              </div>
              <div class="mt-1 font-mono break-words">
                <span
                  class="px-1 rounded bg-emerald-100/80 dark:bg-emerald-900/40"
                >
                  {{ showValue(item.dataAfter) }}
                </span>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <!-- Footer (count) -->
      <div class="mt-3 text-xs text-zinc-500">
        Показано: {{ filtered.length }} из {{ entries.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import { useUniverStore } from "~/stores/univer-store";

const store = useUniverStore();
const meta = computed(() => store.cellHistoryMeta);
const entries = computed(
  () =>
    store.cellHistoryList as Array<{
      id: number;
      date: string;
      dataBefore?: string;
      dataAfter?: string;
    }>
); // типизируйте при желании

// --- UI state
const q = ref("");
const order = ref<"asc" | "desc">("desc");

// --- Filtering & ordering
const filtered = computed(() => {
  const base = (entries.value || []).filter((r) => {
    if (!q.value) return true;
    const needle = q.value.toLowerCase();
    return (
      (r.dataBefore || "").toLowerCase().includes(needle) ||
      (r.dataAfter || "").toLowerCase().includes(needle) ||
      String(r.id).includes(needle)
    );
  });

  return base.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return order.value === "asc" ? da - db : db - da;
  });
});

// --- Helpers
const showValue = (v?: string) => (v == null || v === "" ? "∅" : v);

const formatFull = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString();
};

const fromNow = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const minute = 60_000,
    hour = 3_600_000,
    day = 86_400_000;
  if (abs < hour) return `${Math.max(1, Math.round(abs / minute))} мин. назад`;
  if (abs < day) return `${Math.round(abs / hour)} ч. назад`;
  return `${Math.round(abs / day)} дн. назад`;
};

const copyDiff = (r: {
  id: number;
  date: string;
  dataBefore?: string;
  dataAfter?: string;
}) => {
  const txt = `#${r.id} · ${formatFull(r.date)}\nБыло: ${showValue(
    r.dataBefore
  )}\nСтало: ${showValue(r.dataAfter)}`;
  navigator.clipboard?.writeText(txt).catch(() => {});
};

// --- UX: быстрый фокус на поиск по ⌘K
const keydown = (e: KeyboardEvent) => {
  const isMac = navigator.platform.toLowerCase().includes("mac");
  if (
    (isMac && e.metaKey && e.key.toLowerCase() === "k") ||
    (!isMac && e.ctrlKey && e.key.toLowerCase() === "k")
  ) {
    e.preventDefault();
    // небольшой трюк: фокус на первое поле ввода в хедере
    const input =
      (e.target as HTMLElement)
        ?.closest("[data-sidebar]")
        ?.querySelector("input") ||
      document.querySelector<HTMLInputElement>(
        'input[placeholder="Поиск по значениям…"]'
      );
    input?.focus();
  }
};

onMounted(() => window.addEventListener("keydown", keydown));
onBeforeUnmount(() => window.removeEventListener("keydown", keydown));
</script>

<style scoped>
/* тонкая тень для карточек на hover уже задана в классе; сюда можно добавить доп. темы при желании */
</style>
