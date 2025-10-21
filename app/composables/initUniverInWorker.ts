// initUniverInWorker.ts
export async function initUniverInWorker() {
  // Простая заглушка - Univer не нужен в воркере
  console.log('[Worker] Univer disabled - using API-only mode');
  return null;
}