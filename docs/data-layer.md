# Couche de données (web)

Règles en vigueur depuis la refonte « data layer ». À suivre pour tout nouvel écran.

## Qui possède quoi

| Donnée | Source | Accès |
| --- | --- | --- |
| Utilisateur, profil `members`, organisations, rôle | Layout serveur `app/(app)/layout.tsx` → `lib/session.ts` | `useUserData()` (aucune requête) |
| Projet, plans, catégories, statuts | `providers/ProjectProvider` (monté par `projects/[projectId]/layout.js`) | `useProjectData()` |
| Pins d'un plan | `usePlanPins(planId)` | tout le plan, filtré en mémoire |
| Tâches d'un projet | `useProjectPins(projectId, filters)` | paginé (50), filtré côté serveur |
| Pin ouvert dans le tiroir | `useSelectedPin()` | l'atom ne garde que l'identifiant |
| Filtres de pins | URL (`usePinFilters()`) | `lib/data/pinFilters.js` |

Les atoms Jotai (`store/atoms.js`) ne contiennent plus que de l'état d'interface.

## Règles

1. **Pas de `supabase.from()` dans un composant de liste ou de ligne.** Les lectures passent par un hook
   TanStack Query dont la clé (`lib/data/keys.js`) contient l'identifiant du projet ou du plan.
2. **Une seule forme de pin** : `pinSelect()` dans `lib/data/pins.js`, y compris après insertion ou mise à jour.
3. **Modifier un pin** : écrire en base, puis `usePinsCache().patchPin(id, patch)`. Ne jamais recopier une
   liste dans un state local.
4. **Rien de dérivé dans un state** : une liste filtrée se calcule (`useMemo`) ou se demande au serveur.
5. **Toute liste qui peut grossir est paginée** par curseur `(created_at, id)`. Lire « tout » se fait
   uniquement via `fetchAll()` (l'API plafonne à 1 000 lignes par réponse, sans erreur).
6. **Profil ou organisation modifiés** : `router.refresh()` pour recharger la session serveur.
7. **Miniatures** : `photoThumbUrl()` (`lib/images.js`) dans les grilles et listes.

## Variables d'environnement ajoutées

- `NEXT_PUBLIC_BACKEND_URL` (optionnelle) : URL du backend ; par défaut la production Railway.
- `NEXT_PUBLIC_IMAGE_TRANSFORMS=supabase` (optionnelle) : active le redimensionnement d'images Supabase
  pour les photos sans `thumb_url`. Option facturée à l'image d'origine au-delà du quota du plan.
