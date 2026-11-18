'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Building2, Mail, Phone, Plus } from 'lucide-react'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import EntrepriseDialog from '@/components/EntrepriseDialog'
import { categoriesIcons } from '@/utils/categories'
import { useUserData } from '@/hooks/useUserData'
import { useProjectData } from '@/providers/ProjectProvider'
import { qk } from '@/lib/data/keys'
import { fetchEntreprises, fetchLotPins, fetchLots, fmtDate, isLotLate, lotStats, updateLot } from '@/lib/data/lots'

const LOT_FIELDS = ['entreprise_id', 'date_debut_prevue', 'date_fin_prevue', 'date_debut_reelle', 'date_fin_reelle', 'avancement']
const STEPS = [0, 25, 50, 75, 100]

const inputClass =
  'w-full border border-filet bg-white px-3 py-2 rounded-[8px] text-[14px] text-encre focus:outline-none focus:border-encre transition-colors disabled:bg-survol disabled:text-mine'

function toForm(lot) {
  return Object.fromEntries(LOT_FIELDS.map((k) => [k, k === 'avancement' ? lot?.[k] ?? 0 : lot?.[k] ?? '']))
}

function validate(form) {
  if (form.date_debut_prevue && form.date_fin_prevue && form.date_fin_prevue < form.date_debut_prevue)
    return 'La fin prévue précède le début prévu.'
  if (form.date_debut_reelle && form.date_fin_reelle && form.date_fin_reelle < form.date_debut_reelle)
    return 'La fin réelle précède le début réel.'
  return null
}

export default function LotPage() {
  const { organizationId, projectId, categoryId } = useParams()
  const queryClient = useQueryClient()
  const { isAdmin } = useUserData(organizationId)
  const { statuses, isReady } = useProjectData()

  const lotsQuery = useQuery({ queryKey: [...qk.categories(projectId), 'lots'], queryFn: () => fetchLots(projectId) })
  const lot = lotsQuery.data?.find((l) => l.id === categoryId)
  const entreprisesQuery = useQuery({ queryKey: qk.entreprises(organizationId), queryFn: () => fetchEntreprises(organizationId) })
  const entreprises = entreprisesQuery.data ?? []
  const pinsQuery = useQuery({ queryKey: qk.lotPins(projectId), queryFn: () => fetchLotPins(projectId) })
  const stats = useMemo(
    () => (pinsQuery.data && isReady ? lotStats(pinsQuery.data, statuses)[categoryId] ?? { total: 0, open: 0, closed: 0, overdue: 0, statuses: [] } : null),
    [pinsQuery.data, statuses, isReady, categoryId]
  )

  const [form, setForm] = useState(toForm(null))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (lot) setForm(toForm(lot))
  }, [lot])

  const dirty = lot && LOT_FIELDS.some((k) => String(form[k] ?? '') !== String(toForm(lot)[k] ?? ''))
  const error = validate(form)
  const set = (k, v) => {
    setMessage(null)
    setForm((p) => ({ ...p, [k]: v }))
  }

  const save = async () => {
    if (error || !dirty) return
    setSaving(true)
    try {
      const fields = Object.fromEntries(LOT_FIELDS.map((k) => [k, form[k] === '' ? null : form[k]]))
      fields.avancement = Math.max(0, Math.min(100, Math.round(Number(form.avancement) || 0)))
      await updateLot(categoryId, fields)
      await queryClient.invalidateQueries({ queryKey: qk.categories(projectId) })
      setMessage({ ok: true, text: 'Lot enregistré.' })
    } catch (err) {
      console.error('Enregistrement du lot', err)
      setMessage({ ok: false, text: 'Enregistrement impossible. Réessayez.' })
    } finally {
      setSaving(false)
    }
  }

  const back = `/${organizationId}/projects/${projectId}/categories`

  if (lotsQuery.isPending) {
    return (
      <div className={clsx('min-h-screen bg-papier', GeistSans.className)}>
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
          <div className="h-8 w-24 rounded-[8px] bg-voile animate-pulse" />
          <div className="h-7 w-64 rounded-[6px] bg-voile animate-pulse" />
          <div className="h-80 rounded-[12px] bg-white border border-filet animate-pulse" />
        </div>
      </div>
    )
  }

  if (!lot) {
    return (
      <div className={clsx('min-h-screen bg-papier flex items-center justify-center', GeistSans.className)}>
        <div className="text-center">
          <p className="text-[14px] text-mine mb-4">Ce lot n&apos;existe pas ou a été supprimé.</p>
          <Link href={back} className="text-[14px] font-medium text-encre underline underline-offset-2">Retour aux lots</Link>
        </div>
      </div>
    )
  }

  const late = isLotLate(lot)
  const entreprise = entreprises.find((e) => e.id === (form.entreprise_id || null)) ?? null
  const readOnly = !isAdmin
  const pct = Number(form.avancement) || 0

  return (
    <div className={clsx('min-h-screen bg-papier', GeistSans.className)}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Link
          href={back}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-voile text-mine rounded-[8px] text-[14px] font-medium hover:bg-filet transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Lots
        </Link>

        <div className="flex items-start gap-3 mb-8">
          <div className="w-10 h-10 rounded-[8px] bg-white border border-filet flex items-center justify-center flex-shrink-0 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-encre">
            {categoriesIcons[lot.icon] ?? categoriesIcons.folder}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-encre">{lot.name}</h1>
              {late && <span className="px-2 py-0.5 rounded-full bg-alerte-pale text-alerte text-[12px] font-medium">En retard</span>}
              {lot.date_fin_reelle && <span className="px-2 py-0.5 rounded-full bg-valide-pale text-valide text-[12px] font-medium">Terminé le {fmtDate(lot.date_fin_reelle)}</span>}
            </div>
            <p className="text-[14px] text-mine mt-0.5">{lot.entreprises?.name ?? 'Aucune entreprise attribuée'}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ── Fiche du lot ── */}
          <section className="bg-white border border-filet rounded-[12px] shadow-carte">
            <div className="px-5 py-4 border-b border-voile">
              <h2 className="text-[15px] font-medium text-encre">Pilotage du lot</h2>
              {readOnly && <p className="text-[13px] text-mine-clair mt-0.5">Seuls les administrateurs peuvent modifier ce lot.</p>}
            </div>

            {/* Entreprise */}
            <div className="px-5 py-4 border-b border-voile">
              <label htmlFor="lot-entreprise" className="block text-[12px] font-medium text-mine-clair mb-1.5">Entreprise titulaire</label>
              <div className="flex gap-2">
                <select
                  id="lot-entreprise"
                  value={form.entreprise_id}
                  onChange={(e) => set('entreprise_id', e.target.value)}
                  disabled={readOnly}
                  className={inputClass}
                >
                  <option value="">Aucune</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.corps_etat ? ` — ${e.corps_etat}` : ''}</option>
                  ))}
                </select>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 rounded-[8px] border border-filet bg-white text-[14px] font-medium text-mine hover:bg-survol transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nouvelle
                  </button>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="px-5 py-4 border-b border-voile grid sm:grid-cols-2 gap-x-4 gap-y-4">
              {[
                ['date_debut_prevue', 'Début prévu'],
                ['date_fin_prevue', 'Fin prévue'],
                ['date_debut_reelle', 'Début réel'],
                ['date_fin_reelle', 'Fin réelle'],
              ].map(([k, label]) => (
                <div key={k}>
                  <label htmlFor={`lot-${k}`} className="block text-[12px] font-medium text-mine-clair mb-1.5">{label}</label>
                  <input
                    id={`lot-${k}`}
                    type="date"
                    value={form[k]}
                    onChange={(e) => set(k, e.target.value)}
                    disabled={readOnly}
                    className={clsx(inputClass, 'tabular-nums')}
                  />
                </div>
              ))}
            </div>

            {/* Avancement */}
            <div className="px-5 py-4 border-b border-voile">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="lot-avancement" className="text-[12px] font-medium text-mine-clair">Avancement des travaux</label>
                <span className="text-[20px] font-semibold tracking-[-0.02em] text-encre tabular-nums">{pct} %</span>
              </div>
              <input
                id="lot-avancement"
                type="range"
                min={0}
                max={100}
                step={5}
                value={pct}
                onChange={(e) => set('avancement', Number(e.target.value))}
                disabled={readOnly}
                className="w-full accent-[var(--zs-tirage)]"
              />
              {!readOnly && (
                <div className="flex gap-1.5 mt-2">
                  {STEPS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('avancement', s)}
                      className={clsx(
                        'px-2.5 py-1 rounded-[6px] text-[12px] font-medium tabular-nums border transition-colors',
                        pct === s ? 'bg-encre text-white border-encre' : 'bg-white text-mine border-filet hover:bg-survol'
                      )}
                    >
                      {s} %
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!readOnly && (
              <div className="px-5 py-4 flex items-center justify-end gap-3">
                {(error || message) && (
                  <p className={clsx('text-[13px] mr-auto', error || !message.ok ? 'text-alerte' : 'text-valide')}>
                    {error ?? message.text}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setForm(toForm(lot))}
                  disabled={!dirty || saving}
                  className="px-4 py-2 text-[14px] font-medium text-mine bg-voile hover:bg-filet-fort rounded-[8px] transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!dirty || saving || Boolean(error)}
                  className="px-4 py-2 text-[14px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px] transition-colors disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            )}
          </section>

          <div className="space-y-6">
            {/* ── Réserves ── */}
            <section className="bg-white border border-filet rounded-[12px] shadow-carte">
              <div className="px-5 py-4 border-b border-voile">
                <h2 className="text-[15px] font-medium text-encre">Réserves du lot</h2>
              </div>
              {!stats ? (
                <div className="p-5 space-y-3">
                  <div className="h-10 rounded-[6px] bg-voile animate-pulse" />
                  <div className="h-3 rounded-[4px] bg-voile animate-pulse" />
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      ['Ouvertes', stats.open, 'text-encre'],
                      ['Échues', stats.overdue, stats.overdue ? 'text-alerte' : 'text-encre'],
                      ['Levées', stats.closed, 'text-encre'],
                    ].map(([label, value, color]) => (
                      <div key={label}>
                        <p className="text-[12px] text-mine-clair">{label}</p>
                        <p className={clsx('text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums', color)}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {stats.total > 0 && (
                    <ul className="space-y-1.5 mb-4">
                      {stats.statuses.filter((s) => s.count).map((s) => (
                        <li key={s.id} className="flex items-center gap-2 text-[13px]">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-mine flex-1">{s.name}</span>
                          <span className="text-encre tabular-nums">{s.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link
                    href={`/${organizationId}/projects/${projectId}/tasks?cat=${categoryId}`}
                    className="inline-flex items-center gap-1.5 text-[14px] font-medium text-tirage hover:text-tirage-fonce"
                  >
                    {stats.total ? `Voir les ${stats.total} réserve${stats.total > 1 ? 's' : ''}` : 'Aucune réserve sur ce lot'}
                    {stats.total > 0 && <ArrowRight className="w-3.5 h-3.5" />}
                  </Link>
                </div>
              )}
            </section>

            {/* ── Entreprise ── */}
            <section className="bg-white border border-filet rounded-[12px] shadow-carte">
              <div className="px-5 py-4 border-b border-voile flex items-center justify-between">
                <h2 className="text-[15px] font-medium text-encre">Contact entreprise</h2>
                <Link href={`/${organizationId}/entreprises`} className="text-[13px] text-mine-clair hover:text-encre">Annuaire</Link>
              </div>
              <div className="p-5 text-[14px]">
                {entreprise ? (
                  <div className="space-y-1.5">
                    <p className="font-medium text-encre">{entreprise.name}</p>
                    {entreprise.corps_etat && <p className="text-mine">{entreprise.corps_etat}</p>}
                    {entreprise.contact_name && <p className="text-mine">{entreprise.contact_name}</p>}
                    {entreprise.phone && (
                      <a href={`tel:${entreprise.phone}`} className="flex items-center gap-2 text-mine hover:text-encre">
                        <Phone className="w-3.5 h-3.5" />{entreprise.phone}
                      </a>
                    )}
                    {entreprise.email && (
                      <a href={`mailto:${entreprise.email}`} className="flex items-center gap-2 text-mine hover:text-encre">
                        <Mail className="w-3.5 h-3.5" />{entreprise.email}
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-mine-clair">
                    <Building2 className="w-4 h-4" />
                    Aucune entreprise sélectionnée
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <EntrepriseDialog
        open={dialogOpen}
        organizationId={organizationId}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          queryClient.setQueryData(qk.entreprises(organizationId), (prev = []) =>
            [...prev, saved].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          )
          queryClient.invalidateQueries({ queryKey: qk.entreprises(organizationId) })
          set('entreprise_id', saved.id)
        }}
      />
    </div>
  )
}
