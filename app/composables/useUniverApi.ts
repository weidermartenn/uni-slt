import type { FUniver } from '@univerjs/presets';
import { ref } from 'vue';

const univerApiRef = ref<FUniver | null>(null);

export function setUniverApi(api: FUniver) {
  univerApiRef.value = api;
}

export function useUniverApi() {
  return univerApiRef;
}