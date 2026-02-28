// app/layout.js

import './globals.css'

import { Outfit, Lexend } from "next/font/google";
const outfit = Outfit({ subsets: ["latin"], weight: ["300","400","500","600","700"], variable: "--font-outfit" });
const lexend = Lexend({ subsets: ["latin"], weight: ["600","700"], variable: "--font-lexend" });
// on <html>: className={`${outfit.variable} ${lexend.variable}`}

export const metadata = {
  title: 'Zaynspace - Suivi de projet',
  description: 'Manage project plans with Supabase and drag-and-drop PDFs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${lexend.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
        <div id="portal-root"></div>
      </body>
    </html>
  )
}
