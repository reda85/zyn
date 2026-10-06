import dayjs from 'dayjs'

// ── Modèle de filtres ─────────────────────────────────────────────────────────
// Une seule définition, sérialisée dans l'URL, appliquée soit dans la requête
// (liste des tâches, paginée) soit en mémoire (vue plan, où tous les pins sont
// nécessaires pour la carte).

export const EMPTY_FILTERS = Object.freeze({
  q: '',
  me: false,
  overdue: false,
  archived: false,
  categories: [], // ids
  statuses: [], // ids
  tags: [], // ids
  plans: [], // ids
  dates: [], // 'today' | 'week' | 'month' | 'YYYY-MM-DD..YYYY-MM-DD'
  assignee: null, // id de membre | 'unassigned'
})

const LIST_KEYS = { categories: 'cat', statuses: 'status', tags: 'tag', plans: 'plan', dates: 'date' }
const FLAG_KEYS = { me: 'me', overdue: 'overdue', archived: 'archived' }

export function parseFilters(searchParams) {
  const get = (k) => searchParams?.get?.(k) ?? null
  const filters = { ...EMPTY_FILTERS, q: get('q') ?? '', assignee: get('assignee') || null }
  for (const [field, param] of Object.entries(FLAG_KEYS)) filters[field] = get(param) === '1'
  for (const [field, param] of Object.entries(LIST_KEYS)) {
    const raw = get(param)
    filters[field] = raw ? raw.split(',').filter(Boolean) : []
  }
  return filters
}

/** Applique `filters` sur une copie de `searchParams` (les autres paramètres sont conservés). */
export function writeFilters(searchParams, filters) {
  const next = new URLSearchParams(searchParams?.toString?.() ?? '')
  const set = (k, v) => (v ? next.set(k, v) : next.delete(k))
  set('q', filters.q?.trim() || '')
  set('assignee', filters.assignee || '')
  for (const [field, param] of Object.entries(FLAG_KEYS)) set(param, filters[field] ? '1' : '')
  for (const [field, param] of Object.entries(LIST_KEYS)) set(param, (filters[field] ?? []).join(','))
  return next
}

export function countActiveFilters(filters) {
  return (
    Number(filters.me) +
    Number(filters.overdue) +
    Number(filters.archived) +
    Number(Boolean(filters.assignee)) +
    Object.keys(LIST_KEYS).filter((field) => filters[field]?.length > 0).length
  )
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export const DATE_PRESETS = {
  today: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois-ci',
}

export function dateTokenLabel(token) {
  if (DATE_PRESETS[token]) return DATE_PRESETS[token]
  const [from, to] = token.split('..')
  const fmt = (d) => dayjs(d).format('DD/MM/YYYY')
  return to && to !== from ? `${fmt(from)} - ${fmt(to)}` : fmt(from)
}

export function dateRangeToken(start, end) {
  const from = dayjs(start).format('YYYY-MM-DD')
  const to = dayjs(end ?? start).format('YYYY-MM-DD')
  return `${from}..${to}`
}

/** Bornes [from, to) d'un jeton de date ; `to` nul = pas de borne haute. */
export function dateTokenBounds(token, now = dayjs()) {
  if (token === 'today') return { from: now.startOf('day'), to: null }
  if (token === 'week') return { from: now.startOf('week'), to: null }
  if (token === 'month') return { from: now.startOf('month'), to: null }
  const [from, to] = token.split('..')
  const start = dayjs(from)
  const end = dayjs(to || from)
  if (!start.isValid() || !end.isValid()) return null
  return { from: start.startOf('day'), to: end.add(1, 'day').startOf('day') }
}

// ── Application côté serveur (PostgREST) ──────────────────────────────────────

// Caractères qui ont un sens dans un motif `ilike` ou dans la syntaxe de filtre.
const escapeLike = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * @param query   requête supabase sur `pdf_pins`
 * @param filters filtres normalisés
 * @param ctx     { profileId, isGuest }
 *
 * Le filtre par tag s'appuie sur l'alias `tag_filter:pin_tags!inner(tag_id)`
 * que `pinSelect({ filterByTag: true })` ajoute au select.
 */
export function applyPinFilters(query, filters, ctx = {}) {
  let q = query

  if (ctx.isGuest && ctx.profileId) q = q.eq('assigned_to', ctx.profileId)

  if (!filters.archived) q = q.not('isArchived', 'is', true)
  if (filters.me && ctx.profileId) q = q.eq('created_by', ctx.profileId)
  if (filters.categories.length) q = q.in('category_id', filters.categories)
  if (filters.statuses.length) q = q.in('status_id', filters.statuses)
  if (filters.plans.length) q = q.in('plan_id', filters.plans)
  if (filters.tags.length) q = q.in('tag_filter.tag_id', filters.tags)
  if (filters.overdue) q = q.lt('due_date', dayjs().startOf('day').toISOString())

  if (filters.assignee === 'unassigned') q = q.is('assigned_to', null)
  else if (filters.assignee) q = q.eq('assigned_to', filters.assignee)

  if (filters.dates.length) {
    const clauses = filters.dates
      .map((token) => dateTokenBounds(token))
      .filter(Boolean)
      .map(({ from, to }) =>
        // Guillemets obligatoires : les dates ISO contiennent « : » et « . »,
        // caractères réservés de la syntaxe de filtre PostgREST.
        to
          ? `and(created_at.gte."${from.toISOString()}",created_at.lt."${to.toISOString()}")`
          : `created_at.gte."${from.toISOString()}"`
      )
    if (clauses.length) q = q.or(clauses.join(','))
  }

  const search = filters.q?.trim()
  if (search) q = q.ilike('name', `%${escapeLike(search)}%`)

  return q
}

// ── Application en mémoire (vue plan) ─────────────────────────────────────────

export function matchesPinFilters(pin, filters, ctx = {}) {
  if (!filters.archived && pin.isArchived) return false
  if (filters.me && pin.created_by !== ctx.profileId) return false
  if (filters.categories.length && !filters.categories.includes(pin.category_id)) return false
  if (filters.statuses.length && !filters.statuses.includes(pin.status_id)) return false
  if (filters.plans.length && !filters.plans.includes(pin.plan_id)) return false

  if (filters.tags.length) {
    const pinTagIds = (pin.pin_tags ?? []).map((pt) => pt.tag_id ?? pt.tags?.id)
    if (!filters.tags.some((id) => pinTagIds.includes(id))) return false
  }

  if (filters.overdue) {
    if (!pin.due_date || !dayjs(pin.due_date).isBefore(dayjs(), 'day')) return false
  }

  const assigneeId = pin.assigned_to?.id ?? null
  if (filters.assignee === 'unassigned' && assigneeId) return false
  if (filters.assignee && filters.assignee !== 'unassigned' && assigneeId !== filters.assignee) return false

  if (filters.dates.length) {
    const created = dayjs(pin.created_at)
    const inAny = filters.dates.some((token) => {
      const bounds = dateTokenBounds(token)
      if (!bounds) return false
      return !created.isBefore(bounds.from) && (!bounds.to || created.isBefore(bounds.to))
    })
    if (!inAny) return false
  }

  const search = filters.q?.trim().toLowerCase()
  if (search && !(pin.name || '').toLowerCase().includes(search)) return false

  return true
}
