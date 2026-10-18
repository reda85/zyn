import CustomSelect from './customSelect'
import PinFilterPanel from './PinFilterPanel'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { useSelectedPin } from '@/hooks/usePins'
import { photoThumbUrl } from '@/lib/images'
import Pin from './Pin'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

dayjs.extend(relativeTime)
dayjs.locale('fr')

function PinSkeleton() {
  return (
    <div className="bg-white border border-[#d6d6d2] shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)] rounded-[4px] p-3 flex flex-col gap-2 animate-pulse">
      {/* Status dot + name */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-[#eeeeec] flex-shrink-0" />
        <div className="h-3 bg-[#eeeeec] rounded-[3px] flex-1" />
      </div>
      {/* Date */}
      <div className="h-2.5 bg-[#eeeeec] rounded-[3px] w-20 ml-7" />
    </div>
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
        GeistSans.className,
        'overflow-auto bg-[#fafaf9] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
      )}
    >
      {/* Header */}
      <div className="flex flex-row gap-2 p-3 items-baseline">
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

      {/* Counter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#eeeeec] border-y border-[#e5e5e2]">
        <MapPinIcon className="h-3.5 w-3.5 text-[#8a8a84]" />
        <p className={clsx('text-[#4a4a46] text-[11px] font-medium', GeistMono.className)}>
          {isLoading ? '—' : `${pins.length} pins`}
        </p>
      </div>

      {/* Pins list */}
      <div className="flex flex-col gap-2 p-3 min-h-[800px]">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <PinSkeleton key={i} />)
          : pins.map((pin) => {
              const isSelected = selectedPin?.id === pin.id
              return (
                <div
                  key={pin.id}
                  onClick={() => setSelectedPin(pin)}
                  className={clsx(
                    'cursor-pointer rounded-[4px] p-3 flex flex-col gap-2 transition-all',
                    isSelected
                      ? 'bg-[#f5f5f4] border border-[#e5e5e2] hover:border-[#d6d6d2] hover:shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)]'
                      : 'bg-white border border-[#d6d6d2] shadow-[0_1px_2px_rgba(15,15,15,0.04),0_1px_1px_rgba(15,15,15,0.03)]'
                  )}
                >
                  {/* Header: status + name */}
                  <div className="flex items-center gap-2">
                    <Pin pin={pin} />
                    <span className="text-[13px] font-medium text-[#0d0d0c] truncate flex-1">
                      {pin.name || 'Pin sans nom'}
                    </span>
                  </div>

                  {/* Photos */}
                  {pin.pins_photos?.length > 0 && (
                    <div className="flex flex-row gap-1.5 items-center flex-wrap ml-7">
                      {pin.pins_photos.slice(0, 3).map((photo, i) => (
                        <img
                          key={photo.id ?? i}
                          src={photoThumbUrl(photo, { width: 96 })}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 rounded-[3px] border border-[#e5e5e2] object-cover"
                        />
                      ))}
                      {pin.pins_photos.length > 3 && (
                        <span className={clsx('text-[11px] font-medium text-[#8a8a84]', GeistMono.className)}>
                          + {pin.pins_photos.length - 3} photos
                        </span>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <p className={clsx('text-[11px] text-[#b8b8b3] ml-7', GeistMono.className)}>
                    {dayjs(pin.created_at).fromNow()}
                  </p>
                </div>
              )
            })}
      </div>
    </div>
  )
}