import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/utils/supabase/client'
import { qk } from '@/lib/data/keys'

/** Tags d'un projet, partagés entre le filtre, l'éditeur et la page médias. */
export function useProjectTags(projectId) {
  return useQuery({
    queryKey: qk.tags(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId)
        .order('order', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(projectId),
  })
}
