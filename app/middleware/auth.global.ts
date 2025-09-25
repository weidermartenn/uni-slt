export default defineNuxtRouteMiddleware((to) => {
  const u = useCookie<string | null>('u', { decode: v => v })

  let confirmed = false
  if (u.value) {
    try {
      const json = import.meta.server
      ? Buffer.from(u.value, 'base64').toString('utf8')
      : atob(u.value)
      confirmed = !!JSON.parse(json).confirmed
    } catch { 
        if (import.meta.client) useCookie('u').value = null
    }
  }

  if (to.path.startsWith('/auth')) {
    return confirmed ? navigateTo('/', { replace: true }) : undefined
  }
  return confirmed ? undefined : navigateTo('/auth')
})