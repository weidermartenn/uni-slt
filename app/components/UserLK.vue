<template>
    <UApp>
      <div class="min-h-screen mb-10">
        <div class="max-w-4xl mx-auto px-4">
          <!-- Загрузка -->
          <div v-if="loading" class="flex items-center justify-center h-64">
            <div class="text-center">
              <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-gray-900 mx-auto mb-4" />
              <p class="text-lg text-gray-600">Загрузка данных...</p>
            </div>
          </div>
          <!-- Основной контент -->
          <div v-else-if="userData?.operationResult === 'OK'" class="space-y-6" ref="contentGroup">
            <!-- Шапка профиля -->
            <UCard id="animated" class="overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                  <div class="h-16 w-16 rounded-full flex items-center justify-center shadow-md">
                    <UIcon name="i-lucide-user" class="h-8 w-8" />
                  </div>
                  <div class="v-col">
                    <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ userData.object.fullName }}</h1>
                    <div class="flex items-center gap-3 mt-2">
                      <UBadge variant="subtle" class="font-medium">
                        {{ userData.object.role.name }}
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
              </div>
            </UCard>
            <UButton @click="issueSalary">Выдать ЗП</UButton>
            <!-- Контактная информация -->
            <UCard id="animated" class="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <template #header>
                <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UIcon name="i-lucide-contact" class="h-5 w-5 text-blue-600" />
                  Контактная информация
                </h2>
              </template>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-phone" class="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Телефон</p>
                    <div class="flex items-center gap-1">
                      <p class="font-medium text-gray-900">
                        {{ formatPhone(userData.object.phone) || 'Не указан' }}
                      </p>
                      <UButton
                        v-if="userData.object.phone"
                        color="info"
                        variant="ghost"
                        icon="i-lucide-copy"
                        size="xs"
                        class="p-1"
                        @click="copyToClipboard(userData.object.phone, 'Телефон скопирован')"
                      />
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-green-200 hover:bg-green-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-mail" class="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                    <p class="font-medium text-gray-900">{{ userData.object.email || 'Не указан' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-emerald-200 hover:bg-emerald-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-badge-check" class="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Статус</p>
                    <p class="font-medium text-gray-900">{{ userData.object.confirmed ? 'Подтвержден' : 'Не подтвержден' }}</p>
                  </div>
                </div>
              </div>
            </UCard>
            <!-- Финансовые параметры -->
            <UCard
              id="animated"
              v-if="userData.object.employee"
              class="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <template #header>
                <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                  <UIcon name="i-lucide-wallet" class="h-5 w-5 text-amber-600" />
                  Финансовые параметры
                </h3>
              </template>
              <div class="v-col gap-3">
                <!-- Коэффициенты -->
                <div class="flex flex-col gap-1 p-4 border border-gray-100 rounded-lg bg-zinc-50">
                  <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">Коэффициенты</p>
                  <div class="flex flex-wrap gap-2 items-center">
                    <UTooltip text="Надбавка за лидирование клиента">
                      <span class="text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded inline-flex items-center gap-1">
                        Лид
                        <UIcon name="i-lucide-info" class="w-3 h-3" />
                        : {{ userData.object.employee.coefficientClientLead || 0 }}%
                      </span>
                    </UTooltip>
                    <UTooltip text="Надбавка за руководство отделом">
                      <span class="text-sm font-semibold text-green-700 bg-green-100 px-2 py-1 rounded inline-flex items-center gap-1">
                        Отдел
                        <UIcon name="i-lucide-info" class="w-3 h-3" />
                        : {{ userData.object.employee.coefficientDepartmentHead || 0 }}%
                      </span>
                    </UTooltip>
                    <UTooltip text="Надбавка за менеджерскую работу">
                      <span class="text-sm font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded inline-flex items-center gap-1">
                        Менеджер
                        <UIcon name="i-lucide-info" class="w-3 h-3" />
                        : {{ userData.object.employee.coefficientManager || 0 }}%
                      </span>
                    </UTooltip>
                    <UTooltip text="Надбавка за продажи">
                      <span class="text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded inline-flex items-center gap-1">
                        Продажи
                        <UIcon name="i-lucide-info" class="w-3 h-3" />
                        : {{ userData.object.employee.coefficientSalesManager || 0 }}%
                      </span>
                    </UTooltip>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Оклад -->
                    <div class="p-4 border border-gray-100 rounded-lg bg-green-50">
                      <p class="text-xs text-gray-500 uppercase tracking-wide">Оклад</p>
                      <p class="text-lg font-bold text-gray-900 mt-1">
                        {{ formatCurrency(userData.object.employee.salary || 0) }} руб.
                      </p>
                    </div>
                    <!-- Другие выплаты -->
                    <div class="p-4 border border-gray-100 rounded-lg bg-blue-50">
                      <p class="text-xs text-gray-500 uppercase tracking-wide">Другие выплаты</p>
                      <p class="text-lg font-bold text-gray-900 mt-1">
                        {{ formatCurrency(userData.object.employee.otherPayments || 0) }} руб.
                      </p>
                    </div>
                </div>
              </div>
            </UCard>
            <!-- Финансовые показатели -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UCard id="animated" class="border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
                <template #header>
                  <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                    <UIcon name="i-lucide-clock" class="h-5 w-5 text-blue-600" />
                    Остаток к выплате
                  </h3>
                </template>
                <div class="flex items-baseline gap-2">
                  <p class="text-3xl font-bold text-gray-900 tracking-tight">{{ formatCurrency(userData.object.leftToIssue) }}</p>
                  <span class="text-sm text-gray-500">руб.</span>
                </div>
              </UCard>
              <UCard id="animated" class="border border-gray-200 shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-300">
                <template #header>
                  <h3 class="font-semibold text-gray-900 flex items-center gap-2">
                    <UIcon name="i-lucide-target" class="h-5 w-5 text-green-600" />
                    Полный остаток
                  </h3>
                </template>
                <div class="flex items-baseline gap-2">
                  <p class="text-3xl font-bold text-gray-900 tracking-tight">{{ formatCurrency(userData.object.leftToIssueFull) }}</p>
                  <span class="text-sm text-gray-500">руб.</span>
                </div>
              </UCard>
            </div>
            <!-- Статистика с пагинацией -->
            <UCard id="animated" v-if="statisticsMonths.length > 0" class="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <template #header>
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <UIcon name="i-lucide-bar-chart-3" class="h-5 w-5 text-orange-600" />
                    Статистика за {{ currentMonthDisplay }}
                  </h2>
                  <div class="flex items-center gap-2">
                    <UButton
                      variant="soft"
                      color="info"
                      :disabled="currentMonthIndex === 0"
                      @click="prevMonth"
                      class="h-8 w-8 p-0 flex items-center justify-center"
                    >
                      <UIcon name="i-lucide-chevron-left" class="h-4 w-4" />
                    </UButton>
                    <span class="text-sm text-gray-600 min-w-[80px] text-center">
                      {{ currentMonthIndex + 1 }} / {{ statisticsMonths.length }}
                    </span>
                    <UButton
                      variant="soft"
                      color="info"
                      :disabled="currentMonthIndex === statisticsMonths.length - 1"
                      @click="nextMonth"
                      class="h-8 w-8 p-0 flex items-center justify-center"
                    >
                      <UIcon name="i-lucide-chevron-right" class="h-4 w-4" />
                    </UButton>
                  </div>
                </div>
              </template>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center p-6 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-credit-card" class="h-8 w-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Выдано</p>
                  <p class="text-2xl font-bold text-gray-900 tracking-tight">{{ formatCurrency(currentMonthStats.issued) }}</p>
                </div>
                <div class="text-center p-6 border border-gray-100 rounded-lg hover:border-green-200 hover:bg-green-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-percent" class="h-8 w-8 text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Процент</p>
                  <p class="text-2xl font-bold text-gray-900 tracking-tight">{{ currentMonthStats.percent }}%</p>
                </div>
                <div class="text-center p-6 border border-gray-100 rounded-lg hover:border-amber-200 hover:bg-amber-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-coins" class="h-8 w-8 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">Выплачено</p>
                  <p class="text-2xl font-bold text-gray-900 tracking-tight">{{ formatCurrency(currentMonthStats.percentPaid) }}</p>
                </div>
              </div>
            </UCard>
            <!-- Информация о сотруднике -->
            <UCard id="animated" v-if="userData.object.employee" class="border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
              <template #header>
                <h2 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase" class="h-5 w-5 text-indigo-600" />
                  Рабочая информация
                </h2>
              </template>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div v-if="userData.object.employee.department" class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-building" class="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Отдел</p>
                    <p class="font-medium text-gray-900">{{ userData.object.employee.department }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-green-200 hover:bg-green-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-trending-up" class="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Коэффициент</p>
                    <p class="font-medium text-gray-900">{{ userData.object.employee.coefficientManager || 0 }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-amber-200 hover:bg-amber-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-wallet" class="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Оклад</p>
                    <p class="font-medium text-gray-900">{{ formatCurrency(userData.object.employee.salary) }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 border border-gray-100 rounded-lg hover:border-gray-200 hover:bg-gray-50 transition-all duration-300 group">
                  <UIcon name="i-lucide-file-text" class="h-5 w-5 text-gray-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <p class="text-xs text-gray-500 uppercase tracking-wide">Примечание</p>
                    <p class="font-medium text-gray-900">{{ formatPhone(userData.object.employee.note) || '—' }}</p>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
          <!-- Ошибка или нет данных -->
          <div v-else class="text-center py-16 border border-gray-200 rounded-lg">
            <UIcon name="i-lucide-alert-circle" class="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Нет данных для отображения</h3>
            <p class="text-gray-600 mb-6">Не удалось загрузить информацию о личном кабинете</p>
            <UButton
              variant="outline"
              class="border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
              @click="loadLKData"
            >
              <UIcon name="i-lucide-refresh-ccw" class="h-4 w-4 mr-2" />
              Попробовать снова
            </UButton>
          </div>
        </div>
      </div>
    </UApp>
</template>

<script setup lang="ts">
import { useEmployeeStore } from '~/stores/employee-store'
import { useToast } from '#imports'
import gsap from 'gsap'

const employeeStore = useEmployeeStore()
const loading = ref(true)
const userData = ref<any>(null)
const currentMonthIndex = ref(0)
const toast = useToast()

// === Вычисляемые ===
const roleColor = computed(() => {
  const role = userData.value?.object?.role?.code
  switch (role) {
    case 'ROLE_MANAGER': return 'blue'
    case 'ROLE_ADMIN': return 'red'
    case 'ROLE_BUH': return 'green'
    default: return 'gray'
  }
})

const issueSalary = async () => {
  try {
    const dto = {
      employeeId: 31,
      percent: true,
      salary: 10000
    }
    const response = await employeeStore.issueSalary(dto)
    console.log(response)
    await employeeStore.fetchForLK()
    console.log(employeeStore.listForLK)
  } catch { }
}

const statisticsMonths = computed(() => {
  return Object.keys(userData.value?.object?.statistics || {}).sort().reverse() || []
})

const currentMonthDisplay = computed(() => {
  return statisticsMonths.value[currentMonthIndex.value] || 'Нет данных'
})

const currentMonthStats = computed(() => {
  return userData.value?.object?.statistics?.[currentMonthDisplay.value] || {}
})

// === Методы ===
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatPhone = (phone: string) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/)
  if (match) {
    return `+7 (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`
  }
  return phone
}

const prevMonth = () => {
  if (currentMonthIndex.value > 0) currentMonthIndex.value--
}

const nextMonth = () => {
  if (currentMonthIndex.value < statisticsMonths.value.length - 1) currentMonthIndex.value++
}

const loadLKData = async () => {
  try {
    loading.value = true
    await employeeStore.fetchForLK()
    userData.value = employeeStore.listForLK
    console.log('Данные загружены:', userData.value)
  } catch (error) {
    console.error('Ошибка загрузки:', error)
  } finally {
    loading.value = false
  }
}

const copyToClipboard = async (text: string, successMessage = 'Скопировано!') => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: successMessage,
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (e) {
    toast.add({
      title: 'Ошибка копирования',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

const contentGroup = ref<HTMLElement | null>(null)

const animateContent = () => {
  if (!contentGroup.value) return 

  const children = contentGroup.value.querySelectorAll('.u-card, [id="animated"]')

  gsap.fromTo(
    children,
    {
      opacity: 0,
      x: 100
    }, 
    {
      opacity: 1,
      x: 0,
      duration: 0.2,
      stagger: 0.1,
      ease: 'power3.out'
    }
  )
}

watch(
  () => loading.value,
  (newVal) => {
    if (!newVal) {
      nextTick(() => {
        animateContent()
      })
    }
  }
)

onMounted(async () => {
  await loadLKData()
})
</script>