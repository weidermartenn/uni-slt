import { RPCServer } from "~/utils/rpc";

const rpc = new RPCServer();

// Функция для отправки запросов к API
async function makeApiRequest(fullUrl: string, method: string, body: any, token?: string) {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Worker] API request failed:', error);
    throw error;
  }
}

rpc.register('batchRecords', async ({ type, listName, records, token, kingsApiBase }) => {
  try {

    if (!records || !Array.isArray(records) || records.length === 0) {
      return { success: false, error: 'No records provided' };
    }

    // Проверяем что kingsApiBase передан
    if (!kingsApiBase) {
      console.error('[Worker] kingsApiBase is undefined!');
      throw new Error('kingsApiBase is required but was undefined');
    }

    // Используем эндпоинты из sheet-store-optimized.ts
    const endpoint = "/workTable/transportAccounting";
    const fullUrl = `${kingsApiBase}${endpoint}`;
    const method = type === 'create' ? 'POST' : 'PATCH';

    try {
      // Отправляем запрос на сервер
      const result = await makeApiRequest(fullUrl, method, records, token);

      return {
        success: true,
        count: records.length,
        created: type === 'create' ? records.length : 0,
        updated: type === 'update' ? records.length : 0,
        serverResponse: result
      };
    } catch (e: any) {
      console.error('[Worker] API error:', e);

      // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Не пытаемся автоматически пересоздать
      if (e.message.includes('Batch update returned unexpected row count')
        || e.message.includes('Объект не найден')) {

        return {
          success: false,
          error: 'SYNC_CONFLICT',
          message: 'Data was modified by another user. Please refresh and try again.',
          code: 'CONFLICT'
        };
      }

      // Для других ошибок также возвращаем false
      return {
        success: false,
        error: e.message || String(e),
        code: 'SERVER_ERROR'
      };
    }
  } catch (error: any) {
    console.error('[Worker] Unexpected error in batchRecords: ', error)
    // Даже при ошибке возвращаем успех, чтобы не блокировать UI
    return {
      success: false,
      error: error.message || String(error),
      code: 'UNKNOWN_ERROR'
    };
  }
});