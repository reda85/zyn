'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn as clsx } from '@/lib/utils'
import { categoriesIcons } from '@/utils/categories'
import { fmtDate, isLotLate } from '@/lib/data/lots'
import { addDays, daysBetween, fromDay, isTaskLate, isoWeek, mondayOf, summarizeTasks, toDay } from '@/lib/data/planning'

export const ZOOMS = {
  jour: { label: 'Jours', px: 30 },
  semaine: { label: 'Semaines', px: 13 },
  mois: { label: 'Mois', px: 4.5 },
}

const ROW_H = 40
const LEFT_W = 320
const HEADER_H = 52
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/**
 * Diagramme de Gantt : une ligne par lot (prévu, réel, avancement) puis ses
 * tâches et jalons, et ses sous-lots (synthèse de leurs tâches) suivis des leurs. Les barres se déplacent et s'étirent au glisser ; un clic
 * sans déplacement ouvre l'édition.
 */
const Gantt = forwardRef(function Gantt(
  { lots, sousLots = [], tasks, entreprises, zoom, today, canEdit, onTaskChange, onLotChange, onTaskClick, onLotClick, onSousLotClick },
  ref
) {
  const px = ZOOMS[zoom].px
  const scroller = useRef(null)
  const [collapsed, setCollapsed] = useState(() => new Set())
  const [drag, setDrag] = useState(null) // { id, kind, mode, x0, debut, fin, dx }

  // ── Étendue ──
  const range = useMemo(() => {
    const dates = [today]
    for (const l of lots) for (const k of ['date_debut_prevue', 'date_fin_prevue', 'date_debut_reelle', 'date_fin_reelle']) l[k] && dates.push(l[k])
    for (const t of tasks) dates.push(t.date_debut, t.date_fin)
    dates.sort()
    const start = mondayOf(addDays(dates[0], -7))
    const end = addDays(dates[dates.length - 1], zoom === 'mois' ? 60 : 28)
    return { start, days: Math.max(daysBetween(start, end), zoom === 'mois' ? 180 : 70) }
  }, [lots, tasks, today, zoom])

  const x = (iso) => daysBetween(range.start, iso) * px
  const width = range.days * px

  // Ouverture centrée sur aujourd'hui, et à chaque changement d'échelle.
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = Math.max(0, x(today) - (el.clientWidth - LEFT_W) / 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  useImperativeHandle(ref, () => ({
    scrollToToday() {
      const el = scroller.current
      if (el) el.scrollTo({ left: Math.max(0, x(today) - (el.clientWidth - LEFT_W) / 3), behavior: 'smooth' })
    },
  }))

  // ── Lignes ──
  const rows = useMemo(() => {
    const out = []
    const general = tasks.filter((t) => !t.lot_id || !lots.some((l) => l.id === t.lot_id))
    if (general.length) {
      out.push({ kind: 'group', id: 'general', title: 'Généralités' })
      if (!collapsed.has('general')) general.forEach((t) => out.push({ kind: 'task', task: t }))
    }
    for (const lot of lots) {
      const lotTasks = tasks.filter((t) => t.lot_id === lot.id)
      const subs = sousLots.filter((sl) => sl.lot_id === lot.id)
      const inSub = (t) => t.type === 'tache' && subs.some((sl) => sl.id === t.sous_lot_id)
      out.push({ kind: 'lot', id: lot.id, lot, count: lotTasks.length + subs.length })
      if (collapsed.has(lot.id)) continue
      lotTasks.filter((t) => !inSub(t)).forEach((t) => out.push({ kind: 'task', task: t }))
      for (const sl of subs) {
        const slTasks = lotTasks.filter((t) => t.type === 'tache' && t.sous_lot_id === sl.id)
        out.push({ kind: 'sous_lot', id: sl.id, sousLot: sl, count: slTasks.length, summary: summarizeTasks(slTasks) })
        if (!collapsed.has(sl.id)) slTasks.forEach((t) => out.push({ kind: 'task', task: t, nested: true }))
      }
    }
    return out
  }, [lots, sousLots, tasks, collapsed])

  const toggle = (id) => setCollapsed((s) => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  // ── Glisser ──
  const begin = (e, item, kind, mode) => {
    if (!canEdit || e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const debut = kind === 'lot' ? item.date_debut_prevue : item.date_debut
    const fin = kind === 'lot' ? item.date_fin_prevue : item.date_fin
    setDrag({ id: item.id, kind, mode, x0: e.clientX, debut, fin, dx: 0, item })
  }
  const move = (e) => drag && setDrag((d) => ({ ...d, dx: Math.round((e.clientX - d.x0) / px) }))
  const end = (e) => {
    if (!drag) return
    const { kind, mode, dx, item } = drag
    const moved = Math.abs(e.clientX - drag.x0) > 3
    setDrag(null)
    if (!moved) return kind === 'lot' ? onLotClick(item) : onTaskClick(item)
    if (!dx) return
    const next = preview(drag)
    if (kind === 'lot') onLotChange(item, next.debut, next.fin)
    else onTaskChange(item, { date_debut: next.debut, date_fin: next.fin })
  }

  const preview = (d) => {
    if (!d || !d.dx) return { debut: d?.debut, fin: d?.fin }
    if (d.mode === 'move') return { debut: addDays(d.debut, d.dx), fin: addDays(d.fin, d.dx) }
    if (d.mode === 'start') {
      const debut = addDays(d.debut, d.dx)
      return { debut: debut > d.fin ? d.fin : debut, fin: d.fin }
    }
    const fin = addDays(d.fin, d.dx)
    return { debut: d.debut, fin: fin < d.debut ? d.debut : fin }
  }
  const datesOf = (kind, item) => {
    if (drag && drag.id === item.id && drag.kind === kind) return preview(drag)
    return kind === 'lot' ? { debut: item.date_debut_prevue, fin: item.date_fin_prevue } : { debut: item.date_debut, fin: item.date_fin }
  }

  // ── En-tête ──
  const header = useMemo(() => {
    const months = []
    const ticks = []
    const startDay = toDay(range.start)
    for (let i = 0; i < range.days; i++) {
      const iso = fromDay(startDay + i)
      const [y, m, d] = iso.split('-').map(Number)
      if (d === 1 || i === 0) months.push({ i, label: `${MONTHS[m - 1]} ${y}` })
      const weekday = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7
      if (zoom === 'jour') ticks.push({ i, label: String(d), weekend: weekday >= 5, monday: weekday === 0 })
      else if (weekday === 0) ticks.push({ i, label: zoom === 'semaine' ? `S${isoWeek(iso)}` : '', monday: true })
    }
    return { months, ticks }
  }, [range, zoom])

  const grid = (
    <div className="absolute inset-0 pointer-events-none">
      {header.ticks.map((t) =>
        t.weekend ? (
          <div key={`w${t.i}`} className="absolute top-0 bottom-0 bg-papier" style={{ left: t.i * px, width: px }} />
        ) : t.monday ? (
          <div key={`m${t.i}`} className="absolute top-0 bottom-0 border-l border-voile" style={{ left: t.i * px }} />
        ) : null
      )}
      {header.months.map((m) => (
        <div key={`mo${m.i}`} className="absolute top-0 bottom-0 border-l border-filet" style={{ left: m.i * px }} />
      ))}
    </div>
  )

  const todayX = x(today)

  return (
    <div
      ref={scroller}
      className="relative overflow-auto rounded-[12px] border border-filet bg-white shadow-carte max-h-[calc(100vh-220px)] select-none"
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => setDrag(null)}
    >
      <div style={{ width: LEFT_W + width }} className="relative">
        {/* En-tête collant */}
        <div className="sticky top-0 z-20 flex bg-white border-b border-filet" style={{ height: HEADER_H }}>
          <div className="sticky left-0 z-10 bg-white border-r border-filet flex items-end px-4 pb-2 text-[12px] font-medium text-mine" style={{ width: LEFT_W, minWidth: LEFT_W }}>
            Lot / tâche
          </div>
          <div className="relative" style={{ width }}>
            {header.months.map((m, idx) => {
              const next = header.months[idx + 1]?.i ?? range.days
              return (
                <div key={m.i} className="absolute top-0 h-6 border-l border-filet px-2 text-[12px] font-medium text-encre whitespace-nowrap overflow-hidden flex items-center" style={{ left: m.i * px, width: (next - m.i) * px }}>
                  {(next - m.i) * px > 48 ? m.label : ''}
                </div>
              )
            })}
            {header.ticks.map((t) =>
              t.label ? (
                <div key={t.i} className={clsx('absolute top-6 h-[26px] flex items-center text-[11px] tabular-nums', t.weekend ? 'text-trait' : 'text-mine-clair', zoom === 'jour' ? 'justify-center' : 'pl-1 border-l border-voile')} style={{ left: t.i * px, width: zoom === 'jour' ? px : 7 * px }}>
                  {t.label}
                </div>
              ) : null
            )}
            <div className="absolute top-6 bottom-0 w-0.5 bg-alerte" style={{ left: todayX }} />
          </div>
        </div>

        {/* Lignes */}
        {rows.map((row) => {
          if (row.kind === 'group') {
            return (
              <div key={row.id} className="flex border-b border-voile bg-survol" style={{ height: ROW_H }}>
                <button onClick={() => toggle(row.id)} className="sticky left-0 z-10 bg-survol flex items-center gap-2 px-3 border-r border-filet text-left" style={{ width: LEFT_W, minWidth: LEFT_W }}>
                  {collapsed.has(row.id) ? <ChevronRight className="w-4 h-4 text-mine-clair" /> : <ChevronDown className="w-4 h-4 text-mine-clair" />}
                  <span className="text-[13px] font-medium text-encre">{row.title}</span>
                </button>
                <div className="relative" style={{ width }}>{grid}</div>
              </div>
            )
          }

          if (row.kind === 'lot') {
            const lot = row.lot
            const { debut, fin } = datesOf('lot', lot)
            const late = isLotLate(lot, today)
            const realStart = lot.date_debut_reelle
            const realEnd = lot.date_fin_reelle ?? (realStart && realStart <= today ? today : null)
            const realLate = realEnd && lot.date_fin_prevue && realEnd > lot.date_fin_prevue
            const entreprise = entreprises.find((e) => e.id === lot.entreprise_id)
            return (
              <div key={lot.id} className="flex border-b border-voile bg-survol" style={{ height: ROW_H + 8 }}>
                <div className="sticky left-0 z-10 bg-survol flex items-center gap-2 pl-3 pr-3 border-r border-filet" style={{ width: LEFT_W, minWidth: LEFT_W }}>
                  <button onClick={() => toggle(lot.id)} className={clsx('p-0.5 rounded hover:bg-voile', !row.count && 'invisible')} aria-label={collapsed.has(lot.id) ? 'Déplier' : 'Replier'}>
                    {collapsed.has(lot.id) ? <ChevronRight className="w-4 h-4 text-mine-clair" /> : <ChevronDown className="w-4 h-4 text-mine-clair" />}
                  </button>
                  <span className="w-6 h-6 rounded-[6px] bg-white border border-filet flex items-center justify-center flex-shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-encre">
                    {categoriesIcons[lot.icon] ?? categoriesIcons.folder}
                  </span>
                  <button onClick={() => onLotClick(lot)} className="min-w-0 flex-1 text-left">
                    <p className="text-[13px] font-medium text-encre truncate">{lot.name}</p>
                    <p className="text-[11px] text-mine-clair truncate">{entreprise?.name ?? 'Sans entreprise'}</p>
                  </button>
                  <span className={clsx('text-[12px] font-medium tabular-nums', late ? 'text-alerte' : 'text-mine')}>{lot.avancement ?? 0} %</span>
                </div>
                <div className="relative" style={{ width }}>
                  {grid}
                  {debut && fin ? (
                    <Bar
                      left={x(debut)}
                      width={(daysBetween(debut, fin) + 1) * px}
                      top={9}
                      height={16}
                      progress={lot.avancement ?? 0}
                      className={clsx('border-2', late ? 'border-alerte bg-alerte-pale' : 'border-encre bg-white')}
                      fillClassName={late ? 'bg-alerte opacity-60' : 'bg-encre'}
                      canEdit={canEdit}
                      title={`${lot.name} · prévu du ${fmtDate(debut)} au ${fmtDate(fin)} · ${lot.avancement ?? 0} %`}
                      onPointerDown={(e, mode) => begin(e, lot, 'lot', mode)}
                      label={drag?.id === lot.id ? `${fmtDate(debut)} → ${fmtDate(fin)}` : null}
                    />
                  ) : (
                    <button onClick={() => onLotClick(lot)} className="absolute top-3 text-[12px] text-mine-clair hover:text-encre underline-offset-2 hover:underline" style={{ left: Math.max(8, todayX + 8) }}>
                      Lot non planifié
                    </button>
                  )}
                  {realStart && realEnd && (
                    <div
                      className={clsx('absolute h-[5px] rounded-full', realLate ? 'bg-alerte' : 'bg-valide')}
                      style={{ left: x(realStart), width: Math.max(px, (daysBetween(realStart, realEnd) + 1) * px), top: 31 }}
                      title={`Réel : ${fmtDate(realStart)} → ${lot.date_fin_reelle ? fmtDate(lot.date_fin_reelle) : "en cours"}`}
                    />
                  )}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-alerte opacity-60" style={{ left: todayX }} />
                </div>
              </div>
            )
          }

          if (row.kind === 'sous_lot') {
            const sl = row.sousLot
            const sum = row.summary
            const late = sum && sum.fin < today && sum.avancement < 100
            return (
              <div key={sl.id} className="flex border-b border-voile" style={{ height: ROW_H }}>
                <div className="sticky left-0 z-10 bg-white flex items-center gap-1.5 pl-[34px] pr-3 border-r border-filet" style={{ width: LEFT_W, minWidth: LEFT_W }}>
                  <button onClick={() => toggle(sl.id)} className={clsx('p-0.5 rounded hover:bg-voile', !row.count && 'invisible')} aria-label={collapsed.has(sl.id) ? 'Déplier' : 'Replier'}>
                    {collapsed.has(sl.id) ? <ChevronRight className="w-3.5 h-3.5 text-mine-clair" /> : <ChevronDown className="w-3.5 h-3.5 text-mine-clair" />}
                  </button>
                  <button onClick={() => onSousLotClick?.(sl)} className="min-w-0 flex-1 text-left">
                    <span className={clsx('block text-[13px] font-medium truncate', late ? 'text-alerte' : 'text-encre')}>{sl.name}</span>
                  </button>
                  <span className="text-[12px] font-medium text-mine tabular-nums">{sum ? `${sum.avancement} %` : '—'}</span>
                </div>
                <div className="relative" style={{ width }}>
                  {grid}
                  {sum ? (
                    <div
                      className="absolute"
                      style={{ left: x(sum.debut), width: Math.max((daysBetween(sum.debut, sum.fin) + 1) * px, 6), top: 14, height: 12 }}
                      title={`${sl.name} · du ${fmtDate(sum.debut)} au ${fmtDate(sum.fin)} · ${sum.avancement} %`}
                    >
                      <div className={clsx('absolute inset-x-0 top-0 h-[7px] rounded-[2px] overflow-hidden', late ? 'bg-alerte-pale' : 'bg-voile')}>
                        <div className={clsx('h-full', late ? 'bg-alerte opacity-70' : 'bg-mine')} style={{ width: `${sum.avancement}%` }} />
                      </div>
                      <span className={clsx('absolute left-0 top-0 w-[3px] h-[12px] rounded-b-[1px]', late ? 'bg-alerte' : 'bg-mine')} />
                      <span className={clsx('absolute right-0 top-0 w-[3px] h-[12px] rounded-b-[1px]', late ? 'bg-alerte' : 'bg-mine')} />
                    </div>
                  ) : (
                    <span className="absolute top-3 text-[12px] text-mine-clair" style={{ left: Math.max(8, todayX + 8) }}>Aucune tâche planifiée</span>
                  )}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-alerte opacity-60" style={{ left: todayX }} />
                </div>
              </div>
            )
          }

          const t = row.task
          const { debut, fin } = datesOf('task', t)
          const late = isTaskLate(t, today)
          return (
            <div key={t.id} className="flex border-b border-voile" style={{ height: ROW_H }}>
              <button onClick={() => onTaskClick(t)} className={clsx('sticky left-0 z-10 bg-white hover:bg-survol flex items-center gap-2 pr-3 border-r border-filet text-left', row.nested ? 'pl-[58px]' : 'pl-[40px]')} style={{ width: LEFT_W, minWidth: LEFT_W }}>
                {t.type === 'jalon' ? <span className="w-2 h-2 rotate-45 bg-encre flex-shrink-0" /> : <span className="text-[11px] text-mine-clair tabular-nums w-6 flex-shrink-0" title="N° de la tâche">{t.pin_number}</span>}
                <span className={clsx('text-[13px] truncate flex-1', late ? 'text-alerte' : 'text-encre')}>{t.libelle}</span>
                {t.type === 'tache' && <span className="text-[12px] text-mine-clair tabular-nums">{t.avancement} %</span>}
              </button>
              <div className="relative" style={{ width }}>
                {grid}
                {t.type === 'jalon' ? (
                  <div
                    onPointerDown={(e) => begin(e, t, 'task', 'move')}
                    className={clsx('absolute w-3.5 h-3.5 rotate-45 border-2', canEdit && 'cursor-grab active:cursor-grabbing', t.avancement >= 100 ? 'bg-valide border-valide' : late ? 'bg-alerte border-alerte' : 'bg-encre border-encre')}
                    style={{ left: x(debut) + px / 2 - 7, top: ROW_H / 2 - 7 }}
                    title={`${t.libelle} · ${fmtDate(debut)}`}
                  />
                ) : (
                  <Bar
                    left={x(debut)}
                    width={(daysBetween(debut, fin) + 1) * px}
                    top={11}
                    height={18}
                    progress={t.avancement}
                    className={clsx('border', late ? 'border-alerte bg-alerte-pale' : 'border-tirage bg-tirage-pale')}
                    fillClassName={late ? 'bg-alerte opacity-60' : 'bg-tirage'}
                    canEdit={canEdit}
                    title={`${t.libelle} · ${fmtDate(debut)} → ${fmtDate(fin)} · ${t.avancement} %`}
                    onPointerDown={(e, mode) => begin(e, t, 'task', mode)}
                    label={drag?.id === t.id ? `${fmtDate(debut)} → ${fmtDate(fin)}` : null}
                  />
                )}
                {t.type === 'jalon' && (
                  <span className="absolute text-[12px] text-mine whitespace-nowrap" style={{ left: x(debut) + px / 2 + 12, top: ROW_H / 2 - 9 }}>{t.libelle}</span>
                )}
                <div className="absolute top-0 bottom-0 w-0.5 bg-alerte opacity-60" style={{ left: todayX }} />
              </div>
            </div>
          )
        })}

        {rows.length === 0 && (
          <div className="flex" style={{ height: 120 }}>
            <div className="sticky left-0 bg-white border-r border-filet" style={{ width: LEFT_W, minWidth: LEFT_W }} />
            <div className="flex-1 flex items-center px-6 text-[14px] text-mine-clair">Aucun lot sur ce projet.</div>
          </div>
        )}
      </div>
    </div>
  )
})

export default Gantt

function Bar({ left, width, top, height, progress, className, fillClassName, canEdit, title, onPointerDown, label }) {
  return (
    <div
      className={clsx('absolute rounded-[5px] overflow-hidden group', canEdit && 'cursor-grab active:cursor-grabbing', className)}
      style={{ left, width: Math.max(width, 6), top, height }}
      title={title}
      onPointerDown={(e) => onPointerDown(e, 'move')}
    >
      <div className={clsx('absolute inset-y-0 left-0', fillClassName)} style={{ width: `${progress}%` }} />
      {canEdit && (
        <>
          <span onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'start') }} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/10" />
          <span onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'end') }} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 bg-black/10" />
        </>
      )}
      {label && (
        <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 px-1.5 rounded bg-encre text-white text-[11px] whitespace-nowrap tabular-nums">{label}</span>
      )}
    </div>
  )
}
