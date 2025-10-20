// initUniverInWorker.ts
import { createUniver, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';

export async function initUniverInWorker() {
  const { univer, univerAPI } = createUniver({
    locale: LocaleType.EN_US,
    presets: [
      UniverSheetsCorePreset({
        container: '', // ⬅️ обязательный параметр даже в воркере
      }),
    ],
  })

  // ✅ сохраняем именно univerAPI
  ;(globalThis as any).univerInstance = univerAPI

  console.log('[Worker] Univer initialized (FUniver)')
}
