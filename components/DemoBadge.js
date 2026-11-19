'use client'

// Organisation de démonstration : pastille « Démo » (barre du projet, barre
// latérale) qui rappelle que les données sont fictives et permet à un
// administrateur de remettre la démo dans son état de départ avant une
// présentation (reset_demo). Rien ne s'affiche dans une organisation réelle.
import { useEffect, useRef, useState } from 'react'
import { FlaskConical, Loader2, RotateCcw } from 'lucide-react'
import clsx from 'clsx'
import { supabase } from '@/utils/supabase/client'
import { useUserData } from '@/hooks/useUserData'

const when = (iso) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export default function DemoBadge({ organizationId, variant = 'pill' }) {
  const { organization, isAdmin } = useUserData(organizationId)
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [resetAt, setResetAt] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setConfirming(false) } }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  if (!organization?.is_demo) return null
  const lastReset = resetAt ?? organization.demo_reset_at

  const reset = async () => {
    setRunning(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('reset_demo', { p_org: organization.id })
    if (rpcError) {
      setError(rpcError.message || 'La réinitialisation a échoué.')
      setRunning(false)
      setConfirming(false)
      return
    }
    setResetAt(data?.reinitialisee_le ?? new Date().toISOString())
    // Rechargement complet : les données en mémoire (listes, fiches) sont périmées.
    window.location.href = `/${organization.id}/projects`
  }

  const panel = open && (
    <div
      role="dialog"
      aria-label="Démonstration"
      className={clsx(
        'absolute z-50 w-[320px] rounded-[12px] border border-filet bg-white p-4 shadow-[0_2px_4px_rgba(15,15,15,0.04),0_12px_32px_-8px_rgba(15,15,15,0.14)]',
        variant === 'nav' ? 'left-full bottom-0 ml-2' : 'right-0 top-full mt-2'
      )}
    >
      <p className="text-[14px] font-medium text-encre">Organisation de démonstration</p>
      <p className="text-[13px] text-mine mt-1 leading-relaxed">
        Toutes les données sont fictives. La remise à zéro recrée le scénario de démonstration
        (lots, réserves, tâches, observations, réunions, planning) avec des dates à partir d’aujourd’hui.
        Les plans et les documents déposés sont conservés.
      </p>
      {lastReset && <p className="text-[12px] text-mine-clair mt-2">Dernière remise à zéro : {when(lastReset)}</p>}
      {error && <p className="text-[13px] text-alerte mt-2">{error}</p>}
      {isAdmin ? (
        confirming ? (
          <div className="mt-3 rounded-[8px] bg-alerte-pale p-3">
            <p className="text-[13px] text-alerte">
              Tout ce qui a été saisi pendant la démo sera effacé. Continuer ?
            </p>
            <div className="flex justify-end gap-2 mt-2.5">
              <button
                onClick={() => setConfirming(false)}
                disabled={running}
                className="px-3 py-1.5 rounded-[8px] text-[13px] font-medium text-mine hover:bg-white"
              >
                Annuler
              </button>
              <button
                onClick={reset}
                disabled={running}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-encre text-white text-[13px] font-medium hover:bg-encre-survol disabled:opacity-60"
              >
                {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {running ? 'Réinitialisation…' : 'Réinitialiser'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-filet text-[13px] font-medium text-encre hover:bg-survol"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser la démo
          </button>
        )
      ) : null}
    </div>
  )

  return (
    <div className={clsx('relative', variant === 'nav' && 'mb-3')} ref={ref}>
      {variant === 'nav' ? (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] bg-tirage-pale text-tirage text-[13px] font-medium hover:brightness-95 transition"
        >
          <FlaskConical className="w-4 h-4" />
          <span className="flex-1 text-left">Démo · données fictives</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-tirage-pale text-tirage text-[12px] font-medium hover:brightness-95 transition"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Démo
        </button>
      )}
      {panel}
    </div>
  )
}
