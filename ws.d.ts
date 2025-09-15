// Type augmentations for Nuxt app injections (WebSocket helpers)
// Ensures `$wsOnMessage` and others are typed as callable

export {};

declare module '#app' {
  interface NuxtApp {
    /** Subscribe to raw WS messages; returns unsubscribe function */
    $wsOnMessage: (fn: (msg: any) => void) => () => void;
    /** Send a JSON payload through the socket */
    $wsSend: (payload: any) => void;
    /** Force reconnect (closes and reopens) */
    $wsReconnect: () => void;
    /** Gracefully disconnect */
    $wsDisconnect: () => void;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $wsOnMessage: (fn: (msg: any) => void) => () => void;
    $wsSend: (payload: any) => void;
    $wsReconnect: () => void;
    $wsDisconnect: () => void;
  }
}