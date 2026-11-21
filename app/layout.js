// app/layout.js

import './globals.css'


import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';


export const metadata = {
  title: 'Zaynspace - Suivi de projet',
  description: 'Réserves sur plan, photos et rapports de chantier en PDF, sur mobile et sur le web.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body >
        {children}
        <div id="portal-root"></div>
      </body>
    </html>
  )
}
