<template>
  <div class="min-h-[60vh] space-y-6">
    <!-- Панель поиска и фильтры -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        class="w-full sm:max-w-lg"
        placeholder="Поиск по ФИО, имени, телеграму, телефону, отделу..."
      />

      <div class="flex items-center gap-2">
        <USelectMenu
          v-model="roleFilter"
          :options="roleOptions"
          value-attribute="value"
          option-attribute="label"
          placeholder="Роль"
          clearable
          class="min-w-[180px]"
        />
        <USelectMenu
          v-model="statusFilter"
          :options="statusOptions"
          value-attribute="value"
          option-attribute="label"
          placeholder="Статус"
          clearable
          class="min-w-[180px]"
        />
      </div>
    </div>

    <div class="w-full flex justify-end">
      <AddEmployeeModal />
    </div>

    <!-- Скелетоны -->
    <div v-if="loading" class="flex flex-col gap-4">
      <UCard v-for="i in 4" :key="i" class="border border-gray-200 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="h-14 w-14 rounded-full bg-gray-200" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-2/3"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Пустое состояние -->
    <div v-else-if="filteredEmployees.length === 0" class="text-center py-16 border border-gray-200 rounded-lg">
      <UIcon name="i-lucide-users" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-semibold text-gray-900 mb-2">Сотрудники не найдены</h3>
      <p class="text-gray-600">Измените параметры фильтра или запрос поиска</p>
    </div>

    <!-- Вертикальный список карточек -->
    <div v-else ref="listContainer" class="flex flex-col gap-4">
      <div
        v-for="u in filteredEmployees"
        :key="u.id"
        class="card-item block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
        :aria-label="`Карточка сотрудника ${displayName(u)}`"
        tabindex="0"
      >
        <UCard class="group border border-gray-200 hover:border-blue-200 hover:shadow-md transition-all duration-300">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-4">
              <div class="h-14 w-14 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-white shadow-sm">
                <UIcon name="i-lucide-user" class="h-7 w-7 text-gray-700" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ displayName(u) }}
                </h3>
                <div class="flex items-center gap-2 mt-1">
                  <UBadge variant="subtle" :color="roleColor(u.role?.code)" class="font-medium">
                    {{ u.role?.name || '—' }}
                  </UBadge>

                  <span v-if="validLogin(u.login)" class="text-sm text-gray-500 flex items-center gap-1">
                    @{{ u.login }}
                    <UButton
                      color="info"
                      variant="ghost"
                      icon="i-lucide-copy"
                      size="xs"
                      class="p-1"
                      @click.stop.prevent="copyToClipboard(u.login!, 'Логин скопирован')"
                      aria-label="Скопировать логин"
                    />
                  </span>
                  <span v-else class="text-sm text-gray-500">
                    {{ u.login === 'Из ТУ' ? 'Из ТУ' : '—' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="v-row gap-2">
              <UBadge :color="u.confirmed ? 'success' : 'error'" variant="subtle" class="ml-2">
                {{ u.confirmed ? 'Подтвержден' : 'Не подтвержден' }}
              </UBadge>

              <!-- Кнопка удаления: открывает общую модалку -->
              <UButton
                variant="soft"
                color="error"
                size="sm"
                icon="i-lucide-trash"
                class="ml-2"
                @click.stop.prevent="openDeleteModal(u)"
                aria-label="Удалить сотрудника"
              >
                Удалить
              </UButton>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building" class="h-4 w-4 text-blue-600" />
              <span class="text-sm text-gray-700">
                {{ u.employee?.department || 'Не указан' }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-phone" class="h-4 w-4 text-blue-600" />
              <span class="text-sm text-gray-700">
                {{ formatPhone(u.phone) || 'Не указан' }}
              </span>
              <UButton
                v-if="u.phone"
                color="info"
                variant="ghost"
                icon="i-lucide-copy"
                size="xs"
                class="p-0.5"
                @click.stop.prevent="copyToClipboard(u.phone!, 'Телефон скопирован')"
                aria-label="Скопировать телефон"
              />
            </div>

            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-mail" class="h-4 w-4 text-green-600" />
              <span class="text-sm text-gray-700">
                {{ u.email || 'Не указан' }}
              </span>
            </div>

            <div v-if="u.employee" class="flex items-center gap-2">
              <UIcon name="i-lucide-wallet" class="h-4 w-4 text-amber-600" />
              <span class="text-sm text-gray-700">
                {{ formatCurrency(u.employee?.salary || 0) }} руб.
              </span>
            </div>
          </div>

          <div class="flex justify-between items-center mt-3">
            <div v-if="u.employee" class="flex flex-wrap gap-2">
              <span class="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded"
                    title="Надбавка за лидирование клиента"
                    aria-label="Надбавка за лидирование клиента"
              >
                Лид: {{ u.employee?.coefficientClientLead || 0 }}%
              </span>
              <span class="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded"
                    title="Надбавка за руководство отделом"
                    aria-label="Надбавка за руководство отделом"
              >
                Отдел: {{ u.employee?.coefficientDepartmentHead || 0 }}%
              </span>
              <span class="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded"
                    title="Надбавка за менеджерскую работу"
                    aria-label="Надбавка за менеджерскую работу"
              >
                Менеджер: {{ u.employee?.coefficientManager || 0 }}%
              </span>
              <span class="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded"
                    title="Надбавка за продажи"
                    aria-label="Надбавка за продажи"
              >
                Продажи: {{ u.employee?.coefficientSalesManager || 0 }}%
              </span>
            </div>

            <UButton
              variant="soft"
              color="info"
              size="sm"
              class="px-4"
              @click.prevent="gotoEmployee(u.id)"
              aria-label="Перейти к сотруднику"
            >
              Перейти
            </UButton>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Модал подтверждения удаления -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Подтвердите удаление"
      :description="deleteTarget ? `Удалить сотрудника ${displayName(deleteTarget)}? Это действие необратимо.` : ''"
      :closable="!deleting"
    >
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <UButton variant="ghost" color="secondary" @click="cancelDelete" :disabled="deleting">Отмена</UButton>
          <UButton color="error" :loading="deleting" @click="confirmDelete">Удалить</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap'
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from '~/entities/User/types'
import { useEmployeeStore } from '~/stores/employee-store'
import { useToast } from '#imports'

defineOptions({ name: 'AETab' })

const toast = useToast()
const aeiStore = useEmployeeStore()
const router = useRouter()

const loading = ref(true)
const q = ref('')

// Фильтры
const roleFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)
const listContainer = ref<HTMLElement | null>(null)

// Удаление
const isDeleteModalOpen = ref(false)
const deleteTarget = ref<User | null>(null)
const deleting = ref(false)

// Данные из стора
const employees = computed<User[]>(() =>
  (aeiStore.employeesAllInfo || []).filter((emp: any) => (emp?.fullName != null || emp?.name != null) && emp?.confirmed === true)
)

// Опции ролей
const roleOptions = computed(() => {
  const map = new Map<string, string>()
  for (const u of employees.value) {
    const code = u.role?.code
    const name = u.role?.name || code
    if (code) map.set(code, String(name))
  }
  return Array.from(map, ([value, label]) => ({ label, value })).sort((a, b) => a.label.localeCompare(b.label, 'ru'))
})

// Опции статусов
const statusOptions = [
  { label: 'Подтвержден', value: 'confirmed' },
  { label: 'Не подтвержден', value: 'not_confirmed' }
]

// Поиск + фильтрация
const filteredEmployees = computed<User[]>(() => {
  const term = q.value.trim().toLowerCase()
  return employees.value.filter(u => {
    const matchesTerm = term
      ? [
          u.fullName,
          u.name,
          u.login,
          u.phone,
          u.email,
          u.employee?.department
        ].some(x => String(x ?? '').toLowerCase().includes(term))
      : true

    const matchesRole = roleFilter.value ? u.role?.code === roleFilter.value : true
    const matchesStatus = statusFilter.value
      ? (statusFilter.value === 'confirmed' ? !!u.confirmed : !u.confirmed)
      : true

    return matchesTerm && matchesRole && matchesStatus
  })
})

// Навигация
const gotoEmployee = (id: number | string | undefined) => {
  if (!id) return
  router.push(`/admin/employee-${id}`)
}

// Утилиты
const displayName = (u: Partial<User> | null) => {
  if (!u) return ''
  return u.fullName || (u as any).name || `#${u.id}`
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(amount || 0)

const formatPhone = (phone?: string | null) => {
  if (!phone) return ''
  const cleaned = String(phone).replace(/\D/g, '')
  const m = cleaned.match(/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/)
  if (m) return `+7 (${m[2]}) ${m[3]}-${m[4]}-${m[5]}`
  return phone
}

const validLogin = (login?: string | null) => !!login && login !== 'Из ТУ'

const roleColor = (code?: string) => {
  switch (code) {
    case 'ROLE_ADMIN': return 'primary'
    case 'ROLE_MANAGER': return 'info'
    case 'ROLE_BUH': return 'success'
    default: return 'neutral'
  }
}

const copyToClipboard = async (text: string, successMessage = 'Скопировано!') => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: successMessage, icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Ошибка копирования', icon: 'i-lucide-x', color: 'error' })
  }
}

// GSAP: анимация карточек
const animateCards = () => {
  nextTick(() => {
    const el = listContainer.value
    if (!el) return
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.card-item'))
    if (!cards.length) return
    gsap.fromTo(
      cards,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.36, stagger: 0.08, ease: 'power3.out' }
    )
  })
}

// Запускаем анимацию при монтировании и при изменении списка
onMounted(async () => {
  await load()
  animateCards()
})

watch(filteredEmployees, () => {
  // анимируем при изменении видимого списка
  animateCards()
})

// Загрузка данных из стора (как в admin/index.vue)
const load = async () => {
  try {
    loading.value = true
    if (!aeiStore.employeesAllInfo?.length) {
      await aeiStore.fetchAllEmployeeInfos()
    }
  } catch (e) {
    console.error(e)
    toast.add({
      title: 'Не удалось загрузить сотрудников',
      icon: 'i-lucide-alert-triangle',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// Открыть модалку удаления
const openDeleteModal = (user: User) => {
  deleteTarget.value = user
  isDeleteModalOpen.value = true
}

// Отмена
const cancelDelete = () => {
  if (deleting.value) return
  isDeleteModalOpen.value = false
  deleteTarget.value = null
}

// Подтвердить удаление
const confirmDelete = async () => {
  if (!deleteTarget.value) return
  const id = deleteTarget.value.id
  deleting.value = true
  try {
    await aeiStore.deleteEmployee(id)
    toast.add({ title: 'Сотрудник удалён', color: 'success', icon: 'i-lucide-check' })
    // закрываем модалку
    isDeleteModalOpen.value = false
    deleteTarget.value = null

    // Обновим локальные данные — load перезапишет store при необходимости
    // если store уже обновляет employeesAllInfo, можно не вызывать снова, но вызов небольшого обновления безопасен
    await load()
    // анимируем обновлённый список
    animateCards()
  } catch (err) {
    console.error('deleteEmployee error', err)
    toast.add({ title: 'Ошибка при удалении', color: 'error', icon: 'i-lucide-x' })
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
/* локальные правки при необходимости */
</style>
