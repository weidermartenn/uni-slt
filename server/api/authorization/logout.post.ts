export default defineEventHandler((ev) => {
    deleteCookie(ev, 'access_token', { path: '/'})
    deleteCookie(ev, 'u', { path: '/' })
    return { ok: true }
})