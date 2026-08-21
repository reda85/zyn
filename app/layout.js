// app/layout.js

import './globals.css'


import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

// on <html>: className={`${outfit.variable} ${lexend.variable}`}

export const metadata = {
  title: 'Zaynspace - Suivi de projet',
  description: 'Manage project plans with Supabase and drag-and-drop PDFs',
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
