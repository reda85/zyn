import { Outfit } from 'next/font/google'
import CustomSelect from './customSelect'
import FilterPanel from './FilterPanel'
import { MapPinIcon } from '@heroicons/react/24/outline'
import { useAtom } from 'jotai'
import { selectedPinAtom, selectedPlanAtom } from '@/store/atoms'
import Pin from './Pin'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/fr'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

dayjs.extend(relativeTime)
dayjs.locale('fr')

const outfit = Outfit({ subsets: ['latin'], display: 'swap' })

export default function PinsList({ pins = [], plans = [], user, projectId, organizationId }) {
  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
  const router = useRouter()

  const activePlan =
    plans.find((p) => p?.id === selectedPlan?.id) ?? plans[0] ?? null

  return (
    <div
      className={clsx(
        outfit.className,
        'overflow-auto bg-neutral-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
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
        <FilterPanel user={user} projectId={projectId} />
      </div>

      {/* Counter bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 border-y border-neutral-200">
        <MapPinIcon className="h-3.5 w-3.5 text-neutral-400" />
        <p className="text-neutral-600 text-[11px] font-medium">
          {pins.length} pins
        </p>
      </div>

      {/* Pins list */}
      <div className="flex flex-col gap-2 p-3 min-h-[800px]">
        {pins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id
          return (
            <div
              key={pin.id}
              onClick={() => setSelectedPin(pin)}
              className={clsx(
                'cursor-pointer rounded-lg p-3 flex flex-col gap-2 transition-all',
                isSelected
                  ? 'bg-white border border-neutral-300 shadow-sm'
                  : 'bg-gray-100 border border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
              )}
            >
              {/* Header: status + name */}
              <div className="flex items-center gap-2">
                <Pin pin={pin} />
                <span className="text-[13px] font-medium text-neutral-900 truncate flex-1">
                  {(isSelected ? selectedPin.name : pin.name) || 'Pin sans nom'}
                </span>
              </div>

              {/* Photos */}
              {pin.pins_photos?.length > 0 && (
                <div className="flex flex-row gap-1.5 items-center flex-wrap ml-7">
                  {pin.pins_photos.map((photo, i) => (
                    <img
                      key={i}
                      src={photo.public_url}
                      className="w-12 h-12 rounded-md border border-neutral-200 object-cover"
                    />
                  ))}
                </div>
              )}

              {/* Date */}
              <p className="text-[11px] text-neutral-300 ml-7">
                {dayjs(pin.created_at).fromNow()}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}