import { Lexend, Figtree, Rubik, Outfit } from "next/font/google"
import CustomSelect from './customSelect'
import FilterPanel from './FilterPanel'
import { useState } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { useAtom } from "jotai";
import { selectedPinAtom, selectedPlanAtom } from "@/store/atoms";
import Pin from "./Pin";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
dayjs.extend(relativeTime);
dayjs.locale('fr');

// Utiliser les fonts de votre page d'accueil
const lexend = Outfit({ subsets: ['latin'], display: 'swap' })

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function PinsList({ pins, plans, user }) {

  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
  const [selectedPlan, setSelectedPlan] = useAtom(selectedPlanAtom)
   
  const activePlan = plans.find(p => p.id === selectedPlan?.id) || plans[0];

  return (
    <div className={classNames(lexend.className,'overflow-auto  bg-white')}>
        {/* Header avec Select et Filter */}
        <div className="flex flex-row gap-2 p-4 items-baseline">
          <CustomSelect options={plans} selected={activePlan} onChange={setSelectedPlan} />
          <FilterPanel user={user} />
        </div>
        
        {/* Barre de comptage - Style cohérent */}
        <div className="flex flex-row gap-2 px-4 py-3 justify-between items-baseline bg-neutral-100 border border-border/50 backdrop-blur-sm">
          <div className="flex flex-row gap-2 items-center">
            <MapPinIcon className="h-4 w-4 text-muted-foreground" />
            <p className="text-foreground text-xs font-medium">{pins.length} Pins total</p>
          </div>
        </div>
        
        {/* Liste des pins */}
        <div className="flex flex-col gap-3 p-4">
          {pins.map((pin, index) => (
            <div 
              onClick={() => {setSelectedPin(pin)}} 
              key={pin.id} 
              className={classNames(
                "hover:cursor-pointer border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5",
                selectedPin?.id === pin.id 
                  ? 'bg-neutral-200 border-primary/50 shadow-md shadow-primary/10' 
                  : 'bg-neutral-100 border-border/50 hover:border-primary/20 hover:bg-secondary/50'
              )}
            >
              {/* Header du pin */}
              <div className="flex flex-row gap-3 items-center">
                <Pin pin={pin} />
                <div className="flex flex-col">
                  <p className="text-xs text-muted-foreground font-medium">ID: {index}</p>
                  <p className={classNames("font-semibold text-sm text-foreground font-heading",lexend.className)}>
                    {(selectedPin?.id === pin.id ? selectedPin.name : pin.name) || 'Pin sans nom'}
                  </p>
                </div>
              </div>
              
              {/* Photos */}
              <div className="flex flex-row gap-2 items-center flex-wrap">
                {pin.pins_photos?.map((photo, index) => (
                  <img 
                    key={index} 
                    src={photo.public_url} 
                    className="w-16 h-16 rounded-lg border border-border/50 object-cover shadow-sm hover:shadow-md transition-shadow" 
                  />
                ))}
              </div>
              
              {/* Date */}
              <p className="text-xs text-muted-foreground">
                {dayjs(pin.created_at).fromNow()}
              </p>
            </div>
          ))}
        </div>
    </div>
  )
}