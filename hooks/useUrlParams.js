import { useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Lecture/écriture des paramètres d'URL sans aller-retour serveur
 * (`history.replaceState`, que `useSearchParams` suit depuis Next 14.1).
 *
 * `setParams({ plan: 'abc', from: null })` : une valeur vide supprime la clé.
 */
export function useUrlParams() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const setParams = useCallback(
    (patch) => {
      const next = new URLSearchParams(window.location.search)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === '') next.delete(key)
        else next.set(key, String(value))
      }
      const query = next.toString()
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname)
    },
    [pathname]
  )

  return [searchParams, setParams]
}
