<template>
  <Teleport to="body">
    <div
      v-if="isRouting"
      aria-busy="true"
      class="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm"
    >
      <div
        class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-white dark:bg-zinc-900"
      >
        <UIcon name="i-lucide-loader" class="w-5 h-5 animate-spin" />
        <span class="text-sm font-medium">Переход</span>
      </div>
    </div>
  </Teleport>
  <UApp>
    <div
      v-cloak
      class="w-full min-h-screen flex items-center justify-center p-4"
    >
      <UCard 
        :ui="{ 
          'root': 'w-sm md:w-md lg:w-lg',
          'body': 'text-black bg-zinc-100' 
        }"
        >
        <UStepper
          :ui="{
            'icon': 'text-zinc-100',
            'title': 'text-zinc-900',
            'trigger': 'bg-zinc-900',
            'separator': 'bg-zinc-900',
          }"
          color="success"
          :items="items"
          :model-value="step"
          @update:model-value="onStepChange"
        />
        <form v-if="step === 0" @submit.prevent="onSubmit">
          <span
            class="block font-semibold my-4 text-sm text-gray-600 dark:text-gray-400"
            >Для продолжения действий введите свой номер телефона. После нажатия
            кнопки "Получить" вам придет код подтверждения в
            Telegram-боте.</span
          >
          <div class="v-col">
            <span class="font-semibold">Номер телефона</span>
            <ClientOnly>
              <UInput
                :ui="{
                  'base': 'bg-zinc-100 text-zinc-900',
                }"
                size="xl"
                v-model="phone"
                icon="i-lucide-smartphone"
                v-maska="'+7 (###) ###-##-##'"
                placeholder="+7 (***) ***-**-**"
              >
              </UInput>
              <template #fallback>
                <USkeleton class="w-full h-10"></USkeleton>
              </template>
            </ClientOnly>
            <UButton 
              :ui="{ 'base': 'bg-zinc-900 text-zinc-100' }"
              class="w-full justify-center" type="submit" size="lg"
              >Получить</UButton
            >
          </div>
        </form>

        <form
          v-else-if="step === 1"
          @submit.prevent="onConfirmCode"
          class="mt-6 space-y-4"
        >
          <span
            class="block font-semibold my-4 text-sm text-gray-600 dark:text-gray-400"
            >Проверьте сообщения в Telegram. Вам отправлен 4-х значный код.
            Введите его ниже и нажмите кнопку /
            <code class="font-semibold text-white bg-zinc-500 rounded-sm p-0.5"
              >↵ Enter</code
            >
            для продолжения действий.</span
          >
          <div class="flex justify-center gap-3">
            <UInput
              v-for="(n, i) in 4"
              :key="i"
              :ref="(el: any) => setInputRef(el, i)"
              :model-value="code[i]"
              @input="onCodeInput($event, i)"
              @keydown="onCodeKeydown($event, i)"
              @paste="onCodePaste"
              size="xl"
              maxlength="1"
              inputmode="numeric"
              class="w-14"
              :ui="{ base: 'text-center font-medium text-2xl py-3 bg-zinc-100 text-zinc-900' }"
            >
            </UInput>
          </div>
          <div class="flex gap-3">
            <UButton
             :ui="{ 'base': 'flex-1 justify-center bg-zinc-900 text-zinc-100' }"
              type="submit"
              size="lg"
              :loading="isRouting"
              >Подтвердить</UButton
            >
          </div>
        </form>
      </UCard>
    </div>
  </UApp>
</template>

<script setup lang="ts">
definePageMeta({
  public: true,
});

useHead({
  title: "Авторизация",
  meta: [
    {
      name: "description",
      content: "Авторизация",
    },
  ],
});

import { vMaska } from "maska/vue";
import type { StepperItem } from "@nuxt/ui";
import { postUserLoginCode, postUserConfirmCode } from "./model/user";
import { useOtpInput } from "~/composables/useOtpInput";

const {
  code,
  inputs,
  setInputRef,
  focusIndex,
  onCodeInput,
  onCodeKeydown,
  onCodePaste,
  codeValue,
} = useOtpInput(4);

const user = useState<any | null>("user", () => null);

const step = ref(0);
const phone = ref("");
const isLoading = ref(false);
const isLoadingInput = ref(true);
const clearPhone = ref("");
const isRouting = ref(false);

watch(phone, () => {
  clearPhone.value = phone.value.replace(/\D/g, "");
});

const canGoNext = computed(() => clearPhone.value.length === 11);
const toast = useToast();

const onStepChange = (val: string | number | undefined) => {
  const next = Number(val ?? 0);
  if (val === 1 && !canGoNext.value) return;
  step.value = next;
};

const items = ref<StepperItem[]>([
  { title: "1", icon: "i-lucide-smartphone", value: 0 },
  { title: "2", icon: "i-lucide-check-check", value: 1 },
]);

// Шаг 1
const onSubmit = async () => {
  if (!canGoNext.value) {
    toast.add({
      title: "Номер некорректен",
      color: "error",
      description: "Проверьте вводимые данные",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  try {
    isLoading.value = true;
    const res: any = await postUserLoginCode(clearPhone.value);
    if (res?.operationResult !== "OK") {
      toast.add({
        title: "Не удалось отправить код",
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
    }
    step.value = 1;
    await nextTick();
    toast.add({
      title: "Код отправлен",
      color: "info",
      description: "Проверьте сообщения в Telegram-боте",
      icon: "i-lucide-send",
    });
  } catch (e: any) {
    toast.add({
      title: "Ошибка",
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    isLoading.value = false;
  }
};

const onConfirmCode = async () => {
  if (codeValue.value.length !== 4) {
    toast.add({
      title: "Введите 4 цифры кода",
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
    return;
  }

  const res: any = await postUserConfirmCode(clearPhone.value, codeValue.value);
  if (res?.operationResult === "OK") {
    user.value = res.object?.user || null;
    
    try { await $fetch('/api/authorization/me') } catch {}

    const confirmed = !!res?.object?.user?.confirmed

    isRouting.value = true

    try {
      return await navigateTo(confirmed ? "/" : "/auth", { replace: true });
    } finally {
      isRouting.value = false;
    }
  }
};

onMounted(() => {
  step.value = 0;
  isLoadingInput.value = false;
});

watch(step, (val) => {
  if (val === 1) nextTick(() => focusIndex(0));
});
</script>
