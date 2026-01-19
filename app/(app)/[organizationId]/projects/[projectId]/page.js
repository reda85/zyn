'use client';
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useEffect, useState } from "react";
import { selectedProjectAtom } from '@/store/atoms'
import { supabase } from '@/utils/supabase/client'
 
export default function Projectreroute({params}) {
    const {projectId,organizationId} = params;
    const [selectedProject, setProject] = useAtom(selectedProjectAtom);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    
    useEffect(() => {
        const fetchProject = async () => {
            try {
                console.log('Fetching project reroute...', projectId);
                const { data,error } = await supabase
                    .from('plans')
                    .select('id')
                    .eq('project_id', projectId)
                    .is('deleted_at', null)
                    .limit(1)
                    .single();
                
                if (error) console.error('Error fetching project supabase:', error);
if(data) console.log('Fetched project in reroute:', data);
                //setProject(data)
                router.push(`/${organizationId}/projects/${projectId}/${data?.id}`);
            } catch (error) {
                console.error('Error fetching project:', error);
                setIsLoading(false);
            }
        }

       
            fetchProject();
       
    }, [projectId])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center font-sans">
            <div className="text-center">
                {/* Logo animé */}
                <div className="mb-8 flex justify-center">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 animate-pulse">
                        <span className="text-primary-foreground font-bold text-3xl font-heading">z</span>
                    </div>
                </div>
                
                {/* Texte de chargement */}
                <h2 className="text-2xl font-bold font-heading text-foreground mb-3 opacity-0 animate-fadeInUp">
                    Chargement du projet...
                </h2>
                <p className="text-muted-foreground opacity-0 animate-fadeInUp" style={{ animationDelay: '150ms' }}>
                    Veuillez patienter
                </p>
                
                {/* Barre de progression animée */}
                <div className="mt-8 w-64 mx-auto">
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                @keyframes loading {
                    0% {
                        width: 0%;
                        margin-left: 0%;
                    }
                    50% {
                        width: 75%;
                        margin-left: 0%;
                    }
                    100% {
                        width: 0%;
                        margin-left: 100%;
                    }
                }
            `}</style>
        </div>
    )
}