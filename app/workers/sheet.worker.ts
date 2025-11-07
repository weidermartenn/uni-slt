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
    if (!records?.length) {
      return { success: false, error: 'No records provided' };
    }

    if (!kingsApiBase) {
      return { success: false, error: 'kingsApiBase is required' };
    }

    const endpoint = "/workTable/transportAccounting";
    const fullUrl = `${kingsApiBase}${endpoint}`;
    const method = type === 'create' ? 'POST' : 'PATCH';

    const response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(records),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: errorText,
        code: response.status === 409 ? 'CONFLICT' : 'SERVER_ERROR'
      };
    }

    const result = await response.json();
    
    return {
      success: true,
      serverResponse: result,
      createdRecords: type === 'create' ? result.object : undefined
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      code: 'NETWORK_ERROR'
    };
  }
});