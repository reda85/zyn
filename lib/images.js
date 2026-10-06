// Miniatures pour les grilles et listes : on n'affiche jamais une photo de
// chantier en pleine résolution dans une vignette de 48 px.
//
// 1. `thumb_url` de la ligne `pins_photos`, pour les petites vignettes seulement.
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

// Les `thumb_url` générés par l'application mobile sont de toutes petites
// images (2 à 3 Ko) : parfaites pour une vignette de liste, floues dès qu'on
// les affiche en grand.
const THUMB_MAX_DISPLAY_WIDTH = 160

/**
 * URL à utiliser pour afficher une ligne `pins_photos`.
 * @param options.width largeur d'affichage visée, en pixels
 */
export function photoThumbUrl(photo, options = {}) {
  if (!photo) return null
  const width = options.width ?? 320
  if (photo.thumb_url && width <= THUMB_MAX_DISPLAY_WIDTH) return photo.thumb_url
  return resizedImageUrl(photo.public_url, { ...options, width })
}
