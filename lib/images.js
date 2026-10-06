// Miniatures pour les grilles et listes : on n'affiche jamais une photo de
// chantier en pleine résolution dans une vignette de 48 px.
//
// 1. `thumb_url` de la ligne `pins_photos` quand il est renseigné.
// 2. Sinon, transformation d'image Supabase (redimensionnement à la volée),
//    uniquement si NEXT_PUBLIC_IMAGE_TRANSFORMS=supabase : l'option est
//    facturée par image d'origine au-delà du quota inclus, donc désactivée
//    par défaut.
// 3. Sinon, l'URL d'origine (le navigateur charge en différé via loading="lazy").

const TRANSFORMS_ENABLED = process.env.NEXT_PUBLIC_IMAGE_TRANSFORMS === 'supabase'
const OBJECT_PATH = '/storage/v1/object/public/'
const RENDER_PATH = '/storage/v1/render/image/public/'

export function resizedImageUrl(url, { width = 320, quality = 70 } = {}) {
  if (!url || !TRANSFORMS_ENABLED || !url.includes(OBJECT_PATH)) return url
  const [base, query] = url.split('?')
  const params = new URLSearchParams(query ?? '')
  params.set('width', String(width))
  params.set('quality', String(quality))
  params.set('resize', 'contain')
  return `${base.replace(OBJECT_PATH, RENDER_PATH)}?${params}`
}

/** URL à utiliser pour afficher une ligne `pins_photos` en vignette. */
export function photoThumbUrl(photo, options) {
  if (!photo) return null
  return photo.thumb_url || resizedImageUrl(photo.public_url, options)
}
