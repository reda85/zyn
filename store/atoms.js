import { atom } from 'jotai'

// Les atoms ne portent plus que de l'état d'interface.
// Les données serveur (projet, plans, catégories, statuts, pins…) vivent dans
// le cache TanStack Query : voir `hooks/` et `providers/ProjectProvider`.

/** Identifiant du pin ouvert dans le tiroir ; l'objet se lit via `useSelectedPin()`. */
export const selectedPinIdAtom = atom(null)

/** Pin (ou identifiant) sur lequel la vue plan doit se centrer une fois chargée. */
export const focusOnPinAtom = atom(null)

/** Organisation courante, écrite uniquement par `SessionProvider` à partir de l'URL. */
export const selectedOrganizationAtom = atom(null)
