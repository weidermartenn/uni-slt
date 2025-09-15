export default defineEventHandler(async (ev) => {
    const { public: { sltApiBase } } = useRuntimeConfig()

    try {
        return await $fetch(`${sltApiBase}/employee/nameList`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${getCookie(ev, 'access_token')}` }
        })
    } catch (e) {
        console.error(e)
    }
})