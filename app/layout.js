// app/layout.js
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'Project Manager',
  description: 'Manage project plans with Supabase and drag-and-drop PDFs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
        <div id="portal-root"></div>
      </body>
    </html>
  )
}
