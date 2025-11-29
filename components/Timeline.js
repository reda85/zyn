import { supabase } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import Image from "next/image"
import dayjs from "dayjs"
import { Switch } from "@headlessui/react"
import { Clock, User } from "lucide-react"
import 'dayjs/locale/fr'

dayjs.locale('fr')

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
            .select('id,created_at,members(*),event,pins_photos(*),category,pin_id(id,assigned_to(id,name),name,pdf_name,project_id)')
            .eq('pin_id', pinId)
            .order('created_at', { ascending: true })
        if (data) {
            setEvents(data)
            console.log('getEvents', data)
        }
        if (error) {
            console.log('getEvents', error)
        }
    }

    return (
        <div className="bg-secondary/20 font-sans">
            {/* Header with Toggle */}
            <div className="flex flex-row items-center justify-between p-4 bg-secondary/40 border-b border-border/50">
                <p className="text-sm font-medium text-foreground">Afficher tous les événements</p>
                <Switch
                    checked={enabled}
                    onChange={setEnabled}
                    className={`${
                        enabled ? 'bg-primary' : 'bg-muted'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2`}
                >
                    <span
                        className={`${
                            enabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform bg-white rounded-full transition-transform shadow-sm`}
                    />
                </Switch>
            </div>
            
            <div className="relative p-6">
                {/* Vertical dashed timeline line */}
                <div 
                    className="absolute left-9 top-0 bottom-0 w-0.5" 
                    style={{ 
                        backgroundImage: 'repeating-linear-gradient(0deg, hsl(var(--border)), hsl(var(--border)) 8px, transparent 8px, transparent 16px)',
                        opacity: 0.5
                    }} 
                />
                
                {events.length === 0 && (
                    <div className="text-center py-12">
                        <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Aucun événement pour le moment</p>
                    </div>
                )}

                {events.map((item) => {
                    const timestamp = dayjs(item.created_at).format('D MMM YYYY à HH:mm');
                    const photo = item.pins_photos;
                    const userName = item.members?.name || 'Inconnu';
                    const initial = userName.charAt(0).toUpperCase();

                    return (
                        <div
                            key={item.id}
                            className="relative mb-8 ml-14"
                        >
    

                            {/* Event Content - No Card */}
                            <div>
                                {/* Header */}
                                <div className="flex items-center pb-3 gap-3">
                                    {/* Avatar with initial */}
                                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                                        {initial}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex flex-row items-baseline gap-2 flex-wrap">
                                            <span className="text-sm font-semibold font-heading text-foreground">
                                                {item?.members?.name}
                                            </span>
                                            {item.category !== 'photo_upload' && item.event && (
                                                <span className="text-sm text-muted-foreground">
                                                    {item.event}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                         
                                            {timestamp}
                                        </div>
                                    </div>
                                </div>

                                {/* Photo */}
                                {photo?.public_url && (
                                    <div className="relative w-full h-[300px] bg-secondary/30 rounded-lg overflow-hidden border border-border/40">
                                        <Image 
                                            src={photo.public_url} 
                                            alt="event photo" 
                                            fill 
                                            className="object-cover" 
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}