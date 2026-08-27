'use client';
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useEffect, useState } from "react";
import { selectedProjectAtom } from '@/store/atoms'
import { supabase } from '@/utils/supabase/client'
import clsx from "clsx";
import { GeistSans } from 'geist/font/sans';
import Image from "next/image";
 
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
                  <div className={clsx("flex h-screen w-full items-center justify-center bg-[#fafaf9]", GeistSans.className)}>
                    <div className="text-center">
                      <div className="mb-6 flex justify-center">
                        <div className="w-12 h-12 bg-[#0d0d0c] rounded-[4px] flex items-center justify-center animate-pulse">
                          <Image src="/logo_blanc.png" alt="Logo Zaynspace" width={52} height={52} />
                        </div>
                      </div>
                      <h2 className="text-[17px] font-medium text-[#050505] mb-2">
                        Chargement...
                      </h2>
                      <p className="text-[13px] text-[#8a8a84]">
                        Veuillez patienter
                      </p>
                      <div className="mt-8 w-64 mx-auto">
                        <div className="h-1 bg-[#eeeeec] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0d0d0c] w-0 animate-[loading_1.5s_ease-in-out_infinite]"></div>
                        </div>
                      </div>
                    </div>
                    <style jsx>{`
                      @keyframes loading {
                        0% { width: 0%; margin-left: 0%; }
                        50% { width: 75%; margin-left: 0%; }
                        100% { width: 0%; margin-left: 100%; }
                      }
                    `}</style>
                  </div>
    )
}