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
    fields: { description: true, photos: true, snapshot: true, assignedTo: true, dueDate: true, category: true, status: true, planning: false },
  },
  visite: {
    label: 'Rapport de visite',
    short: 'Visite',
    pinType: 'observation',
    title: 'RAPPORT DE VISITE DE CHANTIER',
    hint: 'Observations : photos, description et localisation.',
    displayMode: 'visite',
    fields: { description: true, photos: true, snapshot: true, assignedTo: false, dueDate: false, category: false, status: false, planning: false },
  },
  avancement: {
    label: "Rapport d'avancement",
    short: 'Avancement',
    pinType: 'tache',
    title: "RAPPORT D'AVANCEMENT",
    hint: 'Tâches par lot, avec dates et avancement.',
    displayMode: 'table',
    fields: { description: false, photos: false, snapshot: false, assignedTo: true, dueDate: true, category: true, status: true, planning: true },
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

/** Rapport adapté à l'onglet de la liste (nature affichée). */
export function kindForPinType(type) {
  return REPORT_KIND_KEYS.find((k) => REPORT_KINDS[k].pinType === type) ?? 'libre'
}

/** Un modèle sans type (créé avant les types de rapport) sert pour tous. */
export const templateKind = (template) => template?.kind || 'libre'
