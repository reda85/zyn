'use client'

import clsx from 'clsx'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)

/** Bandeau d'indicateurs : une carte, des cellules séparées par des filets. */
export function Bandeau({ overview, loading }) {
  const o = overview
  const total = o ? o.open + Object.values(o.byProject).reduce((s, p) => s + p.closed, 0) : 0
  const cells = [
    { label: 'Réserves ouvertes', value: o?.open, hint: o ? `sur ${fmt(total)} au total` : null },
    {
      label: 'En retard',
      value: o?.overdue,
      hint: 'échéance dépassée',
      alert: o?.overdue > 0,
    },
    { label: 'Levées en 30 jours', value: o?.closed30, hint: o ? `${fmt(o.created30)} créées sur la période` : null },
    { label: 'Photos cette semaine', value: o?.photos7, hint: '7 derniers jours' },
  ]
  return (
    <section
      aria-label="Vue d'ensemble"
      className="grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.7fr)] bg-white border border-filet rounded-[6px] mb-8"
    >
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={clsx(
            'px-5 py-4 min-w-0',
            i % 2 === 1 && 'border-l border-filet lg:border-l',
            i >= 2 && 'border-t lg:border-t-0 border-filet',
            i >= 1 && 'lg:border-l'
          )}
        >
          <p className="text-[12px] text-mine">{c.label}</p>
          {loading ? (
            <div className="h-7 w-14 mt-1.5 rounded-[3px] bg-voile animate-pulse" />
          ) : (
            <p className={clsx('mt-1 text-[26px] leading-none font-semibold tabular-nums tracking-[-0.02em]', c.alert ? 'text-alerte' : 'text-encre')}>
              {fmt(c.value ?? 0)}
            </p>
          )}
          <p className="mt-2 text-[12px] text-mine-clair truncate">{loading ? ' ' : c.hint}</p>
        </div>
      ))}
      <div className="col-span-2 lg:col-span-1 px-5 py-4 border-t lg:border-t-0 lg:border-l border-filet min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] text-mine">Activité sur 12 semaines</p>
          <p className="flex items-center gap-3 text-[11px] text-mine-clair">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-filet-fort" />créées</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-tirage" />levées</span>
          </p>
        </div>
        <ActivityChart weeks={o?.weeks ?? []} loading={loading} />
      </div>
    </section>
  )
}

function ActivityChart({ weeks, loading }) {
  const max = Math.max(1, ...weeks.map((w) => Math.max(w.created, w.closed)))
  const label = (w) =>
    `Semaine du ${new Date(w.start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} : ${w.created} créées, ${w.closed} levées`
  return (
    <div className="mt-3 h-[58px] flex items-end gap-[5px]" role="img" aria-label="Réserves créées et levées par semaine">
      {loading
        ? Array.from({ length: 12 }, (_, i) => <div key={i} className="flex-1 h-4 bg-voile animate-pulse" />)
        : weeks.map((w, i) => (
            <div key={i} title={label(w)} className="flex-1 h-full flex items-end gap-[2px]">
              <div className="flex-1 bg-filet-fort" style={{ height: `${Math.max(w.created ? 4 : 1, (w.created / max) * 100)}%` }} />
              <div className="flex-1 bg-tirage" style={{ height: `${Math.max(w.closed ? 4 : 1, (w.closed / max) * 100)}%` }} />
            </div>
          ))}
    </div>
  )
}

/**
 * Part des réserves levées, en bleu de tirage. Le détail par statut (dans les
 * couleurs du projet) reste disponible au survol.
 */
export function StatusBar({ stats, className }) {
  const total = stats?.total ?? 0
  const title = stats?.statuses?.filter((s) => s.count).map((s) => `${s.name} : ${s.count}`).join(', ') || 'Aucune réserve'
  const pct = total ? (stats.closed / total) * 100 : 0
  return (
    <div className={clsx('h-1 rounded-full bg-voile overflow-hidden', className)} title={title} role="img" aria-label={title}>
      <div className="h-full bg-tirage rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

export const percentClosed = (stats) => (stats?.total ? Math.round((stats.closed / stats.total) * 100) : null)
