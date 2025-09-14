export default defineEventHandler((ev) => {
    const raw = getCookie(ev, 'u')
    if (!raw) return null
    try {
        return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
            confirmed: boolean, roleCode: string | null, id: number, token: string
        }
    } catch {
        return null
    }
})