import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useStats() {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/api/stats`,
    fetcher,
    {
      refreshInterval: 5000, // Refresh every 5 seconds
    }
  )

  return {
    stats: data,
    isLoading,
    error,
  }
}
