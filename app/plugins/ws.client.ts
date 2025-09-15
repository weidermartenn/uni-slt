export default defineNuxtPlugin(async (nuxtApp) => {
  // узнаём пользователя/токен
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
  const me: any = await $fetch('/api/auth/me', { headers }).catch(() => null);

  const table  = 'transportAccounting';
  const userId = me?.id
  const token  = me?.token

  // финальный raw WS URL
  const url = `wss://kings-logix.ru/socket/tables/${table}/${userId}?token=${encodeURIComponent(token)}`;

  // отладка
//   console.log('[raw-ws] url:', url);
//   console.log('[raw-ws] userId:', userId);
//   console.log('[raw-ws] token:', token ? '(present)' : '(empty)');

  let ws: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let attempts = 0;

  const listeners = new Set<(msg:any)=>void>();
  const wsOnMessage = (fn: (msg: any) => void) => { 
    listeners.add(fn); 
    return () => listeners.delete(fn);
  };

  const connect = () => {
    // безопасность: не создаём второй сокет поверх
    if (ws && ws.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        attempts = 0;
        ws!.send(JSON.stringify({ type: 'subscribe', table, userId }));
        console.log('[raw-ws] ✅ open');
      };

      ws.onmessage = (ev) => {
        // если payload — JSON, можно парсить:
        console.log('[socket] получено сообщение', ev.data)
        try {
          const payload = JSON.parse(ev.data);
          listeners.forEach(fn => fn(payload))
        } catch (error) {
          console.error('[socket] ошибка парсинга', error)
        }
      };

      ws.onerror = (ev) => {
        // браузер маскирует детали — но сам факт ошибки виден
        console.error('[raw-ws] ❌ error event:', ev);
      };

      ws.onclose = (e) => {
        console.warn('[raw-ws] ⚠️ close:', { code: e.code, reason: e.reason, wasClean: e.wasClean });
        // автопереподключение (не делаем при штатном закрытии 1000)
        if (e.code !== 1000) {
          const delay = Math.min(30000, 1000 * Math.pow(2, attempts++)); // 1s,2s,4s,... cap 30s
          reconnectTimer = window.setTimeout(connect, delay) as unknown as number;
          console.log('[raw-ws] reconnect in', delay, 'ms');
        }
      };
    } catch (err) {
      console.error('[raw-ws] ❌ create failed:', err);
    }
  };

  // старт
  connect();

  // удобные хелперы
  const sendJSON = (payload: any) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[raw-ws] sendJSON: socket not open');
      return;
    }
    ws.send(JSON.stringify(payload));
  };

  const disconnect = () => {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'client closing'); // штатно
    }
  };

  // прокидываем в Nuxt
  nuxtApp.provide('wsOnMessage', wsOnMessage);
  nuxtApp.provide('wsSend', sendJSON);
  nuxtApp.provide('wsReconnect', () => { if (reconnectTimer) clearTimeout(reconnectTimer); connect(); });
  nuxtApp.provide('wsDisconnect', disconnect);
});