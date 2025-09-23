export default defineNuxtRouteMiddleware(async (to) => {
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const me = await $fetch<{ confirmed?: boolean } | null>('/api/authorization/me', { headers })
    const confirmed = me?.confirmed

    if (to.path.startsWith('/auth')) {
        if (confirmed && to.path !== '/') return navigateTo('/')
        return
    }

    if (!confirmed && to.path !== '/auth') {
        return navigateTo('/auth')
    }
})