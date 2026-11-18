'use client'

import { useMemo, useState } from 'react'
import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { cn as clsx } from '@/lib/utils'
import { categoriesIcons } from '@/utils/categories'
import { todayISO } from '@/lib/data/lots'
import { ETATS, POINT_TYPES, fmtShortDate } from '@/lib/data/meetings'
import { AutoField, Section, Segmented, inputClass } from './fields'

const TYPE_OPTIONS = Object.entries(POINT_TYPES).map(([value, t]) => ({ value, label: t.label }))

/**
 * Points à suivre de la réunion, regroupés par lot (« Généralités » d'abord).
 * `points` : sortie de pointsForMeeting(). Les actions remontent au parent.
 */
export default function PointsSection({ meeting, points, lots, entreprises, readOnly, numeroOf, onCreate, onUpdate, onDelete, onSuivi }) {
  const groups = useMemo(() => {
    const byLot = new Map([[null, []], ...lots.map((l) => [l.id, []])])
    for (const p of points) {
      const key = byLot.has(p.lot_id) ? p.lot_id : null
      byLot.get(key).push(p)
    }
    return [...byLot.entries()].map(([lotId, items]) => ({
      lot: lots.find((l) => l.id === lotId) ?? null,
      items: items.sort((a, b) => a.numero - b.numero),
    }))
  }, [points, lots])

  const counts = {
    nouveau: points.filter((p) => p.etat === 'nouveau').length,
    en_cours: points.filter((p) => p.etat === 'en_cours').length,
    solde: points.filter((p) => p.etat === 'solde').length,
  }

  return (
    <Section
      title="Points à suivre"
      hint={`${counts.en_cours} repris · ${counts.nouveau} nouveau${counts.nouveau > 1 ? 'x' : ''} · ${counts.solde} soldé${counts.solde > 1 ? 's' : ''}`}
    >
      <div className="divide-y divide-voile">
        {groups.map(({ lot, items }) =>
          readOnly && items.length === 0 ? null : (
            <PointGroup
              key={lot?.id ?? 'general'}
              lot={lot}
              items={items}
              meeting={meeting}
              entreprises={entreprises}
              readOnly={readOnly}
              numeroOf={numeroOf}
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSuivi={onSuivi}
            />
          )
        )}
      </div>
    </Section>
  )
}

function PointGroup({ lot, items, meeting, entreprises, readOnly, numeroOf, onCreate, onUpdate, onDelete, onSuivi }) {
  const [draft, setDraft] = useState(null)
  const lotEntreprise = lot?.entreprise_id ?? ''

  const submit = async (e) => {
    e.preventDefault()
    if (!draft?.texte?.trim()) return
    await onCreate({
      lot_id: lot?.id ?? null,
      type: draft.type,
      texte: draft.texte.trim(),
      entreprise_id: draft.entreprise_id || null,
      echeance: draft.echeance || null,
    })
    setDraft({ type: draft.type, texte: '', entreprise_id: draft.entreprise_id, echeance: '' })
  }

  const empty = items.length === 0 && !draft

  return (
    <div className={empty ? 'px-5 py-2.5' : 'px-5 py-4'}>
      <div className={clsx('flex items-center gap-2', !empty && 'mb-3')}>
        <span className="w-6 h-6 rounded-[6px] bg-voile flex items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-encre">
          {lot ? categoriesIcons[lot.icon] ?? categoriesIcons.folder : <span className="text-[11px] font-semibold text-mine">G</span>}
        </span>
        <h3 className="text-[14px] font-medium text-encre">{lot ? lot.name : 'Généralités'}</h3>
        <span className="text-[12px] text-mine-clair tabular-nums">{items.length || ''}</span>
        {empty && !readOnly && (
          <button
            onClick={() => setDraft({ type: 'action', texte: '', entreprise_id: lotEntreprise, echeance: '' })}
            className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-mine-clair hover:text-encre"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un point
          </button>
        )}
      </div>

      {items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((p) => (
            <PointRow
              key={p.id}
              point={p}
              meeting={meeting}
              entreprises={entreprises}
              readOnly={readOnly}
              numeroOf={numeroOf}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onSuivi={onSuivi}
            />
          ))}
        </ul>
      )}

      {!readOnly && !empty &&
        (draft ? (
          <form onSubmit={submit} className="mt-3 rounded-[8px] border border-dashed border-filet-fort bg-survol p-3 space-y-2.5">
            <Segmented size="sm" value={draft.type} options={TYPE_OPTIONS} onChange={(type) => setDraft((d) => ({ ...d, type }))} />
            <textarea
              autoFocus
              rows={2}
              value={draft.texte}
              onChange={(e) => setDraft((d) => ({ ...d, texte: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
                if (e.key === 'Escape') setDraft(null)
              }}
              placeholder={lot ? `Point concernant le lot ${lot.name}…` : 'Point général (planning, sécurité, administratif)…'}
              className={clsx(inputClass, 'resize-none')}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={draft.entreprise_id}
                onChange={(e) => setDraft((d) => ({ ...d, entreprise_id: e.target.value }))}
                className={clsx(inputClass, 'w-auto min-w-[180px] py-1.5')}
                aria-label="Responsable"
              >
                <option value="">Responsable…</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <input
                type="date"
                value={draft.echeance}
                onChange={(e) => setDraft((d) => ({ ...d, echeance: e.target.value }))}
                className={clsx(inputClass, 'w-auto py-1.5 tabular-nums')}
                aria-label="Échéance"
              />
              <div className="ml-auto flex gap-2">
                <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 text-[13px] font-medium text-mine hover:text-encre">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!draft.texte.trim()}
                  className="px-3 py-1.5 text-[13px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px] disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setDraft({ type: 'action', texte: '', entreprise_id: lotEntreprise, echeance: '' })}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-mine-clair hover:text-encre"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter un point
          </button>
        ))}
    </div>
  )
}

function PointRow({ point: p, meeting, entreprises, readOnly, numeroOf, onUpdate, onDelete, onSuivi }) {
  const etat = ETATS[p.etat]
  const late = p.etat !== 'solde' && p.echeance && p.echeance < (meeting.date || todayISO())
  const solde = p.etat === 'solde'
  // Les points d'une réunion antérieure gardent leur libellé ; on les suit par commentaire.
  const lockedText = readOnly || p.etat !== 'nouveau'

  return (
    <li className={clsx('rounded-[8px] border p-3 transition-colors', solde ? 'border-voile bg-survol' : 'border-filet bg-white')}>
      <div className="flex items-start gap-3">
        <span className="mt-1.5 text-[12px] font-semibold text-mine tabular-nums w-7 flex-shrink-0">{p.numero}</span>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={clsx('px-2 py-0.5 rounded-full text-[11px] font-medium', etat.className)}>{etat.label}</span>
            {readOnly || p.etat !== 'nouveau' ? (
              <span className="text-[12px] text-mine-clair">{POINT_TYPES[p.type]?.label}</span>
            ) : (
              <Segmented size="sm" value={p.type} options={TYPE_OPTIONS} onChange={(type) => onUpdate(p.id, { type })} />
            )}
            {p.etat !== 'nouveau' && p.ouverture && (
              <span className="text-[12px] text-mine-clair">ouvert en réunion n° {p.ouverture.numero}</span>
            )}
          </div>

          {lockedText ? (
            <p className={clsx('text-[14px] leading-relaxed whitespace-pre-line', solde ? 'text-mine line-through decoration-filet-fort' : 'text-encre')}>{p.texte}</p>
          ) : (
            <AutoField multiline value={p.texte} onSave={(texte) => texte.trim() && onUpdate(p.id, { texte: texte.trim() })} aria-label="Libellé du point" />
          )}

          {p.historique.length > 0 && (
            <ul className="space-y-0.5">
              {[...p.historique]
                .map((h) => ({ ...h, numero: numeroOf(h.meeting_id) }))
                .filter((h) => h.numero && h.numero < meeting.numero)
                .sort((a, b) => a.numero - b.numero)
                .map((h) => (
                  <li key={h.meeting_id} className="text-[12px] text-mine-clair">
                    <span className="tabular-nums">Réunion n° {h.numero}</span> : {h.texte}
                  </li>
                ))}
            </ul>
          )}

          {p.etat !== 'nouveau' &&
            (readOnly ? (
              p.suivi && <p className="text-[13px] text-encre"><span className="text-mine-clair">Suivi : </span>{p.suivi}</p>
            ) : (
              <AutoField
                value={p.suivi}
                onSave={(texte) => onSuivi(p.id, texte)}
                placeholder="Suivi de ce jour (où en est-on ?)…"
                className="py-1.5 text-[13px]"
                aria-label={`Suivi du point ${p.numero}`}
              />
            ))}

          <div className="flex flex-wrap items-center gap-2">
            {readOnly ? (
              <span className="text-[13px] text-mine">
                {entreprises.find((e) => e.id === p.entreprise_id)?.name ?? 'Sans responsable'}
              </span>
            ) : (
              <select
                value={p.entreprise_id ?? ''}
                onChange={(e) => onUpdate(p.id, { entreprise_id: e.target.value || null })}
                className={clsx(inputClass, 'w-auto min-w-[170px] py-1 text-[13px]')}
                aria-label="Responsable"
              >
                <option value="">Sans responsable</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
            {readOnly ? (
              p.echeance && (
                <span className={clsx('text-[13px] tabular-nums', late ? 'text-alerte' : 'text-mine')}>
                  · pour le {fmtShortDate(p.echeance)}
                </span>
              )
            ) : (
              <input
                type="date"
                value={p.echeance ?? ''}
                onChange={(e) => onUpdate(p.id, { echeance: e.target.value || null })}
                className={clsx(inputClass, 'w-auto py-1 text-[13px] tabular-nums', late && 'border-alerte text-alerte')}
                aria-label="Échéance"
              />
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <button
              onClick={() => onUpdate(p.id, solde ? { statut: 'ouvert', clos_meeting_id: null } : { statut: 'clos', clos_meeting_id: meeting.id })}
              className={clsx(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[12px] font-medium border transition-colors',
                solde ? 'border-filet text-mine hover:bg-voile' : 'border-valide text-valide hover:bg-valide-pale'
              )}
            >
              {solde ? <RotateCcw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {solde ? 'Rouvrir' : 'Solder'}
            </button>
            {p.etat === 'nouveau' && (
              <button
                onClick={() => confirm(`Supprimer le point ${p.numero} ?`) && onDelete(p.id)}
                className="p-1 rounded-[6px] text-mine-clair hover:text-alerte hover:bg-alerte-pale"
                aria-label={`Supprimer le point ${p.numero}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
