<template>
  <UModal
    v-model:open="isOpen"
    title="Добавить сотрудника"
    description="Заполните основные данные сотрудника"
    :closable="!saving"
  >
    <UButton 
        icon="i-lucide-user-plus" 
        variant="soft" 
        color="success"
    >
        Добавить сотрудника
    </UButton>
    <template #body>
      <UCard class="p-4">
        <!-- Основные данные -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
          <UInput
            v-model="form.fullName"
            placeholder="ФИО"
            :error="errors.fullName"
          />
          <UInput
            v-model="form.login"
            placeholder="Логин (Telegram)"
            :error="errors.login"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
          <UInput
            v-model="form.phone"
            placeholder="Номер телефона"
          />
          <UInput
            v-model="form.email"
            placeholder="Электронная почта"
            type="email"
          />
        </div>

        <!-- Роль и статус -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <!-- заменено USelectMenu -> USelect -->
          <USelect
            v-model="form.roleCode"
            :items="roleOptions"
            placeholder="Роль"
            class="min-w-[160px] mb-2"
            clearable
          />
        </div>

        <!-- Employee: финансовые и отдел -->
        <UCard class="p-3 bg-gray-50">
          <div class="text-sm font-medium mb-2">Параметры оплаты</div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="v-col gap-1">
                <span class="text-xs">Оклад</span>
                <UInput
                  v-model.number="form.employee.salary"
                  type="number"
                  placeholder="Оклад"
                  min="0"
                />
            </div>
            <div class="v-col gap-1">
                <span class="text-xs">Другие выплаты</span>
                <UInput
                  v-model.number="form.employee.otherPayments"
                  type="number"
                  placeholder="Другие выплаты"
                  min="0"
                />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mt-2">
            <div class="v-col gap-1">
                <span class="text-xs">Лид %</span>
                <UInput
                  v-model.number="form.employee.coefficientClientLead"
                  type="number"
                  placeholder="Лид %"
                  min="0"
                />
            </div>
            <div class="v-col gap-1">
                <span class="text-xs">Отдел %</span>
                <UInput
                  v-model.number="form.employee.coefficientDepartmentHead"
                  placeholder="Отдел %"
                  type="number"
                  min="0"
                />
            </div>
            <div class="v-col gap-1">
                <span class="text-xs">Менеджер %</span>
                <UInput
                  v-model.number="form.employee.coefficientManager"
                  placeholder="Менеджер %"
                  type="number"
                  min="0"
                />
            </div>
            <div class="v-col gap-1">
                <span class="text-xs">Продажи %</span>
                <UInput
                  v-model.number="form.employee.coefficientSalesManager"
                  placeholder="Продажи %"
                  type="number"
                  min="0"
                />
            </div>
          </div>

          <UInput
            v-model="form.employee.department"
            placeholder="Отдел"
            class="mt-3"
          />

          <UInput
            v-model="form.employee.note"
            placeholder="Примечание"
            class="mt-2"
          />
        </UCard>
      </UCard>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-sm text-gray-500">
          <span v-if="saving">Сохраняем...</span>
          <span v-else>Проверьте данные перед сохранением</span>
        </div>

        <div class="flex items-center gap-2">
          <UButton variant="ghost" color="secondary" @click="onCancel" :disabled="saving">Отмена</UButton>
          <UButton color="success" :loading="saving" @click="onSubmit">Добавить</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue';
import { useEmployeeStore } from '~/stores/employee-store';
import { useToast } from '#imports';

const props = defineProps({
  open: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open']);

const isOpen = ref(!!props.open);
watch(() => props.open, (v) => { isOpen.value = !!v; });
watch(isOpen, (v) => emit('update:open', v));

const aeiStore = useEmployeeStore();
const toast = useToast();

const saving = ref(false);

const defaultEmployee = () => ({
  birthdayDate: null,
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
});

const form = reactive({
  atiId: 0,
  chatId: 0,
  confirmToken: '',
  confirmed: true,
  confirmedNotification: true,
  driver: null,
  email: '',
  employee: defaultEmployee(),
  errorConfirm: false,
  fullName: '',
  login: '',
  name: '',
  password: '',
  phone: '',
  roleCode: null as string | null,
});

// роли: Менеджер, Бухгалтер, Администратор (в указанном порядке)
const roleOptions = [
  { label: 'Менеджер', value: 'ROLE_MANAGER' },
  { label: 'Бухгалтер', value: 'ROLE_BUH' },
  { label: 'Администратор', value: 'ROLE_ADMIN' },
];

const errors = reactive({
  fullName: '',
  login: '',
});

function resetForm() {
  form.fullName = '';
  form.login = '';
  form.name = '';
  form.password = '';
  form.phone = '';
  form.email = '';
  form.confirmed = true;
  form.confirmedNotification = true;
  form.employee = defaultEmployee();
  form.roleCode = null;
  errors.fullName = '';
  errors.login = '';
}

function validate() {
  let ok = true;
  errors.fullName = '';
  errors.login = '';

  if (!form.fullName || String(form.fullName).trim().length < 2) {
    errors.fullName = 'Введите корректное ФИО';
    ok = false;
  }
  if (!form.login || String(form.login).trim().length < 2) {
    errors.login = 'Нужен логин';
    ok = false;
  }

  return ok;
}

async function onSubmit() {
  if (!validate()) {
    toast.add({ title: 'Ошибка формы', description: 'Проверьте поля', color: 'warning' });
    return;
  }

  saving.value = true;
  try {
    const payload: any = {
      atiId: form.atiId || 0,
      chatId: form.chatId || 0,
      confirmToken: form.confirmToken || null,
      confirmed: !!form.confirmed,
      confirmedNotification: !!form.confirmedNotification,
      driver: null,
      email: form.email || null,
      employee: {
        birthdayDate: form.employee.birthdayDate || null,
        coefficientClientLead: Number(form.employee.coefficientClientLead) || 0,
        coefficientDepartmentHead: Number(form.employee.coefficientDepartmentHead) || 0,
        coefficientManager: Number(form.employee.coefficientManager) || 0,
        coefficientSalesManager: Number(form.employee.coefficientSalesManager) || 0,
        department: form.employee.department || '',
        fixedPart: Number(form.employee.fixedPart) || 0,
        note: form.employee.note || '',
        otherPayments: Number(form.employee.otherPayments) || 0,
        salary: Number(form.employee.salary) || 0,
      },
      errorConfirm: !!form.errorConfirm,
      fullName: form.fullName,
      login: form.login,
      name: form.name || '',
      password: form.password || null,
      phone: form.phone || null,
      role: form.roleCode ? { code: form.roleCode } : null,
    };

    // вызываем метод стора — убедитесь что addEmployee реализован в store
    await aeiStore.addEmployee(payload);

    toast.add({ title: 'Сотрудник добавлен', color: 'success', icon: 'i-lucide-check' });

    isOpen.value = false;
    resetForm();
  } catch (err: any) {
    console.error('addEmployee error', err);
    const msg = err?.data?.message ?? err?.message ?? 'Не удалось добавить сотрудника';
    toast.add({ title: 'Ошибка', description: msg, color: 'error', icon: 'i-lucide-x' });
  } finally {
    saving.value = false;
  }
}

function onCancel() {
  if (saving.value) return;
  isOpen.value = false;
  resetForm();
}
</script>

<style scoped>
/* небольшой тонкий стиль, если понадобится */
</style>
