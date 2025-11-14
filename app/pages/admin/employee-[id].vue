<template>
  <UApp>
    <div class="min-h-screen mb-10 dark:bg-gray-900 dark:text-gray-100">
      <div class="max-w-4xl mx-auto px-4">
        <!-- Загрузка -->
        <div v-if="loading" class="flex items-center justify-center h-64">
          <div class="text-center">
            <UIcon name="i-lucide-loader-2"
              class="h-8 w-8 animate-spin text-gray-900 dark:text-gray-100 mx-auto mb-4" />
            <p class="text-lg text-gray-600 dark:text-gray-400">
              Загрузка данных...
            </p>
          </div>
        </div>

        <!-- Основной контент -->
        <div v-else-if="userData?.operationResult === 'OK'" class="space-y-6" ref="contentGroup">
          <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" @click="$router.back()">
            Вернуться
          </UButton>
          <!-- Шапка профиля с редактированием -->
          <UCard
            class="overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-800">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-4">
                <div
                  class="h-16 w-16 rounded-full flex items-center justify-center shadow-md bg-white dark:bg-gray-700">
                  <UIcon name="i-lucide-user" class="h-8 w-8 text-gray-600 dark:text-gray-300" />
                </div>
                <div class="v-col">
                  <!-- ФИО редактируемое -->
                  <div class="flex flex-col">
                    <div v-if="!editMode" class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {{ displayName(userData.object) }}
                    </div>
                    <UInput v-else v-model="form.fullName" variant="none"
                      class="text-2xl font-bold p-0 dark:bg-gray-800 dark:text-white" placeholder="ФИО"
                      aria-label="ФИО" />
                    <div class="flex items-center gap-3 mt-2">
                      <UBadge v-if="!editMode" variant="subtle" class="font-medium dark:bg-gray-700">
                        {{ userData.object.role?.name || "-" }}
                      </UBadge>

                      <!-- Редактируемая роль -->
                      <div v-if="editMode">
                        <USelect v-model="form.roleCode" :items="roleItems" placeholder="Выберите роль"
                          class="min-w-[180px]" />
                      </div>

                      <span v-if="userData.object.login && !editMode"
                        class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        @{{ userData.object.login }}
                        <UButton color="info" variant="ghost" icon="i-lucide-copy" size="xs" class="p-1" @click="
                          copyToClipboard(
                            userData.object.login,
                            'Логин скопирован'
                          )
                          " />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="v-col items-end">
                <UButton variant="soft" color="info" @click="toggleEdit">
                  {{ editMode ? "Отменить" : "Редактировать" }}
                </UButton>
              </div>
            </div>
          </UCard>

          <!-- Контактная информация (редактируемая) -->
          <UCard
            class="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-800">
            <template #header>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-lucide-contact" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Контактная информация
              </h2>
            </template>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <!-- Телефон -->
              <div
                class="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-phone"
                  class="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <div class="flex-1">
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Телефон
                  </p>
                  <div class="flex items-center gap-1 mt-1">
                    <UInput :model-value="editMode
                        ? form.phone
                        : formatPhone(form.phone || userData.object.phone)
                      " @update:model-value="
                        (val) => {
                          if (editMode) form.phone = val;
                        }
                      " :disabled="!editMode" variant="none" type="text"
                      class="w-full p-0 dark:bg-gray-800 dark:text-white" placeholder="+7..." aria-label="Телефон" />
                    <UButton v-if="(form.phone || userData.object.phone) && !editMode" color="info" variant="ghost"
                      icon="i-lucide-copy" size="xs" class="p-1" @click="copyPhone" />
                  </div>
                </div>
              </div>

              <!-- Email -->
              <div
                class="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-mail"
                  class="h-5 w-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                <div class="flex-1">
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Email
                  </p>
                  <UInput v-model="form.email" :disabled="!editMode" variant="none" type="email"
                    class="w-full p-0 mt-1 dark:bg-gray-800 dark:text-white" placeholder="Не указан"
                    aria-label="Email" />
                </div>
              </div>

              <!-- Статус -->
              <div
                class="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-badge-check"
                  class="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Статус
                  </p>
                  <p class="font-medium text-gray-900 dark:text-white mt-1">
                    {{
                      userData.object.confirmed
                        ? "Подтвержден"
                        : "Не подтвержден"
                    }}
                  </p>
                </div>
              </div>

              <!-- Примечание -->
              <div
                class="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-gray-200 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 group md:col-span-2">
                <UIcon name="i-lucide-file-text"
                  class="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:scale-110 transition-transform" />
                <div class="flex-1">
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Примечание
                  </p>
                  <UInput v-model="form.note" :disabled="!editMode" variant="none" type="text"
                    class="w-full p-0 mt-1 dark:bg-gray-800 dark:text-white" placeholder="Примечание"
                    aria-label="Примечание" />
                </div>
              </div>
            </div>

            <!-- Кнопки сохранения -->
            <div v-if="editMode" class="mt-4 flex justify-end gap-3">
              <UButton color="secondary" variant="ghost" @click="cancelEdit" :disabled="saving">Отмена</UButton>
              <UButton color="success" @click="save" :loading="saving">Сохранить</UButton>
            </div>
          </UCard>

          <!-- Финансовые параметры (редактируемые) -->
          <UCard v-if="userData.object.employee"
            class="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-800">
            <template #header>
              <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UIcon name="i-lucide-wallet" class="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Финансовые параметры
              </h3>
            </template>

            <div class="w-full v-row items-center mb-4" :class="{
              'justify-between': showSalaryInput,
              'justify-end': !showSalaryInput,
            }">
              <div v-show="showSalaryInput"
                class="v-row gap-1 p-4 border border-gray-100 dark:border-gray-600 rounded-lg bg-zinc-50 dark:bg-gray-700">
                <UInput v-model="issueSalary" placeholder="Введите размер выплаты" />
              </div>
              <UButton @click="paySalary" variant="soft" color="success">
                Выдать зарплату
              </UButton>
            </div>

            <div class="v-col gap-3">
              <!-- Коэффициенты -->
              <div
                class="flex flex-col gap-1 p-4 border border-gray-100 dark:border-gray-600 rounded-lg bg-zinc-50 dark:bg-gray-700">
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Коэффициенты
                </p>
                <div class="flex flex-wrap gap-2 items-center">
                  <UTooltip text="Надбавка за лидирование клиента">
                    <span v-if="!editMode"
                      class="text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded inline-flex items-center gap-1">
                      Лид
                      <UIcon name="i-lucide-info" class="w-3 h-3" />
                      :
                      {{ userData.object.employee.coefficientClientLead || 0 }}%
                    </span>
                    <UInput v-else v-model.number="form.employee.coefficientClientLead" variant="none" type="number"
                      placeholder="0" class="w-24 text-sm" />
                  </UTooltip>

                  <UTooltip text="Надбавка за руководство отделом">
                    <span v-if="!editMode"
                      class="text-sm font-semibold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded inline-flex items-center gap-1">
                      Отдел
                      <UIcon name="i-lucide-info" class="w-3 h-3" />
                      :
                      {{
                        userData.object.employee.coefficientDepartmentHead || 0
                      }}%
                    </span>
                    <UInput v-else v-model.number="form.employee.coefficientDepartmentHead" variant="none" type="number"
                      placeholder="0" class="w-24 text-sm" />
                  </UTooltip>

                  <UTooltip text="Надбавка за менеджерскую работу">
                    <span v-if="!editMode"
                      class="text-sm font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded inline-flex items-center gap-1">
                      Менеджер
                      <UIcon name="i-lucide-info" class="w-3 h-3" />
                      : {{ userData.object.employee.coefficientManager || 0 }}%
                    </span>
                    <UInput v-else v-model.number="form.employee.coefficientManager" variant="none" type="number"
                      placeholder="0" class="w-24 text-sm" />
                  </UTooltip>

                  <UTooltip text="Надбавка за продажи">
                    <span v-if="!editMode"
                      class="text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded inline-flex items-center gap-1">
                      Продажи
                      <UIcon name="i-lucide-info" class="w-3 h-3" />
                      :
                      {{
                        userData.object.employee.coefficientSalesManager || 0
                      }}%
                    </span>
                    <UInput v-else v-model.number="form.employee.coefficientSalesManager" variant="none" type="number"
                      placeholder="0" class="w-24 text-sm" />
                  </UTooltip>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Оклад -->
                <div
                  class="p-4 border border-gray-100 dark:border-gray-600 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Оклад
                  </p>
                  <div v-if="!editMode" class="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {{ formatCurrency(userData.object.employee.salary || 0) }}
                    руб.
                  </div>
                  <UInput v-else v-model.number="form.employee.salary" variant="none" type="number" placeholder="Оклад"
                    class="text-lg font-bold p-0 mt-1 dark:bg-green-900/20 dark:text-white" />
                </div>

                <!-- Другие выплаты -->
                <div class="p-4 border border-gray-100 dark:border-gray-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Другие выплаты
                  </p>
                  <div v-if="!editMode" class="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {{
                      formatCurrency(
                        userData.object.employee.otherPayments || 0
                      )
                    }}
                    руб.
                  </div>
                  <UInput v-else v-model.number="form.employee.otherPayments" variant="none" type="number"
                    placeholder="Другие выплаты"
                    class="text-lg font-bold p-0 mt-1 dark:bg-blue-900/20 dark:text-white" />
                </div>
              </div>

              <!-- Отдел и примечание employee -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 ml-4">
                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Отдел
                  </p>
                  <div v-if="!editMode && userData.object.employee.department"
                    class="font-medium text-gray-900 dark:text-white mt-1">
                    {{ userData.object.employee.department }}
                  </div>
                  <UInput v-else v-model="form.employee.department" :disabled="!editMode" variant="none" type="text"
                    placeholder="Отдел" class="mt-1 dark:bg-gray-800 dark:text-white" />
                </div>

                <div>
                  <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Примечание (employee)
                  </p>
                  <div v-if="!editMode && userData.object.employee.note"
                    class="font-medium text-gray-900 dark:text-white mt-1">
                    {{ userData.object.employee.note }}
                  </div>
                  <UInput v-else v-model="form.employee.note" :disabled="!editMode" variant="none" type="text"
                    placeholder="Примечание" class="mt-1 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
            </div>
          </UCard>

          <!-- Финансовые показатели -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UCard
              class="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 dark:bg-gray-800">
              <template #header>
                <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-clock" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Остаток к выплате
                </h3>
              </template>
              <div class="flex items-baseline gap-2">
                <p class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {{ formatCurrency(userData.object.leftToIssue) }}
                </p>
                <span class="text-sm text-gray-500 dark:text-gray-400">руб.</span>
              </div>
            </UCard>

            <UCard
              class="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-green-200 dark:hover:border-green-800 transition-all duration-300 dark:bg-gray-800">
              <template #header>
                <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-target" class="h-5 w-5 text-green-600 dark:text-green-400" />
                  Полный остаток
                </h3>
              </template>
              <div class="flex items-baseline gap-2">
                <p class="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {{ formatCurrency(userData.object.leftToIssueFull) }}
                </p>
                <span class="text-sm text-gray-500 dark:text-gray-400">руб.</span>
              </div>
            </UCard>
          </div>

          <!-- Статистика с пагинацией -->
          <UCard v-if="statisticsMonths.length > 0"
            class="border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-800">
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-bar-chart-3" class="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Статистика за {{ currentMonthDisplay }}
                </h2>
                <div class="flex items-center gap-2">
                  <UButton variant="soft" color="info" :disabled="currentMonthIndex === 0" @click="prevMonth"
                    class="h-8 w-8 p-0 flex items-center justify-center">
                    <UIcon name="i-lucide-chevron-left" class="h-4 w-4" />
                  </UButton>
                  <span class="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
                    {{ currentMonthIndex + 1 }} / {{ statisticsMonths.length }}
                  </span>
                  <UButton variant="soft" color="info" :disabled="currentMonthIndex === statisticsMonths.length - 1
                    " @click="nextMonth" class="h-8 w-8 p-0 flex items-center justify-center">
                    <UIcon name="i-lucide-chevron-right" class="h-4 w-4" />
                  </UButton>
                </div>
              </div>
            </template>

            <!-- Статистика -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                class="text-center p-6 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-credit-card"
                  class="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Выдано
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {{ formatCurrency(currentMonthStats.issued) }}
                </p>
              </div>
              <div
                class="text-center p-6 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-percent"
                  class="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Процент
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {{ currentMonthStats.percent }}%
                </p>
              </div>
              <div
                class="text-center p-6 border border-gray-100 dark:border-gray-600 rounded-lg hover:border-amber-200 dark:hover:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-300 group">
                <UIcon name="i-lucide-coins"
                  class="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Выплачено
                </p>
                <p class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  {{ formatCurrency(currentMonthStats.percentPaid) }}
                </p>
              </div>
            </div>

            <!-- Неоплаченные счета -->
            <div v-if="
              currentMonthStats.unpaidBills &&
              currentMonthStats.unpaidBills.length > 0
            " class="mt-6">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <UIcon name="i-lucide-file-warning" class="h-5 w-5 text-red-600 dark:text-red-400" />
                  Неоплаченные счета
                  <UBadge color="error" variant="subtle" class="ml-2">
                    {{ getUniqueBills(currentMonthStats.unpaidBills).length }}
                  </UBadge>
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    (всего: {{ currentMonthStats.unpaidBills.length }})
                  </span>
                </h3>
              </div>

              <!-- Горизонтальный список карточек -->
              <div class="relative">
                <div
                  class="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"
                  style="scrollbar-width: thin; -ms-overflow-style: none">
                  <div v-for="(bill, index) in getUniqueBills(
                    currentMonthStats.unpaidBills
                  )" :key="index"
                    class="flex-shrink-0 w-80 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4">
                    <div class="flex items-start gap-3">
                      <div class="flex-shrink-0">
                        <UIcon name="i-lucide-file-text" class="h-6 w-6 text-red-500 dark:text-red-400 mt-1" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate" :title="bill">
                          {{ formatBillTitle(bill) }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate" :title="bill">
                          {{ bill }}
                        </p>
                        <div class="flex items-center justify-between mt-3">
                          <UBadge color="error" variant="subtle" size="md" class="-ml-2">
                            Повторов:
                            {{
                              getBillCount(currentMonthStats.unpaidBills, bill)
                            }}
                          </UBadge>
                          <UButton color="neutral" variant="ghost" icon="i-lucide-copy" size="xs" class="p-1"
                            @click="copyToClipboard(bill, 'Счет скопирован')" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Ошибка или нет данных -->
        <div v-else
          class="text-center py-16 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
          <UIcon name="i-lucide-alert-circle" class="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Нет данных для отображения
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            Не удалось загрузить информацию о сотруднике
          </p>
          <UButton variant="outline"
            class="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300"
            @click="loadLKData">
            <UIcon name="i-lucide-refresh-ccw" class="h-4 w-4 mr-2" />
            Попробовать снова
          </UButton>
        </div>
      </div>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { useEmployeeStore } from "~/stores/employee-store";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "#imports";
import { nextTick } from "vue";
import { getUser } from "~/helpers/getUser";
import gsap from "gsap";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const employeeStore = useEmployeeStore();

definePageMeta({ layout: "default" });
useHead({ title: "Информация о сотруднике" });

const loading = ref(true);
const saving = ref(false);
const userData = ref<any>(null);
const editMode = ref(false);
const currentMonthIndex = ref(0);
const showSalaryInput = ref(false);
const issueSalary = ref("");

// форма расширена
const form = reactive({
  fullName: "",
  phone: "",
  email: "",
  note: "",
  roleCode: null as string | null,
  employee: {
    birthdayDate: null as string | null,
    coefficientClientLead: 0,
    coefficientDepartmentHead: 0,
    coefficientManager: 0,
    coefficientSalesManager: 0,
    department: "",
    fixedPart: 0,
    id: 0,
    note: "",
    otherPayments: 0,
    salary: 0,
  },
});

// role items для USelect
const roleItems = [
  { label: "Менеджер", value: "ROLE_MANAGER" },
  { label: "Бухгалтер", value: "ROLE_BUH" },
  { label: "Администратор", value: "ROLE_ADMIN" },
];

// Получаем id из params
const idParam = route.params.id;
const id = Number(idParam);

// === Вычисляемые свойства из UserLK ===
const statisticsMonths = computed(() => {
  return (
    Object.keys(userData.value?.object?.statistics || {})
      .sort()
      .reverse() || []
  );
});

const currentMonthDisplay = computed(() => {
  return statisticsMonths.value[currentMonthIndex.value] || "Нет данных";
});

const currentMonthStats = computed(() => {
  return userData.value?.object?.statistics?.[currentMonthDisplay.value] || {};
});

// === Методы из UserLK ===
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatPhone = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  const match = cleaned.match(/^(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (match) {
    return `+7 (${match[2]}) ${match[3]}-${match[4]}-${match[5]}`;
  }
  return phone;
};

const prevMonth = () => {
  if (currentMonthIndex.value > 0) currentMonthIndex.value--;
};

const nextMonth = () => {
  if (currentMonthIndex.value < statisticsMonths.value.length - 1)
    currentMonthIndex.value++;
};

// Методы для работы со счетами
const formatBillTitle = (bill: string) => {
  if (!bill) return "Неизвестный счет";

  // Пытаемся извлечь номер договора
  const numberMatch = bill.match(/№(\d+)/);
  const number = numberMatch ? numberMatch[1] : "без номера";

  // Пытаемся извлечь название организации
  const orgMatch = bill.match(/^([^|]+)\|/);
  const organization = orgMatch
    ? orgMatch[1].trim()
    : "Неизвестная организация";

  return `Счет №${number} - ${organization}`;
};

const getUniqueBills = (bills: string[]) => {
  return [...new Set(bills)];
};

const getBillCount = (bills: string[], bill: string) => {
  return bills.filter((b) => b === bill).length;
};

// === Методы из employee-[id] ===
const displayName = (obj: any) => obj?.fullName || obj?.name || `#${obj?.id}`;

const copyToClipboard = async (
  text: string,
  successMessage = "Скопировано!"
) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      title: successMessage,
      icon: "i-lucide-check",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Ошибка копирования",
      icon: "i-lucide-x",
      color: "error",
    });
  }
};

const copyPhone = () => {
  const raw = form.phone || userData.value?.object?.phone || "";
  if (!raw) return;
  copyToClipboard(raw, "Телефон скопирован");
};

function authHeaders(extra?: HeadersInit): HeadersInit {
  const u = getUser?.();
  const token = u?.token;
  const base: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) (base as Record<string, string>).Authorization = `Bearer ${token}`;

  return { ...base, ...(extra || {}) };
}

const paySalary = async () => {
  if (!showSalaryInput.value) {
    showSalaryInput.value = true;
    return
  }
  try {
    if (!issueSalary.value || issueSalary.value <= 0) {
      toast.add({
        title: "Введите сумму",
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      return;
    }

    const employeeId = userData.value?.object?.employee?.id;

    console.log({
      employeeId: employeeId,
      percent: true,
      salary: parseFloat(issueSalary.value)
    })

    // await employeeStore.issueSalary({
    //   employeeId: employeeId,
    //   percent: true,
    //   salary: issueSalary.value
    // })

    toast.add({
      title: "Зарплата выдана",
      color: "success",
      icon: "i-lucide-check",
    })

    showSalaryInput.value = false;
    issueSalary.value = 0

    await loadLKData();
  } catch {}
}

const loadLKData = async () => {
  try {
    loading.value = true;
    await employeeStore.fetchForLKById(id);
    userData.value = employeeStore.listForLKById;

    // Инициализируем форму из загруженных данных
    const obj = userData.value?.object || {};
    form.fullName = obj.fullName ?? obj.name ?? "";
    form.phone = obj.phone ?? "";
    form.email = obj.email ?? "";
    form.note = obj.employee?.note ?? "";
    form.roleCode = obj.role?.code ?? null;

    // employee object — аккуратно заполняем числовые поля
    form.employee = {
      birthdayDate: obj.employee?.birthdayDate ?? null,
      coefficientClientLead: Number(obj.employee?.coefficientClientLead ?? 0),
      coefficientDepartmentHead: Number(
        obj.employee?.coefficientDepartmentHead ?? 0
      ),
      coefficientManager: Number(obj.employee?.coefficientManager ?? 0),
      coefficientSalesManager: Number(
        obj.employee?.coefficientSalesManager ?? 0
      ),
      department: obj.employee?.department ?? "",
      fixedPart: Number(obj.employee?.fixedPart ?? 0),
      id: Number(obj.employee?.id ?? 0),
      note: obj.employee?.note ?? "",
      otherPayments: Number(obj.employee?.otherPayments ?? 0),
      salary: Number(obj.employee?.salary ?? 0),
    };
  } catch (e) {
    console.error(e);
    toast.add({ title: "Ошибка загрузки", color: "error" });
  } finally {
    loading.value = false;
    await nextTick();
  }
};

// Режим редактирования
const toggleEdit = () => {
  editMode.value = !editMode.value;
  if (!editMode.value) {
    // отмена — сбросить форму в значения из userData
    resetFormFromUserData();
  }
};

const cancelEdit = () => {
  editMode.value = false;
  resetFormFromUserData();
};

function resetFormFromUserData() {
  const obj = userData.value?.object || {};
  form.fullName = obj.fullName ?? obj.name ?? "";
  form.phone = obj.phone ?? "";
  form.email = obj.email ?? "";
  form.note = obj.employee?.note ?? "";
  form.roleCode = obj.role?.code ?? null;
  form.employee = {
    birthdayDate: obj.employee?.birthdayDate ?? null,
    coefficientClientLead: Number(obj.employee?.coefficientClientLead ?? 0),
    coefficientDepartmentHead: Number(
      obj.employee?.coefficientDepartmentHead ?? 0
    ),
    coefficientManager: Number(obj.employee?.coefficientManager ?? 0),
    coefficientSalesManager: Number(obj.employee?.coefficientSalesManager ?? 0),
    department: obj.employee?.department ?? "",
    fixedPart: Number(obj.employee?.fixedPart ?? 0),
    id: Number(obj.employee?.id ?? 0),
    note: obj.employee?.note ?? "",
    otherPayments: Number(obj.employee?.otherPayments ?? 0),
    salary: Number(obj.employee?.salary ?? 0),
  };
}

// Сохранение — формируем полный DTO и отправляем в store
const save = async () => {
  if (!userData.value?.object) return;

  saving.value = true;
  try {
    // Формируем DTO в соответствии со swagger'ом / UserDto
    const existing = userData.value.object;

    // Создаем маппинг кодов ролей на их ID
    const roleMapping: { [key: string]: number } = {
      'ROLE_BUH': 1,
      'ROLE_MANAGER': 2,
      'ROLE_ADMIN': 3
    };

    // Определяем объект роли
    let roleObject = null;
    if (form.roleCode) {
      roleObject = {
        code: form.roleCode,
        id: roleMapping[form.roleCode] || 0,
        name: form.roleCode === 'ROLE_BUH' ? 'Бухгалтер' : 
              form.roleCode === 'ROLE_MANAGER' ? 'Менеджер' : 
              form.roleCode === 'ROLE_ADMIN' ? 'Администратор' : 'Неизвестная роль'
      };
    }

    const payload = {
      id: existing.id,
      fullName: form.fullName || existing.fullName || existing.name || null,
      login: existing.login ?? null,
      name: existing.name ?? null,
      phone: form.phone || null,
      email: form.email || null,
      chatId: existing.chatId ?? 0,
      confirmed:
        typeof existing.confirmed === "boolean" ? existing.confirmed : true,
      confirmedNotification:
        typeof existing.confirmedNotification === "boolean"
          ? existing.confirmedNotification
          : true,
      employee: {
        // передаём обновлённые значения (числа)
        id: Number(form.employee.id ?? existing.employee?.id ?? 0),
        birthdayDate:
          form.employee.birthdayDate ?? existing.employee?.birthdayDate ?? null,
        coefficientClientLead: Number(form.employee.coefficientClientLead ?? 0),
        coefficientDepartmentHead: Number(
          form.employee.coefficientDepartmentHead ?? 0
        ),
        coefficientManager: Number(form.employee.coefficientManager ?? 0),
        coefficientSalesManager: Number(
          form.employee.coefficientSalesManager ?? 0
        ),
        department:
          form.employee.department ?? existing.employee?.department ?? "",
        fixedPart: Number(
          form.employee.fixedPart ?? existing.employee?.fixedPart ?? 0
        ),
        note: form.employee.note ?? existing.employee?.note ?? "",
        otherPayments: Number(form.employee.otherPayments ?? 0),
        salary: Number(form.employee.salary ?? 0),
      },
      role: roleObject || existing.role || null,
    };

    console.log("payload", payload);
    // Ждём выполнения запроса на сервер (store должен корректно отправлять DTO)
    await employeeStore.editEmployeeInfo(payload);

    toast.add({
      title: "Данные сохранены",
      color: "success",
      icon: "i-lucide-check",
    });

    // Обновляем данные текущей страницы и глобальный список сотрудников
    await loadLKData();
    if (typeof employeeStore.fetchAllEmployeeInfos === "function") {
      try {
        await employeeStore.fetchAllEmployeeInfos();
      } catch { }
    }

    editMode.value = false;
  } catch (err) {
    console.error("save error", err);
    toast.add({
      title: "Ошибка при сохранении",
      color: "error",
      icon: "i-lucide-x",
    });
  } finally {
    saving.value = false;
  }
};

// === Анимации из UserLK ===
const contentGroup = ref<HTMLElement | null>(null);

const animateContent = () => {
  if (!contentGroup.value) return;

  const children = contentGroup.value.querySelectorAll(
    '.u-card, [id="animated"]'
  );

  gsap.fromTo(
    children,
    {
      opacity: 0,
      x: 100,
    },
    {
      opacity: 1,
      x: 0,
      duration: 0.2,
      stagger: 0.1,
      ease: "power3.out",
    }
  );
};

watch(
  () => loading.value,
  (newVal) => {
    if (!newVal) {
      nextTick(() => {
        animateContent();
      });
    }
  }
);

onMounted(async () => {
  await loadLKData();
});
</script>
