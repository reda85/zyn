'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cn as clsx } from '@/lib/utils'
import { fmtDate } from '@/lib/data/lots'
import { addDays } from '@/lib/data/planning'

const inputClass =
  'w-full border border-filet bg-white px-3 py-2 rounded-[8px] text-[14px] text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors disabled:bg-survol disabled:text-mine'

function Shell({ open, onClose, title, children }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" />
      <div className="fixed inset-0 flex justify-center items-center p-6 overflow-y-auto">
        <DialogPanel className="bg-white border border-filet rounded-[12px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <DialogTitle className="text-base font-medium text-encre">{title}</DialogTitle>
            <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-voile transition-colors" aria-label="Fermer">
              <X className="w-4 h-4 text-mine-clair" />
            </button>
          </div>
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[12px] font-medium text-mine-clair mb-1.5">{label}</label>
      {children}
    </div>
  )
}

/** Création ou modification d'une tâche ou d'un jalon. `task.id` absent → création. */
const NEW_SOUS_LOT = '__nouveau__'

export function TaskDialog({ open, task, lots, sousLots = [], today, readOnly, onClose, onSave, onDelete, taskHref }) {
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && task) setForm({
      type: 'tache', libelle: '', lot_id: '', avancement: 0, date_debut: today, date_fin: addDays(today, 6), ...task,
      lot_id: lots.some((l) => l.id === task.lot_id) ? task.lot_id : '',
      sous_lot_id: sousLots.some((sl) => sl.id === task.sous_lot_id) ? task.sous_lot_id : '',
      newSousLot: '',
    })
  }, [open, task, today, lots, sousLots])

  if (!form) return null
  const isNew = !form.id
  const jalon = form.type === 'jalon'
  const error = !form.libelle.trim()
    ? null
    : form.sous_lot_id === NEW_SOUS_LOT && !form.newSousLot.trim()
      ? 'Nommez le nouveau sous-lot.'
    : !form.date_debut || (!jalon && !form.date_fin)
      ? 'Renseignez les dates.'
      : !jalon && form.date_fin < form.date_debut
        ? 'La fin précède le début.'
        : null
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (error || !form.libelle.trim()) return
    setSaving(true)
    const ok = await onSave({
      id: form.id,
      type: form.type,
      libelle: form.libelle.trim(),
      lot_id: form.lot_id || null,
      ...(jalon ? {} : form.sous_lot_id === NEW_SOUS_LOT
        ? { newSousLot: form.newSousLot.trim() }
        : { sous_lot_id: form.lot_id ? form.sous_lot_id || null : null }),
      date_debut: form.date_debut,
      date_fin: jalon ? form.date_debut : form.date_fin,
      avancement: jalon ? (form.avancement >= 100 ? 100 : 0) : Number(form.avancement) || 0,
    })
    setSaving(false)
    if (ok !== false) onClose()
  }

  return (
    <Shell open={open} onClose={onClose} title={isNew ? (jalon ? 'Nouveau jalon' : 'Nouvelle tâche') : jalon ? 'Jalon' : 'Tâche'}>
      <form onSubmit={submit} className="space-y-4">
        {isNew && (
          <div className="inline-flex rounded-[8px] bg-voile p-0.5">
            {[['tache', 'Tâche'], ['jalon', 'Jalon']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => set('type', v)} className={clsx('px-3 py-1 rounded-[6px] text-[13px] font-medium', form.type === v ? 'bg-white text-encre shadow-carte' : 'text-mine')}>
                {l}
              </button>
            ))}
          </div>
        )}
        <Field label="Libellé" htmlFor="pt-libelle">
          <input id="pt-libelle" autoFocus value={form.libelle} disabled={readOnly} onChange={(e) => set('libelle', e.target.value)} className={inputClass}
            placeholder={jalon ? 'Ex. : Hors d’eau, réception des travaux' : 'Ex. : Coulage dalle R+2'} />
        </Field>
        <Field label="Lot" htmlFor="pt-lot">
          <select id="pt-lot" value={form.lot_id} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, lot_id: e.target.value, sous_lot_id: '', newSousLot: '' }))} className={inputClass}>
            <option value="">Généralités (tout le projet)</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        {!jalon && form.lot_id && (
          <Field label="Sous-lot" htmlFor="pt-sous-lot">
            <select id="pt-sous-lot" value={form.sous_lot_id} disabled={readOnly} onChange={(e) => set('sous_lot_id', e.target.value)} className={inputClass}>
              <option value="">Aucun (directement dans le lot)</option>
              {sousLots.filter((sl) => sl.lot_id === form.lot_id).map((sl) => <option key={sl.id} value={sl.id}>{sl.name}</option>)}
              {!readOnly && <option value={NEW_SOUS_LOT}>+ Nouveau sous-lot…</option>}
            </select>
            {form.sous_lot_id === NEW_SOUS_LOT && (
              <input autoFocus value={form.newSousLot} onChange={(e) => set('newSousLot', e.target.value)} className={clsx(inputClass, 'mt-2')} placeholder="Ex. : Courant fort" />
            )}
          </Field>
        )}
        <div className={clsx('grid gap-3', !jalon && 'grid-cols-2')}>
          <Field label={jalon ? 'Date' : 'Début'} htmlFor="pt-debut">
            <input id="pt-debut" type="date" value={form.date_debut} disabled={readOnly} onChange={(e) => set('date_debut', e.target.value)} className={clsx(inputClass, 'tabular-nums')} />
          </Field>
          {!jalon && (
            <Field label="Fin" htmlFor="pt-fin">
              <input id="pt-fin" type="date" value={form.date_fin} disabled={readOnly} onChange={(e) => set('date_fin', e.target.value)} className={clsx(inputClass, 'tabular-nums')} />
            </Field>
          )}
        </div>
        {jalon ? (
          <label className="flex items-center gap-2 text-[14px] text-encre">
            <input type="checkbox" checked={form.avancement >= 100} disabled={readOnly} onChange={(e) => set('avancement', e.target.checked ? 100 : 0)} />
            Jalon atteint
          </label>
        ) : (
          <Field label={`Avancement : ${form.avancement} %`} htmlFor="pt-avancement">
            <input id="pt-avancement" type="range" min={0} max={100} step={5} value={form.avancement} disabled={readOnly}
              onChange={(e) => set('avancement', Number(e.target.value))} className="w-full accent-[var(--zs-tirage)]" />
          </Field>
        )}

        {!jalon && (
          <p className="text-[12px] text-mine-clair leading-relaxed">
            {isNew
              ? 'La tâche sera aussi créée dans « Tâches », avec la fin comme échéance.'
              : <>Tâche n° {form.pin_number} de la liste des tâches{form.done ? ' (levée)' : ''}.{' '}
                  <Link href={taskHref(form)} className="text-tirage hover:text-tirage-fonce font-medium">Ouvrir dans Tâches</Link></>}
          </p>
        )}

        {error && <p className="text-[13px] text-alerte">{error}</p>}

        {!readOnly && (
          <div className="flex gap-2 pt-2">
            {!isNew && (
              <button type="button"
                onClick={async () => {
                  const msg = jalon ? `Supprimer le jalon « ${form.libelle} » ?` : `Retirer « ${form.libelle} » du planning ? La tâche reste dans « Tâches ».`
                  if (confirm(msg)) { await onDelete(form); onClose() }
                }}
                className="p-2 rounded-[8px] text-alerte hover:bg-alerte-pale" aria-label={jalon ? 'Supprimer le jalon' : 'Retirer du planning'} title={jalon ? 'Supprimer le jalon' : 'Retirer du planning'}>
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[14px] font-medium text-mine bg-voile hover:bg-filet-fort rounded-[8px]">Annuler</button>
            <button type="submit" disabled={saving || Boolean(error) || !form.libelle.trim()} className="flex-1 py-2 text-[14px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px] disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </form>
    </Shell>
  )
}

/** Dates prévues d'un lot ; le réel et l'avancement viennent des réunions. */
export function LotDialog({ open, lot, lotHref, readOnly, onClose, onSave, sousLots = [], onSousLotCreate, onSousLotRename, onSousLotDelete, onSousLotMove }) {
  const [form, setForm] = useState({ debut: '', fin: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && lot) setForm({ debut: lot.date_debut_prevue ?? '', fin: lot.date_fin_prevue ?? '' })
  }, [open, lot])

  if (!lot) return null
  const error = form.debut && form.fin && form.fin < form.debut ? 'La fin précède le début.' : null

  const submit = async (e) => {
    e.preventDefault()
    if (error) return
    setSaving(true)
    const ok = await onSave(lot, form.debut || null, form.fin || null)
    setSaving(false)
    if (ok !== false) onClose()
  }

  return (
    <Shell open={open} onClose={onClose} title={`Lot ${lot.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début prévu" htmlFor="lot-debut">
            <input id="lot-debut" type="date" value={form.debut} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))} className={clsx(inputClass, 'tabular-nums')} />
          </Field>
          <Field label="Fin prévue" htmlFor="lot-fin">
            <input id="lot-fin" type="date" value={form.fin} disabled={readOnly} onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))} className={clsx(inputClass, 'tabular-nums')} />
          </Field>
        </div>
        <dl className="grid grid-cols-2 gap-3 text-[13px] rounded-[8px] bg-survol border border-voile p-3">
          <div><dt className="text-mine-clair">Début réel</dt><dd className="text-encre tabular-nums">{fmtDate(lot.date_debut_reelle) ?? '—'}</dd></div>
          <div><dt className="text-mine-clair">Fin réelle</dt><dd className="text-encre tabular-nums">{fmtDate(lot.date_fin_reelle) ?? '—'}</dd></div>
          <div><dt className="text-mine-clair">Avancement</dt><dd className="text-encre tabular-nums">{lot.avancement ?? 0} %</dd></div>
          <div className="self-end">
            <Link href={lotHref} className="inline-flex items-center gap-1 text-tirage hover:text-tirage-fonce font-medium">
              Fiche du lot <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </dl>
        <p className="text-[12px] text-mine-clair">Le réel et l&apos;avancement sont mis à jour à la diffusion de chaque réunion de chantier.</p>
        <SousLotsEditor
          list={sousLots.filter((sl) => sl.lot_id === lot.id)}
          readOnly={readOnly}
          onCreate={(name) => onSousLotCreate?.(lot, name)}
          onRename={onSousLotRename}
          onDelete={onSousLotDelete}
          onMove={onSousLotMove}
        />
        {error && <p className="text-[13px] text-alerte">{error}</p>}
        {!readOnly && (
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-[14px] font-medium text-mine bg-voile hover:bg-filet-fort rounded-[8px]">Annuler</button>
            <button type="submit" disabled={saving || Boolean(error)} className="flex-1 py-2 text-[14px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px] disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </form>
    </Shell>
  )
}

/** Sous-lots d'un lot : ajout, renommage, ordre, suppression (les tâches restent dans le lot). */
function SousLotsEditor({ list, readOnly, onCreate, onRename, onDelete, onMove }) {
  const [adding, setAdding] = useState('')
  const [editing, setEditing] = useState(null) // { id, name }
  const add = async () => {
    const name = adding.trim()
    if (!name) return
    setAdding('')
    await onCreate(name)
  }
  const commit = async () => {
    const e = editing
    setEditing(null)
    if (e && e.name.trim()) await onRename(e.id, e.name)
  }
  return (
    <div>
      <p className="text-[12px] font-medium text-mine-clair mb-1.5">Sous-lots</p>
      {list.length === 0 && <p className="text-[13px] text-mine-clair mb-2">Aucun sous-lot. Ex. : Courant fort, Courant faible.</p>}
      <ul className="space-y-1 mb-2">
        {list.map((sl, i) => (
          <li key={sl.id} className="flex items-center gap-1 rounded-[8px] border border-voile bg-survol pl-3 pr-1 py-1">
            {editing?.id === sl.id ? (
              <input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') setEditing(null) }}
                className="flex-1 min-w-0 bg-white border border-filet rounded-[6px] px-2 py-1 text-[13px] focus:outline-none focus:border-encre" />
            ) : (
              <span className="flex-1 min-w-0 truncate text-[13px] text-encre">{sl.name}</span>
            )}
            {!readOnly && (
              <>
                <button type="button" disabled={i === 0} onClick={() => onMove(sl, -1)} className="p-1 rounded hover:bg-voile disabled:opacity-30" aria-label="Monter"><ArrowUp className="w-3.5 h-3.5 text-mine" /></button>
                <button type="button" disabled={i === list.length - 1} onClick={() => onMove(sl, 1)} className="p-1 rounded hover:bg-voile disabled:opacity-30" aria-label="Descendre"><ArrowDown className="w-3.5 h-3.5 text-mine" /></button>
                <button type="button" onClick={() => setEditing({ id: sl.id, name: sl.name })} className="p-1 rounded hover:bg-voile" aria-label="Renommer"><Pencil className="w-3.5 h-3.5 text-mine" /></button>
                <button type="button" onClick={() => { if (confirm(`Supprimer le sous-lot « ${sl.name} » ? Ses tâches restent dans le lot.`)) onDelete(sl) }} className="p-1 rounded hover:bg-alerte-pale" aria-label="Supprimer"><Trash2 className="w-3.5 h-3.5 text-alerte" /></button>
              </>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <div className="flex gap-2">
          <input value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            placeholder="Nouveau sous-lot" className={inputClass} />
          <button type="button" onClick={add} disabled={!adding.trim()} className="flex-shrink-0 inline-flex items-center gap-1 px-3 rounded-[8px] border border-filet text-[13px] font-medium text-mine hover:bg-survol disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      )}
    </div>
  )
}
