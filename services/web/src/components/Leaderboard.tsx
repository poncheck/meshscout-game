'use client'

import { useLeaderboard } from '@/hooks/useLeaderboard'

interface Player {
  id: string
  username: string
  totalPoints: number
  totalTraceroutes: number
  longestRoute: number
}

export function Leaderboard() {
  const { players, isLoading } = useLeaderboard()

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 text-meshtastic-primary">
        Leaderboard
      </h2>

      {isLoading ? (
        <div className="text-gray-500">Loading...</div>
      ) : players && players.length > 0 ? (
        <div className="space-y-2">
          {players.map((player: Player, index: number) => (
            <div
              key={player.id}
              className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                    text-lg font-bold w-8 text-center
                    ${index === 0 ? 'text-yellow-400' : ''}
                    ${index === 1 ? 'text-gray-300' : ''}
                    ${index === 2 ? 'text-orange-400' : ''}
                    ${index > 2 ? 'text-gray-500' : ''}
                  `}
                  >
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{player.username}</p>
                    <p className="text-xs text-gray-400">
                      {player.totalTraceroutes} traceroutes
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-meshtastic-primary">
                    {player.totalPoints}
                  </p>
                  <p className="text-xs text-gray-400">points</p>
                </div>
              </div>
              {player.longestRoute > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  Longest: {player.longestRoute.toFixed(2)} km
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">
          No players yet. Be the first!
        </div>
      )}
    </div>
  )
}
