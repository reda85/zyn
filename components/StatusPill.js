import { useProjectData } from '@/providers/ProjectProvider'
import clsx from 'clsx'

/**
 * Statut d'une réserve en pastille pleine, comme dans l'application mobile :
 * fond à la couleur du statut, libellé blanc.
 */
export default function StatusPill({ pin, className }) {
  const { statuses } = useProjectData()
  const status = statuses?.find((s) => s?.id === pin?.status_id)
  if (!status) return null

  return (
    <span
      className={clsx('inline-flex items-center h-5 px-2 rounded-full text-[12px] font-medium text-white whitespace-nowrap', className)}
      style={{ backgroundColor: pin?.isArchived ? '#4b5563' : status.color || '#9ca3af' }}
    >
      {pin?.isArchived ? 'Archivée' : status.name}
    </span>
  )
}
