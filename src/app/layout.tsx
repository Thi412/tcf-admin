import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TCF Admin',
  description: 'Gestion des sujets TCF Practice',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
