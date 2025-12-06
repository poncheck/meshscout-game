import useSWR from 'swr'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function useH3Grid() {
  const { data, error, isLoading } = useSWR(
    `${API_URL}/api/h3/grid?minActivity=5`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
    }
  )

  return {
    grids: data?.grids || [],
    isLoading,
    error,
  }
}
