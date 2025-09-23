export function useOtpInput(length = 4) {
  const code = ref<string[]>(Array.from({ length }, () => ""));
  const inputs = ref<any[]>([]);

  const setInputRef = (el: any, i: number) => {
    inputs.value[i] = el;
  };

  const getInputEl = (i: number) =>
    inputs.value[i]?.input ||
    inputs.value[i]?.$el?.querySelector?.("input") ||
    inputs.value[i];

  const focusIndex = (i: number) => {
    const el = getInputEl(i);
    el?.focus?.();
    el?.select?.();
  };

  const onCodeInput = (e: Event, i: number) => {
    const t = e.target as HTMLInputElement;
    const d = (t.value.match(/\d/g) || []).pop() || "";
    code.value[i] = d;
    t.value = d;
    if (d && i < length - 1) focusIndex(i + 1);
  };

  const onCodeKeydown = (e: KeyboardEvent, i: number) => {
    if (e.key === "Backspace" && !code.value[i] && i > 0) {
      e.preventDefault();
      code.value[i - 1] = "";
      focusIndex(i - 1);
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      focusIndex(i - 1);
    } else if (e.key === "ArrowRight" && i < length - 1) {
      e.preventDefault();
      focusIndex(i + 1);
    }
  };

  const onCodePaste = (e: ClipboardEvent) => {
    const digits = (e.clipboardData?.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, length)
      .split("");

    if (!digits.length) return;
    e.preventDefault();
    for (let j = 0; j < length; j++) code.value[j] = digits[j] || "";
    nextTick(() => focusIndex(Math.min(digits.length, length) - 1 || 0));
  };

  const codeValue = computed(() => code.value.join(""));

  return {
    code,
    inputs,
    setInputRef,
    focusIndex,
    onCodeInput,
    onCodeKeydown,
    onCodePaste,
    codeValue,
  };
}
