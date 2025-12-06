import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useNodes() {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/api/nodes?active=true&limit=500`,
    fetcher,
    {
      refreshInterval: 10000, // Refresh every 10 seconds
    }
  )

  return {
    nodes: data?.nodes || [],
    isLoading,
    error,
  }
}
