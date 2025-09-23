import type { FUniver } from '@univerjs/core/facade';

const univerApiRef = ref<FUniver | null>(null);

export function setUniverApi(api: FUniver) {
  univerApiRef.value = api;
}

export function useUniverApi() {
  return univerApiRef;
}