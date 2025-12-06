'use client'

import { useStats } from '@/hooks/useStats'

export function StatsPanel() {
  const { stats, isLoading } = useStats()

  if (isLoading || !stats) {
    return (
      <div className="flex gap-6 text-sm">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-6 text-sm">
      <div>
        <p className="text-gray-400">Active Nodes</p>
        <p className="text-xl font-bold text-meshtastic-primary">
          {stats.nodes.active24h}
        </p>
      </div>
      <div>
        <p className="text-gray-400">Packets (24h)</p>
        <p className="text-xl font-bold text-blue-400">
          {stats.packets.last24h.toLocaleString()}
        </p>
      </div>
      <div>
        <p className="text-gray-400">Packets/sec</p>
        <p className="text-xl font-bold text-purple-400">
          {stats.packets.perSecond}
        </p>
      </div>
      <div>
        <p className="text-gray-400">Players</p>
        <p className="text-xl font-bold text-yellow-400">
          {stats.players.total}
        </p>
      </div>
    </div>
  )
}
