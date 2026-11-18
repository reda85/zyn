# Vidéos ZaynSpace

Sur le modèle des vidéos Lotio (`reda85/promogest`, `marketing/motion/lotio`).

| Fichier | Format | Durée | Usage |
|---|---|---|---|
| `zaynspace-promo.mp4` | 9:16 · 1080×1920, avec musique | 46 s | TikTok, Instagram Reels, YouTube Shorts, LinkedIn |
| `public/landing/zaynspace-demo.mp4` (+ `.webm`, poster `.webp`) | 16:9 · 1600×900, muette, en boucle | 36 s | Page d'accueil, section « De la visite au rapport » |

## Déroulé (version verticale)

1. accroche : « Vos réserves sur WhatsApp et un carnet ? », fichiers et notes éparpillés ;
2. logo : le pin tombe sur le calque bleu de tirage, « Le chantier documenté avant
   d'avoir quitté le site. » ;
3. **plans** : un PDF déposé, chaque page devient un plan, optimisé pour le mobile ;
4. **sur le chantier** (téléphone) : on touche le plan, les cinq réserves se posent ;
5. **photos et dictée** (téléphone) : photo localisée, croquis, remarque dictée
   en darija ou en français ;
6. **suivi des levées** : les statuts passent de « Bloquée » à « À valider » puis « Levée » ;
7. **versions de plans** : l'indice B balaie l'indice A, ajouts et suppressions ressortent ;
8. **planning** : Gantt par lot, jour courant, lot en retard, réception ;
9. **rapport de visite** : génération, page PDF à l'en-tête de l'agence, PDF et Word ;
10. **invités gratuits** : entreprises, contrôle et maître d'ouvrage, 0 MAD ;
11. « Votre prochaine visite, rapport compris. », « Essai gratuit 14 jours », zaynspace.com.

La version 16:9 reprend les scènes 3 à 10, titre à gauche et carte animée à droite.

Charte de la page d'accueil (`app/globals.css`, `.zs-vitrine`) : encre `#1c1c1a`,
papier calque `#f8f8f6`, bleu de tirage `#2c4f91`, police Geist. Statuts des
réserves comme dans `components/landing/PlanDemo.tsx`. Le logo est
`public/logo.png` vectorisé. Projet, entreprises et chiffres sont fictifs.

## Musique

Bande-son originale synthétisée par `music.py` (aucun échantillon, aucun droit
à payer), calée sur le montage : impact quand le pin du logo touche le calque,
whoosh à chaque scène, clics sur les pins et les statuts, cloches sur les moments
forts. Volume normalisé à -14 LUFS. Pour un son tendance TikTok à la place,
baissez le son d'origine à 0 dans l'éditeur de TikTok.

## Modifier et ré-exporter

Textes, minutage et couleurs sont dans `zaynspace-promo.html` : ouvrez-le dans un
navigateur pour le prévisualiser (`?land=1` pour la version 16:9, `?t=12.5` pour
figer une image). Les polices viennent de `node_modules/geist` : faites
`npm install` avant.

Export, avec Node, Playwright (paquet `playwright` ou `playwright-core`), ffmpeg
et python3 + numpy :

```bash
node marketing/motion/zaynspace/render.mjs           # 9:16 avec musique
node marketing/motion/zaynspace/render.mjs --mute    # sans musique
node marketing/motion/zaynspace/render.mjs --land /chemin/zaynspace-demo-master.mp4
ffmpeg -i zaynspace-demo-master.mp4 -an -vf scale=1600:-2 -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart public/landing/zaynspace-demo.mp4
ffmpeg -i zaynspace-demo-master.mp4 -an -vf scale=1600:-2 -c:v libvpx-vp9 -b:v 0 -crf 40 -row-mt 1 public/landing/zaynspace-demo.webm
ffmpeg -ss 17.3 -i zaynspace-demo-master.mp4 -frames:v 1 -vf scale=1600:-2 -c:v libwebp -quality 85 public/landing/zaynspace-demo-poster.webp
```

Chromium ailleurs que là où Playwright l'attend : `CHROMIUM_PATH=/chemin/vers/chrome`.
