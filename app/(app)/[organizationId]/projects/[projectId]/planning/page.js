'use client'

import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Diamond, Plus } from 'lucide-react'
import { GeistSans } from 'geist/font/sans'
import NavBar from '@/components/NavBar'
import { cn as clsx } from '@/lib/utils'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchEntreprises, fmtDate, isLotLate, todayISO } from '@/lib/data/lots'
import {
  createPlanningTask,
  daysBetween,
  deletePlanningTask,
  fetchPlanningTasks,
  isTaskLate,
  planLot,
  updatePlanningTask,
} from '@/lib/data/planning'
import Gantt, { ZOOMS } from './Gantt'
import { LotDialog, TaskDialog } from './dialogs'

export default function PlanningPage({ params }) {
  const { organizationId, projectId } = params
  const queryClient = useQueryClient()
  const { profile, isAdmin } = useUserData(organizationId)
  const { project, categories, isReady } = useProjectData()
  const canEdit = Boolean(profile && profile.role !== 'guest')
  const today = todayISO()
  const gantt = useRef(null)
  const [zoom, setZoom] = useState('semaine')
  const [taskDialog, setTaskDialog] = useState(null)
  const [lotDialog, setLotDialog] = useState(null)
  const [error, setError] = useState(null)

  const tasksQuery = useQuery({ queryKey: qk.planning(projectId), queryFn: () => fetchPlanningTasks(projectId) })
  const entreprisesQuery = useQuery({ queryKey: qk.entreprises(organizationId), queryFn: () => fetchEntreprises(organizationId) })
  const tasks = tasksQuery.data ?? []
  const lots = useMemo(() => categories.filter((c) => c.icon !== 'unassigned'), [categories])

  // ── Synthèse ──
  const summary = useMemo(() => {
    const debuts = lots.map((l) => l.date_debut_prevue).filter(Boolean).sort()
    const fins = lots.map((l) => l.date_fin_prevue).filter(Boolean).sort()
    // Avancement global pondéré par la durée prévue de chaque lot (à défaut, moyenne simple).
    let weight = 0
    let sum = 0
    for (const l of lots) {
      const w = l.date_debut_prevue && l.date_fin_prevue ? daysBetween(l.date_debut_prevue, l.date_fin_prevue) + 1 : 0
      weight += w
      sum += w * (l.avancement ?? 0)
    }
    const global = weight ? Math.round(sum / weight) : lots.length ? Math.round(lots.reduce((s, l) => s + (l.avancement ?? 0), 0) / lots.length) : 0
    const nextMilestone = tasks.filter((t) => t.type === 'jalon' && t.avancement < 100 && t.date_debut >= today).sort((a, b) => a.date_debut.localeCompare(b.date_debut))[0]
    return {
      debut: debuts[0],
      fin: fins[fins.length - 1],
      global,
      lotsLate: lots.filter((l) => isLotLate(l, today)).length,
      tasksLate: tasks.filter((t) => isTaskLate(t, today)).length,
      unplanned: lots.filter((l) => !l.date_debut_prevue || !l.date_fin_prevue).length,
      nextMilestone,
    }
  }, [lots, tasks, today])

  // ── Enregistrement (optimiste) ──
  const setTasks = (updater) => queryClient.setQueryData(qk.planning(projectId), (list = []) => updater(list))
  const fail = async (err, label) => {
    console.error(label, err)
    setError(`${label} : l'enregistrement a échoué.`)
    await queryClient.invalidateQueries({ queryKey: qk.planning(projectId) })
    await queryClient.invalidateQueries({ queryKey: qk.categories(projectId) })
    return false
  }

  const saveTask = async (fields) => {
    setError(null)
    try {
      if (fields.id) {
        const { id, ...rest } = fields
        setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...rest } : t)))
        const saved = await updatePlanningTask(id, rest)
        setTasks((list) => list.map((t) => (t.id === id ? saved : t)))
      } else {
        // Sans clé `id` : supabase-js liste les colonnes et enverrait un id nul.
        const { id: _omit, ...rest } = fields
        const ordre = tasks.filter((t) => (t.lot_id ?? null) === rest.lot_id).length
        const saved = await createPlanningTask({ ...rest, project_id: projectId, ordre })
        setTasks((list) => [...list, saved])
      }
    } catch (err) {
      return fail(err, 'Tâche')
    }
  }

  const removeTask = async (task) => {
    setTasks((list) => list.filter((t) => t.id !== task.id))
    try {
      await deletePlanningTask(task.id)
    } catch (err) {
      return fail(err, 'Suppression')
    }
  }

  const saveLot = async (lot, debut, fin) => {
    setError(null)
    queryClient.setQueryData(qk.categories(projectId), (list = []) =>
      list.map((c) => (c.id === lot.id ? { ...c, date_debut_prevue: debut, date_fin_prevue: fin } : c))
    )
    try {
      await planLot(lot.id, debut, fin)
    } catch (err) {
      return fail(err, `Lot ${lot.name}`)
    }
  }

  const loading = tasksQuery.isPending || !isReady

  return (
    <div className={clsx(GeistSans.className, 'min-h-screen bg-papier')}>
      <NavBar project={project} id={projectId} user={profile} organizationId={organizationId} isAdmin={isAdmin} />

      <div className="px-6 sm:px-8 pt-6 pb-10 max-w-[1600px] mx-auto">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Planning</h1>
            <p className="text-[13px] text-mine-clair mt-0.5">
              Prévu et réel par lot. Faites glisser une barre pour la déplacer, ses bords pour la raccourcir ou l&apos;allonger.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-[8px] bg-voile p-0.5">
              {Object.entries(ZOOMS).map(([key, z]) => (
                <button key={key} onClick={() => setZoom(key)} className={clsx('px-3 py-1.5 rounded-[6px] text-[13px] font-medium', zoom === key ? 'bg-white text-encre shadow-carte' : 'text-mine hover:text-encre')}>
                  {z.label}
                </button>
              ))}
            </div>
            <button onClick={() => gantt.current?.scrollToToday()} className="px-3 py-2 rounded-[8px] border border-filet bg-white text-[13px] font-medium text-mine hover:bg-survol">
              Aujourd&apos;hui
            </button>
            {canEdit && (
              <>
                <button onClick={() => setTaskDialog({ type: 'jalon' })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-filet bg-white text-[13px] font-medium text-mine hover:bg-survol">
                  <Diamond className="w-3.5 h-3.5" />
                  Jalon
                </button>
                <button onClick={() => setTaskDialog({ type: 'tache' })} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-encre text-white text-[14px] font-medium hover:bg-encre-survol">
                  <Plus className="w-4 h-4" />
                  Tâche
                </button>
              </>
            )}
          </div>
        </div>

        {/* Synthèse */}
        <div className="grid grid-cols-2 lg:grid-cols-5 bg-white border border-filet rounded-[12px] mb-5 shadow-carte">
          {[
            { label: 'Avancement global', value: `${summary.global} %`, hint: 'pondéré par la durée des lots' },
            { label: 'Fin prévue', value: summary.fin ? fmtDate(summary.fin) : '—', hint: summary.debut ? `début le ${fmtDate(summary.debut)}` : 'lots non planifiés' },
            { label: 'Lots en retard', value: summary.lotsLate, hint: summary.unplanned ? `${summary.unplanned} non planifié${summary.unplanned > 1 ? 's' : ''}` : 'fin prévue dépassée', alert: summary.lotsLate > 0 },
            { label: 'Tâches en retard', value: summary.tasksLate, hint: `sur ${tasks.filter((t) => t.type === 'tache').length} tâche${tasks.length > 1 ? 's' : ''}`, alert: summary.tasksLate > 0 },
            { label: 'Prochain jalon', value: summary.nextMilestone ? fmtDate(summary.nextMilestone.date_debut) : '—', hint: summary.nextMilestone?.libelle ?? 'aucun jalon à venir' },
          ].map((s, i) => (
            <div key={s.label} className={clsx('px-5 py-4 min-w-0', i > 0 && 'lg:border-l border-filet', i % 2 === 1 && 'border-l', i >= 2 && 'max-lg:border-t')}>
              <p className="text-[13px] text-mine">{s.label}</p>
              {loading ? (
                <div className="h-7 w-16 mt-1.5 rounded-[6px] bg-voile animate-pulse" />
              ) : (
                <p className={clsx('mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums', s.alert ? 'text-alerte' : 'text-encre')}>{s.value}</p>
              )}
              <p className="mt-2 text-[13px] text-mine-clair truncate">{s.hint}</p>
            </div>
          ))}
        </div>

        {error && <p className="mb-3 text-[13px] text-alerte">{error}</p>}

        {loading ? (
          <div className="h-[420px] rounded-[12px] bg-white border border-filet animate-pulse" />
        ) : (
          <>
            <Gantt
              ref={gantt}
              lots={lots}
              tasks={tasks}
              entreprises={entreprisesQuery.data ?? []}
              zoom={zoom}
              today={today}
              canEdit={canEdit}
              onTaskChange={(task, fields) => saveTask({ id: task.id, ...fields })}
              onLotChange={saveLot}
              onTaskClick={(task) => setTaskDialog(task)}
              onLotClick={(lot) => setLotDialog(lot)}
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-mine">
              <span className="inline-flex items-center gap-1.5"><span className="w-6 h-2.5 rounded-[3px] border-2 border-encre bg-white" />Lot prévu</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-6 h-2.5 rounded-[3px] bg-encre" />Avancement</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-6 h-1 rounded-full bg-valide" />Réel</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-6 h-1 rounded-full bg-alerte" />Retard</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-6 h-2.5 rounded-[3px] border border-tirage bg-tirage-pale" />Tâche</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-encre" />Jalon</span>
              <span className="inline-flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5 text-alerte" />Aujourd&apos;hui</span>
            </div>
          </>
        )}
      </div>

      <TaskDialog
        open={Boolean(taskDialog)}
        task={taskDialog}
        lots={lots}
        today={today}
        readOnly={!canEdit}
        onClose={() => setTaskDialog(null)}
        onSave={saveTask}
        onDelete={removeTask}
      />
      <LotDialog
        open={Boolean(lotDialog)}
        lot={lotDialog}
        lotHref={lotDialog ? `/${organizationId}/projects/${projectId}/categories/${lotDialog.id}` : '#'}
        readOnly={!canEdit}
        onClose={() => setLotDialog(null)}
        onSave={saveLot}
      />
    </div>
  )
}
