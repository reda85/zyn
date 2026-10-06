import { useCallback, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { EMPTY_FILTERS, parseFilters, writeFilters } from '@/lib/data/pinFilters'

/**
 * Filtres de pins, stockés dans l'URL (`?q=…&status=…&cat=…`).
 * Ils survivent au rafraîchissement et un lien peut pointer vers une vue filtrée.
 *
 * `setFilters(patch | (filters) => patch)` fusionne puis réécrit l'URL avec
 * `history.replaceState` : pas d'aller-retour serveur, `useSearchParams` suit.
 */
export function usePinFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // La chaîne sert de dépendance : l'objet `filters` reste stable tant que
  // l'URL ne change pas, et peut donc entrer tel quel dans une clé de cache.
  const serialized = searchParams.toString()
  const filters = useMemo(() => parseFilters(new URLSearchParams(serialized)), [serialized])

  const setFilters = useCallback(
    (patch) => {
      const current = parseFilters(new URLSearchParams(window.location.search))
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) }
      const params = writeFilters(new URLSearchParams(window.location.search), next)
      const query = params.toString()
      const url = query ? `${pathname}?${query}` : pathname
      if (url !== window.location.pathname + window.location.search) {
        window.history.replaceState(null, '', url)
      }
    },
    [pathname]
  )

  const resetFilters = useCallback(() => setFilters({ ...EMPTY_FILTERS }), [setFilters])

  return { filters, setFilters, resetFilters }
}
