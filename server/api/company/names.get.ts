export default defineEventHandler(async (ev) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    try {
        return await $fetch(`${sltApiBase}/company/nameList`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getCookie(ev, 'access_token')}` }
        })
    } catch (e: any) {
        throw createError({ statusCode: e.response.status })
    }
})