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
                  <!-- ФИО редактируемое -->
                  <div class="flex flex-col">
                    <div v-if="!editMode" class="text-2xl font-bold text-gray-900 tracking-tight">
                      {{ displayName(userData.object) }}
                    </div>
                    <UInput
                      v-else
                      v-model="form.fullName"
                      variant="none"
                      class="text-2xl font-bold p-0"
                      placeholder="ФИО"
                      aria-label="ФИО"
                    />
                    <div class="flex items-center gap-3 mt-2">
                      <UBadge variant="subtle" class="font-medium">
                        {{ userData.object.role?.name || '-' }}
                      </UBadge>

                      <!-- Редактируемая роль -->
                      <div v-if="editMode">
                        <USelect
                          v-model="form.roleCode"
                          :items="roleItems"
                          placeholder="Выберите роль"
                          class="min-w-[180px]"
                        />
                      </div>

                      <span v-else class="text-sm text-gray-500 flex items-center gap-1">
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
              <UButton v-if="editMode" color="secondary" variant="ghost" @click="cancelEdit" :disabled="saving">Отмена</UButton>
              <UButton v-if="editMode" color="success" @click="save" :loading="saving">Сохранить</UButton>
            </div>
          </UCard>

          <!-- Финансовые параметры (редактируемые) -->
          <UCard class="mt-4 border border-gray-200 shadow-sm hover:shadow-md">
            <template #header>
              <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                <UIcon name="i-lucide-wallet" class="h-5 w-5 text-amber-600" />
                Финансовые параметры
              </h3>
            </template>

            <div class="v-col gap-3 p-4">
              <!-- Коэффициенты -->
              <div class="flex flex-col gap-1">
                <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">Коэффициенты</p>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <UInput
                    v-model.number="form.employee.coefficientClientLead"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Лид %"
                  />
                  <UInput
                    v-model.number="form.employee.coefficientDepartmentHead"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Отдел %"
                  />
                  <UInput
                    v-model.number="form.employee.coefficientManager"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Менеджер %"
                  />
                  <UInput
                    v-model.number="form.employee.coefficientSalesManager"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Продажи %"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Оклад</p>
                  <UInput
                    v-model.number="form.employee.salary"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Оклад"
                    class="mt-1"
                  />
                </div>
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Другие выплаты</p>
                  <UInput
                    v-model.number="form.employee.otherPayments"
                    :disabled="!editMode"
                    variant="none"
                    type="number"
                    placeholder="Другие выплаты"
                    class="mt-1"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Отдел</p>
                  <UInput
                    v-model="form.employee.department"
                    :disabled="!editMode"
                    variant="none"
                    type="text"
                    placeholder="Отдел"
                    class="mt-1"
                  />
                </div>

                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-wide">Примечание (employee)</p>
                  <UInput
                    v-model="form.employee.note"
                    :disabled="!editMode"
                    variant="none"
                    type="text"
                    placeholder="Примечание"
                    class="mt-1"
                  />
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

const route = useRoute()
const router = useRouter()
const toast = useToast()
const employeeStore = useEmployeeStore()

definePageMeta({ layout: 'default' })
useHead({ title: 'Информация о сотруднике' })

const loading = ref(true)
const saving = ref(false)
const userData = ref<any>(null)
const editMode = ref(false)

// форма расширена
const form = reactive({
  fullName: '',
  phone: '',
  email: '',
  note: '',
  roleCode: null as string | null,
  employee: {
    birthdayDate: null as string | null,
    coefficientClientLead: 0,
    coefficientDepartmentHead: 0,
    coefficientManager: 0,
    coefficientSalesManager: 0,
    department: '',
    fixedPart: 0,
    id: 0,
    note: '',
    otherPayments: 0,
    salary: 0,
  },
})

// role items для USelect
const roleItems = [
  { label: 'Менеджер', value: 'ROLE_MANAGER' },
  { label: 'Бухгалтер', value: 'ROLE_BUH' },
  { label: 'Администратор', value: 'ROLE_ADMIN' },
]

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

    // Инициализируем форму из загруженных данных
    const obj = userData.value?.object || {}
    form.fullName = obj.fullName ?? obj.name ?? ''
    form.phone = obj.phone ?? ''
    form.email = obj.email ?? ''
    form.note = obj.employee?.note ?? ''
    form.roleCode = obj.role?.code ?? null

    // employee object — аккуратно заполняем числовые поля
    form.employee = {
      birthdayDate: obj.employee?.birthdayDate ?? null,
      coefficientClientLead: Number(obj.employee?.coefficientClientLead ?? 0),
      coefficientDepartmentHead: Number(obj.employee?.coefficientDepartmentHead ?? 0),
      coefficientManager: Number(obj.employee?.coefficientManager ?? 0),
      coefficientSalesManager: Number(obj.employee?.coefficientSalesManager ?? 0),
      department: obj.employee?.department ?? '',
      fixedPart: Number(obj.employee?.fixedPart ?? 0),
      id: Number(obj.employee?.id ?? 0),
      note: obj.employee?.note ?? '',
      otherPayments: Number(obj.employee?.otherPayments ?? 0),
      salary: Number(obj.employee?.salary ?? 0),
    }
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
    resetFormFromUserData()
  }
}

const cancelEdit = () => {
  editMode.value = false
  resetFormFromUserData()
}

function resetFormFromUserData() {
  const obj = userData.value?.object || {}
  form.fullName = obj.fullName ?? obj.name ?? ''
  form.phone = obj.phone ?? ''
  form.email = obj.email ?? ''
  form.note = obj.employee?.note ?? ''
  form.roleCode = obj.role?.code ?? null
  form.employee = {
    birthdayDate: obj.employee?.birthdayDate ?? null,
    coefficientClientLead: Number(obj.employee?.coefficientClientLead ?? 0),
    coefficientDepartmentHead: Number(obj.employee?.coefficientDepartmentHead ?? 0),
    coefficientManager: Number(obj.employee?.coefficientManager ?? 0),
    coefficientSalesManager: Number(obj.employee?.coefficientSalesManager ?? 0),
    department: obj.employee?.department ?? '',
    fixedPart: Number(obj.employee?.fixedPart ?? 0),
    id: Number(obj.employee?.id ?? 0),
    note: obj.employee?.note ?? '',
    otherPayments: Number(obj.employee?.otherPayments ?? 0),
    salary: Number(obj.employee?.salary ?? 0),
  }
}

// Сохранение — формируем полный DTO и отправляем в store
const save = async () => {
  if (!userData.value?.object) return

  saving.value = true
  try {
    // Формируем DTO в соответствии со swagger'ом / UserDto
    const existing = userData.value.object

    const payload = {
      id: existing.id,
      fullName: form.fullName || existing.fullName || existing.name || null,
      login: existing.login ?? null,
      name: existing.name ?? null,
      phone: form.phone || null,
      email: form.email || null,
      chatId: existing.chatId ?? 0,
      confirmed: typeof existing.confirmed === 'boolean' ? existing.confirmed : true,
      confirmedNotification: typeof existing.confirmedNotification === 'boolean' ? existing.confirmedNotification : true,
      employee: {
        // передаём обновлённые значения (числа)
        id: Number(form.employee.id ?? existing.employee?.id ?? 0),
        birthdayDate: form.employee.birthdayDate ?? existing.employee?.birthdayDate ?? null,
        coefficientClientLead: Number(form.employee.coefficientClientLead ?? 0),
        coefficientDepartmentHead: Number(form.employee.coefficientDepartmentHead ?? 0),
        coefficientManager: Number(form.employee.coefficientManager ?? 0),
        coefficientSalesManager: Number(form.employee.coefficientSalesManager ?? 0),
        department: form.employee.department ?? existing.employee?.department ?? '',
        fixedPart: Number(form.employee.fixedPart ?? existing.employee?.fixedPart ?? 0),
        note: form.employee.note ?? existing.employee?.note ?? '',
        otherPayments: Number(form.employee.otherPayments ?? 0),
        salary: Number(form.employee.salary ?? 0),
      },
      role: form.roleCode ? { code: form.roleCode } : (existing.role ?? null),
    }

    // Ждём выполнения запроса на сервер (store должен корректно отправлять DTO)
    await employeeStore.editEmployeeInfo(payload)

    toast.add({ title: 'Данные сохранены', color: 'success', icon: 'i-lucide-check' })

    // Обновляем данные текущей страницы и глобальный список сотрудников
    await loadLKData()
    if (typeof employeeStore.fetchAllEmployeeInfos === 'function') {
      try { await employeeStore.fetchAllEmployeeInfos() } catch {}
    }

    editMode.value = false
  } catch (err) {
    console.error('save error', err)
    toast.add({ title: 'Ошибка при сохранении', color: 'error', icon: 'i-lucide-x' })
  } finally {
    saving.value = false
  }
}
</script>
