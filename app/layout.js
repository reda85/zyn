// app/layout.js
import './globals.css'

export const metadata = {
  title: 'Project Manager',
  description: 'Manage project plans with Supabase and drag-and-drop PDFs',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="">{children}
        <div id="portal-root"></div>
      </body>
    </html>
  )
}
