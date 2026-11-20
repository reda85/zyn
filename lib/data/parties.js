import { supabase } from '@/utils/supabase/client'

// Intervenants d'un projet, repris dans le cartouche des rapports.
export const PARTY_ROLES = [
  "Maître d'ouvrage",
  "Maître d'ouvrage délégué",
  "Assistant à maîtrise d'ouvrage",
  "Maître d'œuvre",
  'Architecte',
  "Bureau d'études",
  'Bureau de contrôle',
  'OPC',
  'Bureau de suivi',
  'Laboratoire',
  'Entreprise générale',
]

export const PARTY_COLUMNS = 'id,project_id,role,name,detail,logo_url,sort_order'

export async function fetchParties(projectId) {
  const { data, error } = await supabase
    .from('project_parties')
    .select(PARTY_COLUMNS)
    .eq('project_id', projectId)
    .order('sort_order')
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function saveParty(party) {
  const row = {
    project_id: party.project_id,
    role: party.role.trim(),
    name: party.name.trim(),
    detail: party.detail?.trim() || null,
    logo_url: party.logo_url || null,
    sort_order: party.sort_order ?? 0,
  }
  const query = party.id
    ? supabase.from('project_parties').update(row).eq('id', party.id)
    : supabase.from('project_parties').insert(row)
  const { data, error } = await query.select(PARTY_COLUMNS).single()
  if (error) throw error
  return data
}

export async function deleteParty(id) {
  const { error } = await supabase.from('project_parties').delete().eq('id', id)
  if (error) throw error
}

/** Réordonne : la position dans la liste devient sort_order. */
export async function reorderParties(parties) {
  await Promise.all(parties.map((p, i) =>
    supabase.from('project_parties').update({ sort_order: i }).eq('id', p.id).then(({ error }) => { if (error) throw error })))
}

export async function uploadPartyLogo(projectId, file) {
  if (!file.type.startsWith('image/')) throw new Error('Le fichier doit être une image')
  if (file.size > 5 * 1024 * 1024) throw new Error('Le logo ne doit pas dépasser 5 Mo')
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `party-logos/${projectId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('projects').upload(path, file, { contentType: file.type, upsert: true })
  if (error) throw error
  return supabase.storage.from('projects').getPublicUrl(path).data.publicUrl
}
