import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useLeaderboard(limit = 20) {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/api/leaderboard?limit=${limit}`,
    fetcher,
    {
      refreshInterval: 15000, // Refresh every 15 seconds
    }
  )

  return {
    players: data?.players || [],
    isLoading,
    error,
  }
}
