import { useCallback, useMemo } from 'react'
import { useAtom } from 'jotai'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { selectedPinIdAtom } from '@/store/atoms'
import { qk } from '@/lib/data/keys'
import { fetchPin, fetchPlanPins, fetchProjectPinsPage } from '@/lib/data/pins'
import { useUserData } from './useUserData'

/** Ce qui, chez l'utilisateur courant, change le résultat d'une requête de pins. */
export function usePinScope() {
  const { profile } = useUserData()
  const profileId = profile?.id ?? null
  const isGuest = profile?.role === 'guest'
  return useMemo(() => ({ profileId, isGuest }), [profileId, isGuest])
}

/** Tous les pins d'un plan. */
export function usePlanPins(planId) {
  const scope = usePinScope()
  return useQuery({
    queryKey: qk.planPins(planId, scope),
    queryFn: () => fetchPlanPins({ planId, scope }),
    enabled: Boolean(planId && scope.profileId),
  })
}

/** Liste paginée des tâches d'un projet, filtrée côté serveur. */
export function useProjectPins(projectId, filters) {
  const scope = usePinScope()
  const query = useInfiniteQuery({
    queryKey: qk.projectPins(projectId, scope, filters),
    queryFn: ({ pageParam }) => fetchProjectPinsPage({ projectId, filters, scope, cursor: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(projectId && scope.profileId),
    placeholderData: keepPreviousData,
  })

  const pins = useMemo(() => query.data?.pages.flatMap((p) => p.rows) ?? [], [query.data])
  const total = query.data?.pages[0]?.count ?? null

  return { ...query, pins, total, scope }
}

// ── Écriture dans le cache ────────────────────────────────────────────────────

// Une liste de pins en cache est soit un tableau (plan), soit des pages (projet).
function mapPinLists(data, fn) {
  if (!data) return data
  if (Array.isArray(data)) return fn(data)
  if (Array.isArray(data.pages)) {
    return { ...data, pages: data.pages.map((page) => ({ ...page, rows: fn(page.rows) })) }
  }
  return data
}

/**
 * Point d'entrée unique pour répercuter une modification de pin dans tous les
 * caches (listes par plan, listes par projet, pin ouvert). Remplace les
 * `setPins(pins.map(...))` + `setSelectedPin({...})` dispersés.
 */
export function usePinsCache() {
  const queryClient = useQueryClient()

  const patchPin = useCallback(
    (pinId, patch) => {
      const apply = (pin) => ({ ...pin, ...(typeof patch === 'function' ? patch(pin) : patch) })
      queryClient.setQueriesData({ queryKey: qk.pinsRoot }, (data) =>
        mapPinLists(data, (rows) => rows.map((p) => (p.id === pinId ? apply(p) : p)))
      )
      queryClient.setQueryData(qk.pin(pinId), (pin) => (pin ? apply(pin) : pin))
    },
    [queryClient]
  )

  const removePin = useCallback(
    (pinId) => {
      queryClient.setQueriesData({ queryKey: qk.pinsRoot }, (data) =>
        mapPinLists(data, (rows) => rows.filter((p) => p.id !== pinId))
      )
      queryClient.removeQueries({ queryKey: qk.pin(pinId) })
    },
    [queryClient]
  )

  /** Ajoute un pin créé : visible tout de suite sur son plan, listes paginées rechargées. */
  const addPin = useCallback(
    (pin) => {
      queryClient.setQueryData(qk.pin(pin.id), pin)
      if (pin.plan_id) {
        queryClient.setQueriesData({ queryKey: ['pins', 'plan', pin.plan_id] }, (rows) =>
          Array.isArray(rows) && !rows.some((p) => p.id === pin.id) ? [...rows, pin] : rows
        )
      }
      queryClient.invalidateQueries({ queryKey: ['pins', 'project', pin.project_id] })
    },
    [queryClient]
  )

  const invalidatePins = useCallback(
    () => queryClient.invalidateQueries({ queryKey: qk.pinsRoot }),
    [queryClient]
  )

  return { patchPin, removePin, addPin, invalidatePins }
}

// ── Pin sélectionné ───────────────────────────────────────────────────────────

/**
 * `[pin, selectPin]` : le pin ouvert dans le tiroir.
 * L'atom ne garde que l'identifiant ; l'objet vient du cache, donc une
 * modification faite ailleurs s'y reflète sans copie à synchroniser.
 *
 * `selectPin(pin | id | null)`.
 */
export function useSelectedPin() {
  const [selectedPinId, setSelectedPinId] = useAtom(selectedPinIdAtom)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: qk.pin(selectedPinId),
    queryFn: () => fetchPin(selectedPinId),
    enabled: Boolean(selectedPinId),
    staleTime: 60_000,
  })

  const selectPin = useCallback(
    (pin) => {
      if (!pin) return setSelectedPinId(null)
      if (typeof pin === 'object') {
        // Amorce le cache avec la ligne déjà connue : le tiroir s'ouvre sans attendre.
        queryClient.setQueryData(qk.pin(pin.id), (known) => ({ ...(known ?? {}), ...pin }))
        return setSelectedPinId(pin.id)
      }
      setSelectedPinId(pin)
    },
    [queryClient, setSelectedPinId]
  )

  return [selectedPinId ? data ?? null : null, selectPin]
}
