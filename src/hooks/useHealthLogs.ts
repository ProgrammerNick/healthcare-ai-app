import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'

export interface HealthLog {
  id: string
  seniorId: string
  logType: string
  value: string
  recordedAt: string
  source: string
  notes: string | null
}

async function fetchHealthLogs(
  getToken: () => Promise<string | null>,
  seniorId: string,
  days: number
): Promise<HealthLog[]> {
  const token = await getToken()
  if (!token) return []

  const res = await fetch(`/api/health-logs?senior_id=${seniorId}&days=${days}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch health logs')
  }

  const data = (await res.json()) as { logs: HealthLog[] }
  return data.logs
}

export function useHealthLogs(seniorId: string | undefined, days = 30) {
  const { getToken, isSignedIn } = useAuth()

  return useQuery<HealthLog[]>({
    queryKey: ['health-logs', seniorId, days],
    queryFn: () => fetchHealthLogs(getToken, seniorId!, days),
    enabled: !!isSignedIn && !!seniorId,
    refetchInterval: 60_000,
  })
}
