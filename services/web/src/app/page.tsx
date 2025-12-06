'use client'

import { MapView } from '@/components/MapView'
import { StatsPanel } from '@/components/StatsPanel'
import { Leaderboard } from '@/components/Leaderboard'

export default function Home() {
  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-meshtastic-dark border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-meshtastic-primary">MeshScout</h1>
            <p className="text-sm text-gray-400">Real-time Meshtastic Network Game</p>
          </div>
          <StatsPanel />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Map - takes most of the space */}
        <div className="flex-1 relative">
          <MapView />
        </div>

        {/* Sidebar - Leaderboard */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto">
          <Leaderboard />
        </div>
      </div>
    </main>
  )
}
