'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { IconPicker } from '@/components/IconPicker'
import { Button } from '@/components/ui/button'
import { Trash2, Plus, Layers, GripVertical, ArrowLeft, ChevronRight, Building2 } from 'lucide-react'
import { supabase } from '@/utils/supabase/client'
import { useProjectData } from '@/providers/ProjectProvider'
import { useRefreshOnLeave } from '@/hooks/useRefreshOnLeave'
import { qk } from '@/lib/data/keys'
import { fetchLotPins, fetchLots, fmtPeriod, isLotLate, lotStats } from '@/lib/data/lots'
import { useParams, useRouter } from 'next/navigation'
import { GeistSans } from 'geist/font/sans'
import clsx from 'clsx'

// StrictMode wrapper for Droppable
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(animation)
      setEnabled(false)
    }
  }, [])

  if (!enabled) {
    return null
  }

  return <Droppable {...props}>{children}</Droppable>
}

export default function ProjectLots() {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const { organizationId, projectId } = useParams()
  useRefreshOnLeave(qk.categories(projectId), qk.pinsRoot, qk.lotPins(projectId))
  const router = useRouter()

  useEffect(() => {
    if (!projectId) return
    fetchLots(projectId)
      .then(setLots)
      .catch((error) => console.error('Error fetching lots:', error))
      .finally(() => setLoading(false))
  }, [projectId])

  // Réserves par lot (ouvertes, en retard) et statuts du projet.
  const pinsQuery = useQuery({ queryKey: qk.lotPins(projectId), queryFn: () => fetchLotPins(projectId), enabled: Boolean(projectId) })
  const { statuses, isReady } = useProjectData()
  const stats = useMemo(
    () => (pinsQuery.data && isReady ? lotStats(pinsQuery.data, statuses) : null),
    [pinsQuery.data, statuses, isReady]
  )

  const handleDragEnd = async (result) => {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const reordered = Array.from(lots)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((lot, index) => ({ ...lot, order: index }))
    setLots(updated)

    try {
      await Promise.all(
        updated.map((lot) => supabase.from('categories').update({ order: lot.order }).eq('id', lot.id))
      )
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleNameChange = (index, name) => {
    const updated = [...lots]
    updated[index] = { ...updated[index], name }
    setLots(updated)
  }

  const handleIconChange = (index, icon) => {
    const updated = [...lots]
    updated[index] = { ...updated[index], icon }
    setLots(updated)
  }

  const handleSaveLot = async (lot) => {
    try {
      await supabase.from('categories').update({ name: lot.name, icon: lot.icon }).eq('id', lot.id)
    } catch (error) {
      console.error('Error saving lot:', error)
    }
  }

  const handleAddLot = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ project_id: projectId, name: 'Nouveau lot', icon: 'folder', order: lots.length }])
        .select('*, entreprises(id,name,corps_etat)')
        .single()

      if (data) setLots((prev) => [...prev, data])
      if (error) console.error('Error adding lot:', error)
    } catch (error) {
      console.error('Error adding lot:', error)
    }
  }

  const handleDeleteLot = async (lot) => {
    const count = stats?.[lot.id]?.total ?? 0
    if (count && !confirm(`Le lot « ${lot.name} » contient ${count} réserve${count > 1 ? 's' : ''}. Le supprimer quand même ?`)) return
    try {
      const { error } = await supabase.from('categories').delete().eq('id', lot.id)
      if (error) throw error
      setLots((prev) => prev.filter((c) => c.id !== lot.id))
    } catch (error) {
      console.error('Error deleting lot:', error)
      alert('Suppression impossible.')
    }
  }

  if (loading) {
    return (
      <div className={clsx("flex h-screen w-full items-center justify-center bg-papier", GeistSans.className)}>
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 bg-encre rounded-[8px] flex items-center justify-center animate-pulse">
              <span className="text-white font-medium text-xl">z</span>
            </div>
          </div>
          <h2 className="text-[17px] font-medium text-encre mb-2">Chargement...</h2>
          <p className="text-[14px] text-mine-clair">Veuillez patienter</p>
        </div>
      </div>
    )
  }

  const lotHref = (lot) => `/${organizationId}/projects/${projectId}/categories/${lot.id}`

  return (
    <div className={clsx("min-h-screen bg-papier", GeistSans.className)}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre mb-2">Lots</h1>
              <p className="text-[14px] text-mine leading-relaxed max-w-2xl">
                Chaque lot regroupe ses réserves et porte son entreprise, ses dates et son avancement.
                Faites glisser les lots pour fixer leur ordre dans l&apos;application.
              </p>
            </div>
            <Link
              href={`/${organizationId}/entreprises`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-filet text-mine rounded-[8px] text-[14px] font-medium hover:bg-survol transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Annuaire des entreprises
            </Link>
          </div>
        </div>

        {lots.length === 0 ? (
          <div className="bg-white border border-filet rounded-[12px] p-12 text-center shadow-carte">
            <Layers className="w-12 h-12 text-filet-fort mx-auto mb-4" />
            <p className="text-[14px] text-mine-clair mb-4">Aucun lot pour ce projet.</p>
            <button
              onClick={handleAddLot}
              className="px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer le premier lot
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <StrictModeDroppable droppableId="lots">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={clsx(
                    "space-y-2 border border-filet p-4 sm:p-6 rounded-[8px] bg-white transition-colors",
                    snapshot.isDraggingOver && "bg-survol"
                  )}
                >
                  <div className="hidden md:flex items-center gap-3 px-3 pb-1 text-[12px] font-medium text-mine-clair">
                    <span className="w-4" />
                    <span className="w-[30px]" />
                    <span className="flex-1">Lot</span>
                    <span className="w-44">Entreprise</span>
                    <span className="w-36">Avancement</span>
                    <span className="w-28">Réserves</span>
                    <span className="w-[72px]" />
                  </div>
                  {lots.map((lot, index) => {
                    const st = stats?.[lot.id]
                    const late = isLotLate(lot)
                    const period = fmtPeriod(lot.date_debut_prevue, lot.date_fin_prevue)
                    return (
                      <Draggable key={lot.id} draggableId={String(lot.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={provided.draggableProps.style}
                            className={clsx(
                              "bg-survol p-3 border border-filet rounded-[8px] transition-all",
                              snapshot.isDragging && "shadow-[0_2px_4px_rgba(15,15,15,0.04),0_8px_24px_-6px_rgba(15,15,15,0.08)]"
                            )}
                          >
                            <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing text-mine-clair hover:text-encre transition-colors"
                                aria-label="Déplacer le lot"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <IconPicker
                                selected={lot.icon}
                                onChange={(icon) => {
                                  handleIconChange(index, icon)
                                  handleSaveLot({ ...lot, icon })
                                }}
                              />

                              <div className="flex-1 min-w-0 md:min-w-[160px]">
                                <Input
                                  value={lot.name ?? ''}
                                  onChange={(e) => handleNameChange(index, e.target.value)}
                                  onBlur={() => handleSaveLot(lots[index])}
                                  className="border-filet bg-white focus:outline-none focus:border-encre focus:ring-0 font-medium text-[14px]"
                                  placeholder="Nom du lot"
                                />
                                {period && (
                                  <p className={clsx('mt-1 text-[12px] tabular-nums', late ? 'text-alerte' : 'text-mine-clair')}>
                                    {period}{late && ' · en retard'}
                                  </p>
                                )}
                              </div>

                              <div className="max-md:order-1 w-full md:w-44 text-[13px] truncate">
                                {lot.entreprises ? (
                                  <span className="text-encre">{lot.entreprises.name}</span>
                                ) : (
                                  <Link href={lotHref(lot)} className="text-mine-clair hover:text-encre underline-offset-2 hover:underline">
                                    Attribuer une entreprise
                                  </Link>
                                )}
                              </div>

                              <div className="max-md:order-1 flex-1 md:flex-none md:w-36 flex items-center gap-2" title={`Avancement : ${lot.avancement ?? 0} %`}>
                                <div className="h-1.5 flex-1 rounded-full bg-voile overflow-hidden">
                                  <div
                                    className={clsx('h-full rounded-full', (lot.avancement ?? 0) >= 100 ? 'bg-valide' : 'bg-tirage')}
                                    style={{ width: `${lot.avancement ?? 0}%` }}
                                  />
                                </div>
                                <span className="text-[12px] text-mine tabular-nums w-9 text-right">{lot.avancement ?? 0} %</span>
                              </div>

                              <div className="max-md:order-1 w-28 text-[13px] text-mine tabular-nums">
                                {st ? (
                                  <>
                                    <span className="text-encre font-medium">{st.open}</span> ouverte{st.open > 1 ? 's' : ''}
                                    {st.overdue > 0 && <span className="block text-[12px] text-alerte">{st.overdue} échue{st.overdue > 1 ? 's' : ''}</span>}
                                  </>
                                ) : (
                                  <span className="text-mine-clair">{stats ? 'Aucune' : '…'}</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 md:ml-auto">
                                <Link
                                  href={lotHref(lot)}
                                  className="p-2 rounded-[6px] text-mine-clair hover:bg-voile hover:text-encre transition-colors"
                                  aria-label={`Ouvrir la fiche du lot ${lot.name}`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteLot(lot)}
                                  className="hover:bg-alerte-pale text-alerte hover:text-alerte rounded-[6px] transition-colors"
                                  aria-label={`Supprimer le lot ${lot.name}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}

                  <button
                    onClick={handleAddLot}
                    className="flex bg-survol border border-filet items-center text-encre w-full gap-2 p-3 rounded-[8px] hover:bg-voile hover:border-filet-fort transition-colors text-[14px] font-medium justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un lot
                  </button>
                </div>
              )}
            </StrictModeDroppable>
          </DragDropContext>
        )}
      </div>
    </div>
  )
}
