'use client'

// Intervenants du projet (maître d'ouvrage, maître d'œuvre, BET…) : repris
// avec leur logo dans le cartouche des rapports.
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Building2, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { qk } from '@/lib/data/keys'
import { PARTY_ROLES, deleteParty, fetchParties, reorderParties, saveParty, uploadPartyLogo } from '@/lib/data/parties'

const EMPTY = { role: '', name: '', detail: '', logo_url: null }

const inputCls = 'w-full rounded-[8px] border border-filet bg-white px-3 py-2 text-[14px] text-encre focus:outline-none focus:border-encre transition-colors'

function PartyForm({ projectId, initial, onDone, onCancel, nextOrder }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () => saveParty({ ...form, project_id: projectId, sort_order: form.sort_order ?? nextOrder }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.parties(projectId) }); onDone() },
    onError: (e) => setError(e.message),
  })
  const pickLogo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true); setError(null)
    try { setForm((f) => ({ ...f, logo_url: null })); const url = await uploadPartyLogo(projectId, file); setForm((f) => ({ ...f, logo_url: url })) }
    catch (err) { setError(err.message) }
    finally { setUploading(false) }
  }
  const valid = form.role.trim() && form.name.trim()
  return (
    <div className="rounded-[10px] border border-encre/20 bg-survol p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-mine mb-1">Rôle</label>
          <input list="party-roles" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Maître d'ouvrage" className={inputCls} />
          <datalist id="party-roles">{PARTY_ROLES.map((r) => <option key={r} value={r} />)}</datalist>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-mine mb-1">Nom</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Société, cabinet…" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-mine mb-1">Précision <span className="text-mine-clair font-normal">(représentant, adresse, contact — facultatif)</span></label>
        <input value={form.detail ?? ''} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="M. Alaoui, chef de projet" className={inputCls} />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-14 rounded-[8px] border border-filet bg-white flex items-center justify-center overflow-hidden">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-mine-clair" />
            : form.logo_url ? <img src={form.logo_url} alt="" className="max-w-full max-h-full object-contain" />
            : <span className="text-[11px] text-mine-clair">Sans logo</span>}
        </div>
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-[13px] font-medium text-mine hover:text-encre">
          <ImagePlus className="w-4 h-4" /> {form.logo_url ? 'Remplacer le logo' : 'Ajouter un logo'}
        </button>
        {form.logo_url && (
          <button type="button" onClick={() => setForm({ ...form, logo_url: null })} className="text-[13px] text-mine-clair hover:text-alerte">Retirer</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickLogo} />
      </div>
      {error && <p className="text-[13px] text-alerte">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-mine hover:bg-voile">Annuler</button>
        <button type="button" disabled={!valid || uploading || save.isPending} onClick={() => save.mutate()} className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium bg-encre text-white hover:bg-encre-survol disabled:opacity-40">
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

export default function ProjectParties({ projectId, canEdit = true }) {
  const qc = useQueryClient()
  const { data: parties = [], isLoading } = useQuery({ queryKey: qk.parties(projectId), queryFn: () => fetchParties(projectId), enabled: Boolean(projectId) })
  const [editing, setEditing] = useState(null) // id, 'new' ou null
  const refresh = () => qc.invalidateQueries({ queryKey: qk.parties(projectId) })
  const remove = useMutation({ mutationFn: deleteParty, onSuccess: refresh })
  const move = useMutation({
    mutationFn: ({ from, to }) => {
      const next = [...parties]
      ;[next[from], next[to]] = [next[to], next[from]]
      return reorderParties(next)
    },
    onSuccess: refresh,
  })

  return (
    <div className="bg-white border border-filet rounded-[12px] p-6 shadow-carte">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-[17px] font-medium text-encre">Intervenants</h2>
          <p className="text-[13px] text-mine-clair mt-1">Maître d&apos;ouvrage, maître d&apos;œuvre, bureaux d&apos;études… Ils figurent avec leur logo dans le cartouche des rapports, dans cet ordre.</p>
        </div>
        {canEdit && editing !== 'new' && (
          <button type="button" onClick={() => setEditing('new')} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[8px] bg-encre text-white text-[13px] font-medium hover:bg-encre-survol">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        )}
      </div>

      {editing === 'new' && (
        <div className="mb-3">
          <PartyForm projectId={projectId} nextOrder={parties.length} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </div>
      )}

      {isLoading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-mine-clair" /></div>
      ) : parties.length === 0 && editing !== 'new' ? (
        <div className="text-center py-8">
          <Building2 className="w-10 h-10 text-filet-fort mx-auto mb-3" />
          <p className="text-[14px] text-mine-clair">Aucun intervenant renseigné</p>
        </div>
      ) : (
        <div className="space-y-2">
          {parties.map((p, i) => editing === p.id ? (
            <PartyForm key={p.id} projectId={projectId} initial={p} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
          ) : (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-survol border border-filet rounded-[8px] group">
              <div className="w-16 h-10 rounded-[6px] bg-white border border-filet flex items-center justify-center overflow-hidden flex-shrink-0">
                {p.logo_url ? <img src={p.logo_url} alt="" className="max-w-full max-h-full object-contain" /> : <Building2 className="w-4 h-4 text-trait" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-mine-clair">{p.role}</p>
                <p className="text-[14px] font-medium text-encre truncate">{p.name}</p>
                {p.detail && <p className="text-[12px] text-mine truncate">{p.detail}</p>}
              </div>
              {canEdit && (
                <div className={clsx('flex items-center gap-1 transition-opacity', 'opacity-60 group-hover:opacity-100')}>
                  <button type="button" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ from: i, to: i - 1 })} className="p-1.5 rounded-[6px] hover:bg-voile disabled:opacity-30" aria-label="Monter"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button type="button" disabled={i === parties.length - 1 || move.isPending} onClick={() => move.mutate({ from: i, to: i + 1 })} className="p-1.5 rounded-[6px] hover:bg-voile disabled:opacity-30" aria-label="Descendre"><ArrowDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => setEditing(p.id)} className="p-1.5 rounded-[6px] hover:bg-voile" aria-label="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => { if (window.confirm(`Retirer ${p.name} des intervenants ?`)) remove.mutate(p.id) }} className="p-1.5 rounded-[6px] hover:bg-alerte-pale text-alerte" aria-label="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
