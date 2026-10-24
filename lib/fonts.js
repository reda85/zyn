// Police de l'application web : Outfit, comme l'application mobile.
// Fichier local (paquet @fontsource-variable/outfit) : aucun appel à Google Fonts au build.
import localFont from 'next/font/local';

export const outfit = localFont({
  src: '../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2',
  weight: '100 900',
  display: 'swap',
  variable: '--font-outfit',
});
