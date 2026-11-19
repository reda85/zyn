// Types de rapport : chacun prend une nature d'élément et a sa présentation.
// Le backend applique la même table (src/pdf/reportKinds.js) : il ne garde que
// les éléments de la nature du rapport et pose ses réglages par défaut.

export const REPORT_KINDS = {
  reserves: {
    label: 'Rapport de réserves',
    short: 'Réserves',
    pinType: 'reserve',
    title: 'RAPPORT DE RÉSERVES',
    hint: 'Réserves par lot et entreprise, avec bilan des levées.',
    displayMode: 'list',
    fields: { description: true, photos: true, snapshot: true, assignedTo: true, dueDate: true, category: true, status: true, startDate: false, progress: false },
  },
  visite: {
    label: 'Rapport de visite',
    short: 'Visite',
    pinType: 'observation',
    title: 'RAPPORT DE VISITE DE CHANTIER',
    hint: 'Observations : photos, description et localisation.',
    displayMode: 'visite',
    fields: { description: true, photos: true, snapshot: true, assignedTo: false, dueDate: false, category: false, status: false, startDate: false, progress: false },
  },
  avancement: {
    label: "Rapport d'avancement",
    short: 'Avancement',
    pinType: 'tache',
    title: "RAPPORT D'AVANCEMENT",
    hint: 'Synthèse, lots, retards, jalons, planning (Gantt) et tâches par lot.',
    displayMode: 'table',
    fields: { description: false, photos: false, snapshot: false, assignedTo: true, dueDate: true, category: true, status: true, startDate: true, progress: true },
  },
  libre: {
    label: 'Rapport libre',
    short: 'Libre',
    pinType: null,
    title: 'RAPPORT DE TÂCHES',
    hint: 'Tous les éléments sélectionnés, sans tri par nature.',
    displayMode: 'list',
    fields: null, // ceux du modèle choisi
  },
}

export const REPORT_KIND_KEYS = Object.keys(REPORT_KINDS)

// Présentations du détail possibles pour chaque type (le serveur et la fenêtre
// de génération ignorent les autres).
export const MODES_FOR_KIND = {
  reserves:   ['list', 'table'],
  visite:     ['visite', 'localizedPhotos', 'photoGallery'],
  avancement: ['list', 'table'],
  libre:      ['list', 'table', 'photoGallery', 'localizedPhotos', 'visite'],
}

/**
 * Valeur d'un champ du rapport. Début et avancement étaient un seul champ,
 * « planning » : les anciens modèles l'ont encore et il vaut pour les deux.
 */
export function fieldValue(fields, key, fallback = true) {
  const f = fields || {}
  if (f[key] != null) return Boolean(f[key])
  if ((key === 'startDate' || key === 'progress') && f.planning != null) return Boolean(f.planning)
  return fallback
}

// Contenu du rapport d'avancement (config.progress côté backend).
export const PROGRESS_PARTS = [
  { key: 'lots',          label: 'Tableau des lots',              hint: 'Dates prévues et réelles, avancement, état' },
  { key: 'attention',     label: "Points d'attention",            hint: 'Lots et tâches en retard' },
  { key: 'milestones',    label: 'Jalons',                        hint: 'Atteints, dépassés, à venir' },
  { key: 'gantt',         label: 'Planning (Gantt)',              hint: 'Page paysage, ligne du jour' },
  { key: 'ganttTasks',    label: 'Tâches dans le planning',       hint: 'Sous chaque lot' },
  { key: 'details',       label: 'Détail des tâches',             hint: 'Tableau par lot' },
  { key: 'photos',        label: 'Reportage photo',               hint: 'Une page par tâche : photo, plan et avancement' },
  { key: 'workforce',     label: 'Effectifs de site',             hint: 'Personnel présent par entreprise' },
  { key: 'conclusion',    label: 'Recommandations et conclusion', hint: 'Texte libre en fin de rapport' },
  { key: 'planOverviews', label: "Vues d'ensemble des plans",     hint: 'Tâches localisées sur les plans' },
]
export const DEFAULT_PROGRESS = { lots: true, attention: true, milestones: true, gantt: true, ganttTasks: true, details: true, photos: true, workforce: true, conclusion: true, planOverviews: false }

/** Rapport adapté à l'onglet de la liste (nature affichée). */
export function kindForPinType(type) {
  return REPORT_KIND_KEYS.find((k) => REPORT_KINDS[k].pinType === type) ?? 'libre'
}

/** Un modèle sans type (créé avant les types de rapport) sert pour tous. */
export const templateKind = (template) => template?.kind || 'libre'
