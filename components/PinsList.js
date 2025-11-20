import { Lexend, Figtree } from "next/font/google"
import CustomSelect from './customSelect'
import FilterPanel from './FilterPanel'
import { useState } from "react";
import { MapPinIcon } from "@heroicons/react/24/outline";
import { useAtom } from "jotai";
import { selectedPinAtom } from "@/store/atoms";
import Pin from "./Pin";
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
dayjs.extend(relativeTime);
dayjs.locale('fr');
const anek = Lexend({ subsets: ['latin'], weight: ['400', '700'] })

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}
export default function PinsList({ pins, plans }) {

  const [selectedPin, setSelectedPin] = useAtom(selectedPinAtom)
    

  return (
    <div className={classNames(anek.className,'overflow-auto')}>
        <div className="flex flex-row gap-2 p-2 items-baseline   ">
        <CustomSelect options={plans} selected={plans[0]}  />
        <FilterPanel  />
        </div>
        <div className="flex flex-row gap-2 p-2 justify-between items-baseline bg-stone-100 border border-gray-300 ">
<div className="flex flex-row gap-1 items-center ">
    <MapPinIcon className="h-4 w-4 text-gray-700" />
    <p className="text-gray-800 text-xs">{pins.length} Pins total</p>
    </div>
        </div>
    <div className="flex flex-col gap-2 p-2  ">
      {pins.map((pin,index) => (
        <div onClick={() =>{setSelectedPin(pin)}} key={pin.id} className={classNames("hover:cursor-pointer border  rounded p-2 flex flex-col gap-2",selectedPin?.id === pin.id ? 'bg-blue-100 border-blue-500' : 'border-gray-300 bg-gray-50')}>
         <div className="flex flex-row gap-2 items-center">
          <Pin pin={pin} />
          <div className="flex flex-col">
          <p className=" text-xs text-stone-500">ID: {index}</p>
          <p className="font-semibold text-xs text-stone-800">{(selectedPin?.id === pin.id ? selectedPin.name : pin.name)  || 'Pin sans nom'}</p>
          </div>
          </div>
         <div className="flex flex-row gap-2 items-center flex-wrap">
          { pin.pins_photos?.map((photo, index) => (
            
            <img key={index} src={photo.public_url} className="w-16 h-16 rounded-xl" />
          ))}
         
          
          </div>
          <p className=" text-xs text-stone-500"> {dayjs(pin.created_at).fromNow()}</p>
        </div>
      ))}
    </div>
    </div>
  )
}