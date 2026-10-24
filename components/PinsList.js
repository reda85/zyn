import CustomSelect from './customSelect'
import PinFilterPanel from './PinFilterPanel'
import { useSelectedPin } from '@/hooks/usePins'
import { photoThumbUrl } from '@/lib/images'
import Pin from './Pin'
import StatusPill from './StatusPill'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { outfit } from '@/lib/fonts';

dayjs.extend(relativeTime)
dayjs.locale('fr')

function PinSkeleton() {
  return (
    <li className="px-4 py-3 flex items-start gap-2.5 border-b border-voile animate-pulse">
      <div className="w-5 h-5 rounded-full bg-voile flex-shrink-0" />
      <div className="flex-1">
        <div className="h-3 bg-voile rounded-[6px]" />
        <div className="h-2.5 bg-voile rounded-[6px] w-20 mt-2" />
      </div>
    </li>
  )
}

/**
 * @param pins     pins du plan après filtres (ceux affichés)
 * @param allPins  tous les pins du plan (options du panneau de filtres)
 */
export default function PinsList({ pins = [], allPins = pins, plans = [], currentPlan = null, projectId, organizationId, isLoading = false }) {
  const [selectedPin, setSelectedPin] = useSelectedPin()
  const router = useRouter()

  const activePlan = currentPlan ?? plans[0] ?? null

  return (
    <div
      className={clsx(
        outfit.className,
        'overflow-auto bg-white border-r border-filet [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
    >
      {/* Header */}
      <div className="flex flex-row gap-2 p-3 items-center bg-white">
        {activePlan && (
          <CustomSelect
            options={plans}
            selected={activePlan}
            onChange={(plan) => {
              router.push(`/${organizationId}/projects/${projectId}/${plan.id}`)
            }}
          />
        )}
        <PinFilterPanel variant="plan" projectId={projectId} pins={allPins} />
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between px-4 py-2 border-y border-filet bg-papier">
        <p className="text-[13px] text-mine tabular-nums">
          {isLoading ? '\u00a0' : `${pins.length} réserve${pins.length > 1 ? 's' : ''}`}
          {!isLoading && allPins.length !== pins.length && (
            <span className="text-mine-clair"> sur {allPins.length}</span>
          )}
        </p>
      </div>

      {/* Liste : des lignes séparées par des filets, la sélection en bleu de tirage. */}
      <ul className="bg-white min-h-[800px]">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <PinSkeleton key={i} />)
          : pins.map((pin) => {
              const isSelected = selectedPin?.id === pin.id
              return (
                <li
                  key={pin.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedPin(pin)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedPin(pin)}
                  className={clsx(
                    'relative cursor-pointer px-4 py-3 flex flex-col gap-2 border-b border-voile transition-colors',
                    isSelected
                      ? 'bg-tirage-pale before:absolute before:left-0 before:inset-y-0 before:w-[2px] before:bg-tirage'
                      : 'hover:bg-survol'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Pin pin={pin} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-encre leading-snug line-clamp-2">
                        {pin.name || 'Réserve sans titre'}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-[12px] text-mine-clair">
                        <StatusPill pin={pin} />
                        {pin.pin_number != null && <span className="font-mono text-mine">#{pin.pin_number}</span>}
                        {pin.categories?.name && <span className="truncate">{pin.categories.name}</span>}
                        <span className="ml-auto whitespace-nowrap">{dayjs(pin.created_at).fromNow()}</span>
                      </p>
                    </div>
                  </div>

                  {pin.pins_photos?.length > 0 && (
                    <div className="flex flex-row gap-1.5 items-center ml-[30px]">
                      {pin.pins_photos.slice(0, 4).map((photo, i) => (
                        <img
                          key={photo.id ?? i}
                          src={photoThumbUrl(photo, { width: 96 })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-[6px] object-cover bg-voile"
                        />
                      ))}
                      {pin.pins_photos.length > 4 && (
                        <span className="text-[12px] text-mine-clair tabular-nums">+{pin.pins_photos.length - 4}</span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
      </ul>
    </div>
  )
}