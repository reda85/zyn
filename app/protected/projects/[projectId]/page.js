'use client';
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { use } from "react";
import { useEffect, useState } from "react";
import {selectedProjectAtom} from '@/store/atoms'
import { supabase } from '@/utils/supabase/client'
 
export default function Projectreroute({params}) {
    const {projectId} = use(params);
    const [selectedProject, setProject] = useAtom(selectedProjectAtom);
    const router = useRouter();
    useEffect(() => {
        const fetchProject = async () => {
      const { data } = await supabase.from('projects').select('id,created_at,name,plans(id,name)').eq('id', projectId).single()
      setProject(data)
      router.push(`/protected/projects/${projectId}/${data.plans[0].id}`);
    }
        

        if(!selectedProject) {
 
        fetchProject();

        }
        else{
            router.push(`/protected/projects/${projectId}/${selectedProject.plans[0].id}`)
        }
        
    },[] )

    return(<></>)
}