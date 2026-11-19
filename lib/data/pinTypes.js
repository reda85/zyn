// Nature d'un élément de la liste : réserve, tâche ou observation (pdf_pins.type).

export const PIN_TYPES = {
  reserve: {
    label: 'Réserve',
    plural: 'Réserves',
    short: 'Rés.',
    hint: 'Défaut constaté à lever',
    className: 'bg-alerte-pale text-alerte',
  },
  tache: {
    label: 'Tâche',
    plural: 'Tâches',
    short: 'Tâche',
    hint: 'Travail à faire, planifiable',
    className: 'bg-tirage-pale text-tirage',
  },
  observation: {
    label: 'Observation',
    plural: 'Observations',
    short: 'Obs.',
    hint: 'Constat ou remarque, sans travail attendu',
    className: 'bg-voile text-mine',
  },
}

export const PIN_TYPE_KEYS = Object.keys(PIN_TYPES)

export const pinTypeLabel = (type) => PIN_TYPES[type]?.label ?? 'Réserve'
