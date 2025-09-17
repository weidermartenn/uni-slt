<template>
  <div :class="[ (isHydrated && darkTheme) ? 'bg-zinc-900' : 'bg-white']">
    <div class="v-row items-center gap-2 p-4">
      <!-- Кнопка ТОЛЬКО она открывает слайдовер -->
      <UButton
        color="info"
        variant="soft"
        class="w-12 h-10 flex justify-center cursor-pointer"
        icon="i-lucide-menu"
        @click="isMenuOpen = true"
      />
      <span :class="[ (isHydrated && darkTheme) ? 'text-zinc-50' : 'text-black']">Главное меню</span>
      <div class="">
        <ClientOnly>
          <USwitch v-model="darkTheme" size="lg" label="Тёмная тема" />
        </ClientOnly>
      </div>
    </div>
    <!-- Сам слайдовер без триггера внутри -->
    <USlideover
      v-model:open="isMenuOpen"
      title="Меню"
      description="Меню"
      side="left"
      :overlay="true"
      :close="{
        icon: 'i-lucide-x',
        class: 'absolute top-4 end-4',
      }"
    >
      <template #content>
        <div class="p-6 pb-2">
          <h3 class="text-lg text-zinc-100 font-semibold">Меню</h3>
        </div>
        <div class="v-col p-6 gap-4">
          <UCard :ui="{ body: 'text-white bg-zinc-800' }">
              <div class="v-row gap-4">
                  <UIcon name="i-lucide-user" class="h-18 w-18" />
                  <div class="v-col">
                      <span>Ваша роль: {{ roleName }}</span>
                  </div>
              </div>
          </UCard>
          <UButton
            v-for="item in visibleItems"
            :key="item.id"
            class="slideover-button"
            @click="$router.push(item.to)"
          >
            <UIcon :name="item.icon" class="h-18 w-18" />
            <span>{{ item.title }}</span>
          </UButton>
          <div v-if="isAdmin" class="v-col my-6 text-center">
            <span class="text-xl font-semibold text-white text-center"
              >Администрирование</span
            >
            <div class="grid grid-cols-1 gap-4">
              <UButton
                @click="$router.push('/admin/employees')"
                class="slideover-button"
              >
                <UIcon name="i-lucide-users" class="h-16 w-16" />
                <span>Сотрудники</span>
              </UButton>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-4">
            <UButton
              :ui="{ base: 'justify-center h-12 text-md' }"
              color="error"
              variant="soft"
              @click="logout"
            >
              Выйти из аккаунта
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>

  <slot />
</template>

<script setup lang="ts">
const isMenuOpen = ref(false);
import { useTheme } from '~/composables/useTheme';
const { darkTheme } = useTheme();

// avoid hydration mismatch for theme-dependent classes
const isHydrated = ref(false)
onMounted(() => { isHydrated.value = true })

type Role = "user" | "admin";
type Item = { id: number; title: string; icon: string; to: string; role: Role };

const items: Item[] = [
  {
    id: 1,
    title: "Личный кабинет",
    icon: "i-lucide-user",
    to: "/",
    role: "user",
  },
  {
    id: 2,
    title: "Транспортный учет",
    icon: "i-lucide-notebook-tabs",
    to: "/sheet",
    role: "user",
  },
];

const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
const { data: me } = await useFetch<{
  confirmed?: boolean;
  roleCode?: string;
} | null>("/api/auth/me", { headers });

const role = computed(() => me.value?.roleCode);

const roleName = computed(() => {
    const roleMap: Record<string, string> = {
        "ROLE_ADMIN": "Администратор",
        "ROLE_BUH": "Бухгалтер",
        "ROLE_MANAGER": "Менеджер",
        "ROLE_USER": "Пользователь",
    };
    return roleMap[me.value?.roleCode ?? ""] || "Пользователь";
});

const isAdmin = computed(() => me.value?.roleCode === "ROLE_ADMIN");
const visibleItems = computed(() =>
  items.filter((i) => i.role !== "admin" || isAdmin.value)
);

const logout = async () => {
  await $fetch("/api/auth/logout", { method: "POST" });
  await navigateTo("/auth");
};
</script>
