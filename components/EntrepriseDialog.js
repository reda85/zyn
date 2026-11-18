'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { createEntreprise, updateEntreprise } from '@/lib/data/lots'

const EMPTY = { name: '', corps_etat: '', contact_name: '', phone: '', email: '' }

const FIELDS = [
  { key: 'name', label: 'Raison sociale *', placeholder: 'Ex. : Atlas Bâtiment SARL' },
  { key: 'corps_etat', label: 'Corps d’état', placeholder: 'Ex. : Gros œuvre' },
  { key: 'contact_name', label: 'Interlocuteur', placeholder: 'Nom du conducteur de travaux' },
  { key: 'phone', label: 'Téléphone', placeholder: '06 00 00 00 00', type: 'tel' },
  { key: 'email', label: 'Email', placeholder: 'contact@entreprise.ma', type: 'email' },
]

const inputClass =
  'w-full border border-filet bg-white px-3 py-2 rounded-[8px] text-[14px] text-encre placeholder:text-trait focus:outline-none focus:border-encre transition-colors'

/**
 * Création ou modification d'une entreprise de l'organisation.
 * `entreprise` absent → création. `onSaved(entreprise)` reçoit la ligne enregistrée.
 */
export default function EntrepriseDialog({ open, onClose, organizationId, entreprise, onSaved }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setForm(entreprise ? { ...EMPTY, ...nullsToEmpty(entreprise) } : EMPTY)
    setError(null)
  }, [open, entreprise])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('La raison sociale est obligatoire.')
    setSaving(true)
    setError(null)
    try {
      const saved = entreprise
        ? await updateEntreprise(entreprise.id, form)
        : await createEntreprise(organizationId, form)
      onSaved?.(saved)
      onClose()
    } catch (err) {
      console.error('Enregistrement entreprise', err)
      setError('Enregistrement impossible. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/20" />
      <div className="fixed inset-0 flex justify-center items-center p-6 overflow-y-auto">
        <DialogPanel className="bg-white border border-filet rounded-[12px] shadow-[0_24px_48px_-12px_rgba(15,15,15,0.14),0_2px_4px_rgba(15,15,15,0.04)] w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-5">
            <DialogTitle className="text-base font-medium text-encre">
              {entreprise ? 'Modifier l’entreprise' : 'Nouvelle entreprise'}
            </DialogTitle>
            <button type="button" onClick={onClose} className="p-1 rounded-[6px] hover:bg-voile transition-colors" aria-label="Fermer">
              <X className="w-4 h-4 text-mine-clair" />
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`ent-${f.key}`} className="block text-[12px] font-medium text-mine-clair mb-1.5">
                  {f.label}
                </label>
                <input
                  id={`ent-${f.key}`}
                  type={f.type ?? 'text'}
                  value={form[f.key]}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={inputClass}
                  autoFocus={f.key === 'name'}
                />
              </div>
            ))}

            {error && <p className="text-[13px] text-alerte">{error}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 text-[14px] font-medium text-mine bg-voile hover:bg-filet-fort rounded-[8px] transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className={clsx(
                  'flex-1 py-2 text-[14px] font-medium text-white bg-encre hover:bg-encre-survol rounded-[8px] transition-colors',
                  saving && 'opacity-60'
                )}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

function nullsToEmpty(row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? '']))
}
