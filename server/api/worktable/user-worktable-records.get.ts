export default defineEventHandler(async (event) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    try {
        return await $fetch(`${sltApiBase}/workTable/transportAccounting/user`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getCookie(event, 'access_token')}` }
        })
    } catch (e: any) {
        throw createError({
            statusCode: e?.status || 500,
            statusMessage: e?.data?.message || 'Произошла ошибка',
            data: e?.data
        })
    }
})