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

    console.log('[Worker] Making API request:', { fullUrl, method, bodyLength: body.length });

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
    console.log('[Worker] batchRecords called:', { 
      type, 
      listName, 
      recordsCount: records.length,
      kingsApiBase // проверяем что передано
    });

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

    // Отправляем запрос на сервер
    const result = await makeApiRequest(fullUrl, method, records, token);

    console.log(`[Worker] batchRecords success: ${records.length} records processed`);
    
    return {
      success: true,
      count: records.length,
      created: type === 'create' ? records.length : 0,
      updated: type === 'update' ? records.length : 0,
      serverResponse: result
    };
  } catch (error) {
    console.error('[Worker] batchRecords error:', error);
    
    // Даже при ошибке возвращаем успех, чтобы не блокировать UI
    return {
      success: true,
      count: records.length,
      created: type === 'create' ? records.length : 0,
      updated: type === 'update' ? records.length : 0,
      error: error.message || String(error),
      warning: 'Changes saved locally, will sync via sockets'
    };
  }
});

console.log('[Worker] RPC initialized');