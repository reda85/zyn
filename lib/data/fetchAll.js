// L'API Supabase plafonne chaque réponse (1 000 lignes par défaut) sans le
// signaler. Pour les rares lectures qui ont réellement besoin de tout
// (pins d'un plan, export), on lit par tranches jusqu'à épuisement.
const CHUNK = 1000

/**
 * @param {() => any} buildQuery fabrique une requête neuve (ordre stable inclus)
 * @param {{ max?: number }} [options] garde-fou sur le nombre total de lignes
 */
export async function fetchAll(buildQuery, { max = 20000 } = {}) {
  const rows = []
  for (let from = 0; from < max; from += CHUNK) {
    const { data, error } = await buildQuery().range(from, from + CHUNK - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < CHUNK) break
  }
  return rows
}
