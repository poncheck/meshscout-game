import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MeshScout - Meshtastic Game',
  description: 'Multiplayer location-based game using Meshtastic network',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-meshtastic-dark text-white">{children}</body>
    </html>
  )
}
