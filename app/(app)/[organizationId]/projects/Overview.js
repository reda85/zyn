'use client'

import clsx from 'clsx'
import { MapPin, AlarmClock, CheckCircle2, Camera } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n)

const TONES = {
  bleu: { chip: 'bg-tirage-pale text-tirage', value: 'text-encre' },
  rouge: { chip: 'bg-alerte-pale text-alerte', value: 'text-alerte' },
  vert: { chip: 'bg-valide-pale text-valide', value: 'text-encre' },
  ambre: { chip: 'bg-ambre-pale text-[#b77400]', value: 'text-encre' },
}

/** Indicateurs de l'écran Projets : quatre tuiles en couleur et l'activité sur fond nuit. */
export function Bandeau({ overview, loading }) {
  const o = overview
  const total = o ? o.open + Object.values(o.byProject).reduce((s, p) => s + p.closed, 0) : 0
  const cells = [
    { label: 'Réserves ouvertes', value: o?.open, hint: o ? `sur ${fmt(total)} au total` : null, icon: MapPin, tone: 'bleu' },
    { label: 'En retard', value: o?.overdue, hint: 'échéance dépassée', icon: AlarmClock, tone: o?.overdue > 0 ? 'rouge' : 'bleu' },
    { label: 'Levées en 30 jours', value: o?.closed30, hint: o ? `${fmt(o.created30)} créées sur la période` : null, icon: CheckCircle2, tone: 'vert' },
    { label: 'Photos cette semaine', value: o?.photos7, hint: '7 derniers jours', icon: Camera, tone: 'ambre' },
  ]
  return (
    <section aria-label="Vue d'ensemble" className="grid grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)] gap-3 mb-8">
      {cells.map((c) => {
        const Icon = c.icon
        const tone = TONES[c.tone]
        return (
          <div key={c.label} className="bg-white border border-filet rounded-[10px] p-4 min-w-0 shadow-[0_1px_2px_rgba(11,15,23,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-mine truncate">{c.label}</p>
              <span className={clsx('h-7 w-7 rounded-[8px] flex items-center justify-center shrink-0', tone.chip)}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
            </div>
            {loading ? (
              <div className="h-8 w-16 mt-2 rounded-[4px] bg-voile animate-pulse" />
            ) : (
              <p className={clsx('mt-1.5 text-[30px] leading-none font-semibold tabular-nums tracking-[-0.03em]', tone.value)}>
                {fmt(c.value ?? 0)}
              </p>
            )}
            <p className="mt-2 text-[12px] text-mine-clair truncate">{loading ? '\u00a0' : c.hint}</p>
          </div>
        )
      })}
      <div className="col-span-2 lg:col-span-1 bg-nuit text-white rounded-[10px] p-4 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] font-medium text-white">Activité sur 12 semaines</p>
          <p className="flex items-center gap-3 text-[11px] text-nuit-texte">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-tirage" />créées</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-[#3ccf86]" />levées</span>
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
    <div className="mt-4 h-[64px] flex items-end gap-[5px]" role="img" aria-label="Réserves créées et levées par semaine">
      {loading
        ? Array.from({ length: 12 }, (_, i) => <div key={i} className="flex-1 h-4 bg-nuit-2 animate-pulse rounded-[2px]" />)
        : weeks.map((w, i) => (
            <div key={i} title={label(w)} className="flex-1 h-full flex items-end gap-[2px]">
              <div className="flex-1 rounded-t-[2px] bg-tirage" style={{ height: `${Math.max(w.created ? 5 : 2, (w.created / max) * 100)}%` }} />
              <div className="flex-1 rounded-t-[2px] bg-[#3ccf86]" style={{ height: `${Math.max(w.closed ? 5 : 2, (w.closed / max) * 100)}%` }} />
            </div>
          ))}
    </div>
  )
}

/** Répartition des réserves par statut, dans les couleurs choisies pour le projet. */
export function StatusBar({ stats, className }) {
  const total = stats?.statuses?.reduce((s, x) => s + x.count, 0) ?? 0
  if (!total) return <div className={clsx('h-2 rounded-full bg-voile', className)} />
  const title = stats.statuses.filter((s) => s.count).map((s) => `${s.name} : ${s.count}`).join(', ')
  return (
    <div className={clsx('h-2 rounded-full bg-voile overflow-hidden flex gap-[2px]', className)} title={title} role="img" aria-label={title}>
      {stats.statuses.map((s) =>
        s.count ? <div key={s.id} style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color || 'var(--zs-trait)' }} /> : null
      )}
    </div>
  )
}

/** Légende compacte des statuts d'un projet, avec leurs effectifs. */
export function StatusLegend({ stats }) {
  if (!stats?.statuses?.length) return null
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-mine">
      {stats.statuses.filter((s) => s.count).map((s) => (
        <li key={s.id} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || 'var(--zs-trait)' }} />
          {s.name}
          <span className="text-mine-clair tabular-nums">{s.count}</span>
        </li>
      ))}
    </ul>
  )
}

export const percentClosed = (stats) => (stats?.total ? Math.round((stats.closed / stats.total) * 100) : null)
