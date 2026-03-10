import { useAuth } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

export interface VibeCheckResult {
  sentiment_score: number
  flags: {
    lethargy: boolean
    confusion: boolean
    distress: boolean
    isolation: boolean
  }
  summary: string
  alert_level: 'none' | 'watch' | 'urgent'
  recommended_actions: string[]
}

export function useVibeCheck() {
  const { getToken } = useAuth()
  const [latestResult, setLatestResult] = useState<VibeCheckResult | null>(null)

  const mutation = useMutation({
    mutationFn: async (seniorId: string) => {
      const token = await getToken()
      const res = await fetch('/api/vibe-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senior_id: seniorId }),
      })

      if (!res.ok) {
        throw new Error('Failed to run vibe check')
      }

      const data = (await res.json()) as VibeCheckResult
      setLatestResult(data)
      return data
    },
  })

  return {
    runVibeCheck: mutation.mutate,
    runVibeCheckAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    latestResult,
  }
}
