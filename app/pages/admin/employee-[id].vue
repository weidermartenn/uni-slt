<template>
  <UApp>
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div v-if="loading" class="flex items-center justify-center h-64">
        <div class="text-center">
          <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
          <p class="text-lg text-gray-600">Загрузка данных...</p>
        </div>
      </div>

      <div v-else>
        <div v-if="userData?.operationResult === 'OK'">
          <!-- Header card -->
          <UCard class="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-4">
                <div class="h-16 w-16 rounded-full flex items-center justify-center shadow-md">
                  <UIcon name="i-lucide-user" class="h-8 w-8" />
                </div>
                <div class="v-col">
                  <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ displayName(userData.object) }}</h1>
                  <div class="flex items-center gap-3 mt-2">
                    <UBadge variant="subtle" class="font-medium">
                      {{ userData.object.role?.name || '-' }}
                    </UBadge>
                    <span class="text-sm text-gray-500 flex items-center gap-1">
                      @{{ userData.object.login }}
                      <UButton
                        color="info"
                        variant="ghost"
                        icon="i-lucide-copy"
                        size="xs"
                        class="p-1"
                        @click="copyToClipboard(userData.object.login, 'Логин скопирован')"
                      />
                    </span>
                  </div>
                </div>
              </div>

              <div class="v-col items-end">
                <UButton variant="soft" color="info" @click="toggleEdit">
                  {{ editMode ? 'Отменить' : 'Редактировать' }}
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Контактная информация (редактируемая) -->
          <UCard class="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 mt-4">
            <template #header>
              <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <UIcon name="i-lucide-contact" class="h-5 w-5 text-blue-600" />
                Контактная информация
              </h2>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div class="p-4 border border-gray-100 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Телефон</p>
                <div class="mt-2 flex items-center gap-2">
                  <!-- показываем форматированный номер вне режима редактирования,
                       и сырое значение в режиме редактирования -->
                  <UInput
                    :model-value="editMode ? form.phone : formatPhone(form.phone || userData.object.phone)"
                    @update:model-value="val => { if (editMode) form.phone = val }"
                    :disabled="!editMode"
                    variant="none"
                    type="text"
                    class="w-full -ml-2"
                    placeholder="+7..."
                    aria-label="Телефон"
                  />
                  <UButton
                    v-if="(form.phone || userData.object.phone)"
                    color="info"
                    variant="ghost"
                    icon="i-lucide-copy"
                    size="xs"
                    @click="copyPhone"
                  />
                </div>
              </div>

              <div class="p-4 border border-gray-100 rounded-lg">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                <div class="mt-2 flex items-center gap-2">
                  <UInput
                    v-model="form.email"
                    :disabled="!editMode"
                    variant="none"
                    type="email"
                    class="w-full -ml-2"
                    placeholder="Не указан"
                    aria-label="Email"
                  />
                </div>
              </div>

              <div class="p-4 border border-gray-100 rounded-lg md:col-span-2">
                <p class="text-xs text-gray-500 uppercase tracking-wide">Примечание</p>
                <UInput 
                  v-model="form.note"
                  :disabled="!editMode"
                  variant="none"
                  type="text"
                  class="w-full -ml-2"
                  placeholder="Примечание"
                  aria-label="Примечание"
                />
              </div>
            </div>

            <div class="mt-4 flex justify-end gap-3">
              <UButton v-if="editMode" color="secondary" variant="ghost" @click="cancelEdit">Отмена</UButton>
              <UButton v-if="editMode" color="success" @click="save">Сохранить</UButton>
            </div>
          </UCard>

          <!-- Финансовый блок и остальная часть можно копировать из UserLK — здесь прямая интеграция -->
          <UCard class="mt-4 border border-gray-200 shadow-sm hover:shadow-md">
            <template #header>
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <UIcon name="i-lucide-wallet" class="h-5 w-5 text-amber-600" />
                Финансовые параметры
              </h3>
            </template>

            <div class="v-col gap-3 p-4">
              <div class="flex flex-col gap-1">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">Коэффициенты</p>
                <div class="flex flex-wrap gap-2 items-center">
                  <span class="text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-flex items-center gap-1">
                    Лид: {{ userData.object.employee?.coefficientClientLead || 0 }}%
                  </span>
                  <span class="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded inline-flex items-center gap-1">
                    Отдел: {{ userData.object.employee?.coefficientDepartmentHead || 0 }}%
                  </span>
                  <span class="text-sm font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded inline-flex items-center gap-1">
                    Менеджер: {{ userData.object.employee?.coefficientManager || 0 }}%
                  </span>
                  <span class="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded inline-flex items-center gap-1">
                    Продажи: {{ userData.object.employee?.coefficientSalesManager || 0 }}%
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div class="p-4 border border-gray-100 rounded-lg bg-green-50">
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Оклад</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">
                    {{ formatCurrency(userData.object.employee?.salary || 0) }} руб.
                  </p>
                </div>
                <div class="p-4 border border-gray-100 rounded-lg bg-blue-50">
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Другие выплаты</p>
                  <p class="text-lg font-bold text-gray-900 mt-1">
                    {{ formatCurrency(userData.object.employee?.otherPayments || 0) }} руб.
                  </p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div v-else class="text-center py-16 border border-gray-200 rounded-lg">
          <UIcon name="i-lucide-alert-circle" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Нет данных</h3>
          <p class="text-gray-600 mb-6">Пользователь не найден или данные не доступны.</p>
          <UButton variant="outline" @click="loadLKData">Попробовать снова</UButton>
        </div>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { useEmployeeStore } from '~/stores/employee-store'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '#imports'
import { nextTick } from 'vue'
import { getUser } from '~/helpers/getUser'

const { public: kingsApiBase } = useRuntimeConfig()

const route = useRoute()
const router = useRouter()
const toast = useToast()
const employeeStore = useEmployeeStore()

definePageMeta({ layout: 'default' })
useHead({ title: 'Информация о сотруднике' })

const loading = ref(true)
const userData = ref<any>(null)
const editMode = ref(false)

const form = reactive({
  phone: '',
  email: '',
  note: '',
})

// Получаем id из params
const idParam = route.params.id
const id = Number(idParam)

// Вспомогательные
const displayName = (obj: any) => obj?.fullName || obj?.name || `#${obj?.id}`

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0)

const formatPhone = (phone?: string | null) => {
  if (!phone) return ''
  const cleaned = String(phone).replace(/\D/g, '')
  const m = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/)
  if (m) return `+7 (${m[2]}) ${m[3]}-${m[4]}-${m[5]}`
  return phone
}

const copyToClipboard = async (text: string, successMessage = 'Скопировано!') => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ title: successMessage, icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Ошибка копирования', icon: 'i-lucide-x', color: 'error' })
  }
}

// Копирование номера телефона (копирует "сырое" значение, если есть, иначе исходное из userData)
const copyPhone = () => {
  const raw = form.phone || userData.value?.object?.phone || ''
  if (!raw) return
  copyToClipboard(raw, 'Телефон скопирован')
}

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

const loadLKData = async () => {
  try {
    loading.value = true
    await employeeStore.fetchForLKById(id)
    userData.value = employeeStore.listForLKById
    // Инициализируем форму
    form.phone = userData.value?.object?.phone ?? ''
    form.email = userData.value?.object?.email ?? ''
    form.note = userData.value?.object?.employee?.note ?? ''
  } catch (e) {
    console.error(e)
    toast.add({ title: 'Ошибка загрузки', color: 'error' })
  } finally {
    loading.value = false
    await nextTick()
  }
}

onMounted(loadLKData)

// Режим редактирования
const toggleEdit = () => {
  editMode.value = !editMode.value
  if (!editMode.value) {
    // отмена — сбросить форму в значения из userData
    form.phone = userData.value?.object?.phone ?? ''
    form.email = userData.value?.object?.email ?? ''
    form.note = userData.value?.object?.employee?.note ?? ''
  }
}

const cancelEdit = () => {
  editMode.value = false
  form.phone = userData.value?.object?.phone ?? ''
  form.email = userData.value?.object?.email ?? ''
  form.note = userData.value?.object?.employee?.note ?? ''
}

// Сохранение — предполагаем существование API PUT /user/:id
const save = async () => {
  try {
    loading.value = true
    // Соберём payload. Подгоняй поля по API.
    const payload = {
      phone: form.phone || null,
      email: form.email || null,
      employee: {
        ...userData.value.object.employee,
        note: form.note ?? ''
      }
    }

    // PUT запрос
    await $fetch(`${kingsApiBase}/user/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: payload,
    })

    toast.add({ title: 'Данные сохранены', color: 'success', icon: 'i-lucide-check' })

    // Обновляем локально — перезагрузим
    await loadLKData()
    editMode.value = false
  } catch (err) {
    console.error('save error', err)
    toast.add({ title: 'Ошибка при сохранении', color: 'error', icon: 'i-lucide-x' })
  } finally {
    loading.value = false
  }
}
</script>
