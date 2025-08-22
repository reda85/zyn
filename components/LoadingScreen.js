import { categoriesAtom, statusesAtom } from "@/store/atoms";
import { supabase } from "@/utils/supabase/client";
import { useAtom } from "jotai";
import { useEffect } from "react";

export default function LoadingScreen({projectId}) {
    const [categories, setCategories] = useAtom(categoriesAtom)
    const [statuses, setStatuses] = useAtom(statusesAtom)
    useEffect(() => {
        const load = async () => {
      if (!categories) {
        const { data } = await supabase.from("categories").select("*").eq("project_id", projectId);
        setCategories(data ?? [])
      }
      if (!statuses) {
        const { data } = await supabase.from("Status").select("*").eq("project_id", projectId);
        setStatuses(data ?? [])
      }
      
    }
    load()

    }, []);
  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-200" />
    </div>
  );
}