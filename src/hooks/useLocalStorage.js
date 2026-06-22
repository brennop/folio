import { useCallback, useEffect, useState } from 'react'

/**
 * Drop-in replacement for useState that persists to localStorage.
 * SSR-safe: initializes with `initialValue` on the server (and on first
 * client render to avoid hydration mismatch), then hydrates from
 * localStorage in a useEffect.
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 * setTheme('dark')
 * setTheme(prev => prev === 'dark' ? 'light' : 'dark') // functional updates work too
 */
export function useLocalStorage(key, initialValue) {
  // Always start with initialValue — keeps server and first client render in sync,
  // avoiding Next.js hydration warnings.
  const [storedValue, setStoredValue] = useState(initialValue)

  // After mount, hydrate from localStorage (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) {
        setStoredValue(JSON.parse(raw))
      }
    } catch (err) {
      console.warn(`useLocalStorage: failed to read key "${key}"`, err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const setValue = useCallback(
    (value) => {
      try {
        setStoredValue((prev) => {
          const next = value instanceof Function ? value(prev) : value

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(next))
          }

          return next
        })
      } catch (err) {
        console.warn(`useLocalStorage: failed to write key "${key}"`, err)
      }
    },
    [key],
  )

  return [storedValue, setValue]
}
