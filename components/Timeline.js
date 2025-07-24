import { supabase } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import dayjs from "dayjs"
import { Switch } from "@headlessui/react"

export default function Timeline({ pin }) {
    const [events, setEvents] = useState([])
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        if (pin) {
           getEvents(pin.id)
        }
    }, [pin])

    const getEvents = async (pinId) => {
        const { data, error } = await supabase
            .from('events')
            .select('id,created_at,event,pins_photos(*),category,pin_id(id,assigned_to(id,name),name,pdf_name,project_id)')
            .eq('pin_id', pinId)
            .order('created_at', { ascending: false })
        if (data) {
            setEvents(data)
        }
        if (error) {
            console.log('getEvents', error)
        }
    }

    return (
        <div className="bg-gray-100">
            <div className="flex flex-row items-center justify-between p-3 bg-gray-200">
                <p className="text-xs text-gray-700">Afficher tous les événements</p>
                <Switch
                    checked={enabled}
                    onChange={setEnabled}
                    className={`${
                        enabled ? 'bg-blue-600' : 'bg-gray-500'
                    } relative inline-flex h-5 w-9 items-center rounded-full transition`}
                >
                    <span
                        className={`${
                            enabled ? 'translate-x-5' : 'translate-x-1'
                        } inline-block h-3 w-3 transform bg-white rounded-full transition`}
                    />
                </Switch>
            </div>
            
            <div className="relative">
                {/* Vertical dashed timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-300" style={{ border: '2px dashed #9CA3AF' }} />
                
                {events.map((item) => {
                    const timestamp = dayjs(item.created_at).format('MMM D, YYYY h:mm A');
                    const photo = item.pins_photos;
                    const assignedName = item.pin_id?.assigned_to?.name || 'Unknown';
                    const initial = assignedName.charAt(0).toUpperCase();

                    return (
                        <div
                            key={item.id}
                            className="relative mb-4 rounded-lg shadow-sm overflow-hidden  ml-8"
                        >
                            <div className="flex items-center p-3">
                                {/* Avatar with initial */}
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-lg z-10">
                                    {initial}
                                </div>
                                
                                <div className="ml-3">
                                    <div className="text-sm font-semibold text-gray-800">
                                        {item.category === 'photo_upload'
                                            ? 'Photo ajouté'
                                            : item.category}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{timestamp}</div>
                                </div>
                            </div>

                            {photo?.public_url && (
                                <div className="relative w-full h-[300px] bg-gray-200">
                                    <Image src={photo.public_url} alt="event photo" fill className="object-cover" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}