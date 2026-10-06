import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Pour les pages de configuration qui éditent une copie locale (catégories,
 * statuts, tags, détails, plans) : en quittant la page, les caches partagés
 * correspondants sont invalidés, donc les autres écrans relisent la version
 * enregistrée.
 *
 * @param {...Array} queryKeys une ou plusieurs clés (préfixes) à invalider
 */
export function useRefreshOnLeave(...queryKeys) {
  const queryClient = useQueryClient()
  const serialized = JSON.stringify(queryKeys)

  useEffect(() => {
    const keys = JSON.parse(serialized)
    return () => {
      for (const queryKey of keys) queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient, serialized])
}
