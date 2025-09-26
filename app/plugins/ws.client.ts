import { getUser } from "~/helpers/getUser";
export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server) return;

  const user = getUser();

  if (!user?.id || !user?.token) return;

  const table = 'transportAccounting';
  const userId = user.id;
  const token = user.token;

  const runtimeConfig = useRuntimeConfig();
  const wsBase = runtimeConfig.public.wsBackendURI || 'wss://kings-logix.ru';

  const url = `${wsBase}/socket/tables/${table}/${userId}?token=${encodeURIComponent(token)}`;

  let ws: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let attempts = 0;

  const listeners = new Set<(msg: any) => void>();
  const wsOnMessage = (fn: (msg: any) => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const connect = () => {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempts = 0;
        ws?.send(JSON.stringify({ type: 'subscribe', table, userId }));
        console.log('[raw-ws] connected');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          listeners.forEach((fn) => fn(payload));
        } catch (error) {
          console.error('[socket] failed to parse message', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[raw-ws] error event:', event);
      };

      ws.onclose = (event) => {
        if (event.code === 1000) return;

        const delay = Math.min(30000, 1000 * Math.pow(2, attempts++));
        reconnectTimer = window.setTimeout(connect, delay) as unknown as number;
      };
    } catch (error) {
      console.error('[raw-ws] failed to create socket:', error);
    }
  };

  connect();

  const sendJSON = (payload: any) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[raw-ws] sendJSON: socket not open');
      return;
    }

    ws.send(JSON.stringify(payload));
  };

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'client closing');
    }
  };

  const refreshSocketCredentials = () => {
    disconnect();

    const refreshedUser = getUser();

    if (!refreshedUser?.id || !refreshedUser?.token) {
      ws = null;
      return;
    }

    attempts = 0;
    ws = null;
    connect();
  };

  nuxtApp.provide('wsOnMessage', wsOnMessage);
  nuxtApp.provide('wsSend', sendJSON);
  nuxtApp.provide('wsReconnect', () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    connect();
  });
  nuxtApp.provide('wsDisconnect', disconnect);
  nuxtApp.provide('wsRefreshCredentials', refreshSocketCredentials);
});