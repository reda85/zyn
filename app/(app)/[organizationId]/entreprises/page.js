'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Pencil, Plus, Search, Trash2, Phone, Mail } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import Sidebar from '@/components/Sidebar'
import EntrepriseDialog from '@/components/EntrepriseDialog'
import { useUserData } from '@/hooks/useUserData'
import { supabase } from '@/utils/supabase/client'
import { deleteEntreprise, fetchEntreprises } from '@/lib/data/lots'
import { qk } from '@/lib/data/keys'

// Lots confiés à chaque entreprise, tous projets visibles confondus.
async function fetchLotsByEntreprise(entrepriseIds) {
  if (!entrepriseIds.length) return {}
  const { data, error } = await supabase
    .from('categories')
    .select('id,name,entreprise_id,projects(id,name)')
    .in('entreprise_id', entrepriseIds)
  if (error) throw error
  const out = {}
  for (const lot of data ?? []) (out[lot.entreprise_id] ??= []).push(lot)
  return out
}

export default function EntreprisesPage({ params }) {
  const { organizationId } = params
  const { isAdmin } = useUserData(organizationId)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState({ open: false, entreprise: null })

  const entreprisesQuery = useQuery({
    queryKey: qk.entreprises(organizationId),
    queryFn: () => fetchEntreprises(organizationId),
  })
  const entreprises = entreprisesQuery.data ?? []
  const ids = entreprises.map((e) => e.id)

  const lotsQuery = useQuery({
    queryKey: [...qk.entreprises(organizationId), 'lots', ids],
    queryFn: () => fetchLotsByEntreprise(ids),
    enabled: entreprisesQuery.isSuccess,
  })
  const lotsByEntreprise = lotsQuery.data ?? {}

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entreprises
    return entreprises.filter((e) =>
      [e.name, e.corps_etat, e.contact_name, e.email].some((v) => v?.toLowerCase().includes(q))
    )
  }, [entreprises, search])

  const refresh = () => queryClient.invalidateQueries({ queryKey: qk.entreprises(organizationId) })

  const remove = async (entreprise) => {
    const lots = lotsByEntreprise[entreprise.id]?.length ?? 0
    const warning = lots
      ? `\n\nElle est titulaire de ${lots} lot${lots > 1 ? 's' : ''} : ${lots > 1 ? 'ils resteront' : 'il restera'} sans entreprise.`
      : ''
    if (!confirm(`Supprimer ${entreprise.name} ?${warning}`)) return
    try {
      await deleteEntreprise(entreprise.id)
      refresh()
    } catch (err) {
      console.error('Suppression entreprise', err)
      alert('Suppression impossible.')
    }
  }

  const loading = entreprisesQuery.isPending
  const withLots = entreprises.filter((e) => lotsByEntreprise[e.id]?.length).length

  return (
    <div className={clsx('flex h-screen bg-papier overflow-hidden', GeistSans.className)}>
      <Sidebar organizationId={organizationId} currentPage="entreprises" />

      <main className="flex-1 overflow-y-auto px-8 py-7">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">Entreprises</h1>
            <p className="text-[13px] text-mine-clair mt-0.5">
              Les entreprises titulaires de vos lots, partagées entre tous les projets
            </p>
          </div>
          <button
            onClick={() => setDialog({ open: true, entreprise: null })}
            className="bg-encre text-white px-4 py-2 rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Ajouter une entreprise
          </button>
        </div>

        <div className="grid grid-cols-2 bg-white border border-filet rounded-[12px] mb-6 shadow-carte max-w-xl">
          {[
            { label: 'Entreprises', value: entreprises.length, hint: 'dans l’annuaire' },
            { label: 'Sur un chantier', value: withLots, hint: 'titulaires d’au moins un lot' },
          ].map((stat, i) => (
            <div key={stat.label} className={clsx('px-5 py-4', i > 0 && 'border-l border-filet')}>
              <p className="text-[13px] text-mine">{stat.label}</p>
              {loading ? (
                <div className="h-7 w-10 mt-1.5 rounded-[6px] bg-voile animate-pulse" />
              ) : (
                <p className="mt-1 text-[26px] leading-none font-semibold tracking-[-0.02em] text-encre tabular-nums">{stat.value}</p>
              )}
              <p className="mt-2 text-[13px] text-mine-clair">{stat.hint}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-xs mb-5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mine-clair" />
          <input
            type="text"
            className="border border-filet bg-white pl-8 pr-3 py-[7px] w-full rounded-[8px] text-[14px] focus:outline-none focus:border-encre transition-colors text-encre placeholder:text-trait"
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-[12px] border border-filet shadow-carte divide-y divide-voile">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-4 flex gap-4">
                <div className="h-3.5 w-48 rounded-[4px] bg-voile animate-pulse" />
                <div className="h-3.5 w-24 rounded-[4px] bg-voile animate-pulse" />
              </div>
            ))}
          </div>
        ) : entreprises.length === 0 ? (
          <div className="bg-white border border-filet rounded-[12px] p-12 text-center shadow-carte max-w-xl">
            <Building2 className="w-10 h-10 text-filet-fort mx-auto mb-4" />
            <p className="text-[14px] font-medium text-encre mb-1">Aucune entreprise pour l&apos;instant</p>
            <p className="text-[14px] text-mine-clair mb-5">
              Ajoutez les entreprises de vos chantiers pour leur confier des lots.
            </p>
            <button
              onClick={() => setDialog({ open: true, entreprise: null })}
              className="px-4 py-2 bg-encre text-white rounded-[8px] text-[14px] font-medium hover:bg-encre-survol transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Ajouter la première entreprise
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-[12px] border border-filet overflow-x-auto shadow-carte">
            <table className="w-full min-w-[760px]" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  {['Entreprise', 'Corps d’état', 'Contact', 'Lots', ''].map((h, i) => (
                    <th key={i} className="px-4 py-2 text-[12px] font-medium text-mine text-left border-b border-filet">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const lots = lotsByEntreprise[e.id] ?? []
                  return (
                    <tr key={e.id} className="border-b border-voile last:border-0 hover:bg-survol transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-[6px] bg-voile border border-filet flex items-center justify-center text-xs font-medium text-encre flex-shrink-0">
                            {e.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-[14px] font-medium text-encre truncate">{e.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[14px] text-mine truncate">{e.corps_etat || '—'}</td>
                      <td className="px-4 py-3 text-[13px] text-mine">
                        {e.contact_name ? (
                          <p className="text-encre truncate">{e.contact_name}</p>
                        ) : (
                          !e.phone && !e.email && <p className="text-mine-clair">—</p>
                        )}
                        <div className="flex flex-col gap-0.5 mt-0.5 text-mine-clair min-w-0">
                          {e.phone && (
                            <a href={`tel:${e.phone}`} className="flex items-center gap-1.5 hover:text-encre min-w-0">
                              <Phone className="w-3 h-3 flex-shrink-0" /><span className="truncate">{e.phone}</span>
                            </a>
                          )}
                          {e.email && (
                            <a href={`mailto:${e.email}`} className="flex items-center gap-1.5 hover:text-encre min-w-0">
                              <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{e.email}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-mine">
                        {lots.length ? (
                          <span title={lots.map((l) => `${l.name} — ${l.projects?.name ?? ''}`).join('\n')}>
                            <span className="text-encre font-medium tabular-nums">{lots.length}</span> lot{lots.length > 1 ? 's' : ''}
                            <span className="text-mine-clair"> · {[...new Set(lots.map((l) => l.projects?.name).filter(Boolean))].join(', ')}</span>
                          </span>
                        ) : (
                          <span className="text-mine-clair">Aucun</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setDialog({ open: true, entreprise: e })}
                            className="p-1.5 rounded-[6px] text-mine-clair hover:bg-voile hover:text-encre transition-colors"
                            aria-label={`Modifier ${e.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => remove(e)}
                              className="p-1.5 rounded-[6px] text-alerte hover:bg-alerte-pale transition-colors"
                              aria-label={`Supprimer ${e.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[14px] text-mine-clair">Aucun résultat pour « {search} »</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <EntrepriseDialog
        open={dialog.open}
        entreprise={dialog.entreprise}
        organizationId={organizationId}
        onClose={() => setDialog({ open: false, entreprise: null })}
        onSaved={refresh}
      />
    </div>
  )
}
