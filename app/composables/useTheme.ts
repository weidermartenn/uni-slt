import { useUniverApi } from '~/composables/useUniverApi'

// Use system preference as a sensible default
const prefersDark = usePreferredDark()

// Persisted boolean flag in localStorage under a stable key
// Will be SSR-safe thanks to @vueuse/nuxt
const darkTheme = useLocalStorage<boolean>('theme-dark', prefersDark.value)

// Backward compatibility: migrate old string key 'theme' ("dark"|"light") if present
try {
  if (typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('theme')
    if (legacy === 'dark' || legacy === 'light') {
      darkTheme.value = legacy === 'dark'
      // Keep legacy key for now (in case other code reads it), but also keep new boolean key
      // If you want to clean up: localStorage.removeItem('theme')
    }
  }
} catch {}

export function useTheme() {
  const univerApi = useUniverApi()

  // Apply side effects when theme changes and on first run
  watch(
    darkTheme,
    async (isDark) => {
      // Sync Univer dark mode if available
      univerApi.value?.toggleDarkMode?.(isDark)

      // Swap header styles A1:AB1 between hdr (light) and hdrDark (dark)
      try {
        const { withHeaderUnlocked } = await import('~/helpers/univer-protect')
        await withHeaderUnlocked(univerApi.value!, async () => {
          const wb = univerApi.value?.getActiveWorkbook?.()
          const sheets = wb?.getSheets?.() || []
          for (const s of sheets as any[]) {
            for (let col = 0; col < 28; col++) {
              s.getRange(0, col)?.setValue?.({ s: isDark ? 'hdrDark' : 'hdr' })
            }
          }
        })
      } catch {}

      // Apply document classes for instant visual theme
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', isDark)
        document.body.classList.toggle('bg-zinc-900', isDark)
        document.body.classList.toggle('bg-white', !isDark)
      }

      // Maintain legacy string key for other readers (optional)
      try {
        localStorage.setItem('theme', isDark ? 'dark' : 'light')
      } catch {}
    },
    { immediate: true }
  )

  return { darkTheme }
}