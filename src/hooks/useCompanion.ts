import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

interface CompanionState {
  script: string | null
  isLoading: boolean
  error: string | null
  checkedInToday: boolean
}

function getCheckinKey(seniorId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `companion_checkin_${seniorId}_${today}`
}

export function useCompanion(seniorId: string | undefined) {
  const { getToken } = useAuth()

  const [state, setState] = useState<CompanionState>({
    script: null,
    isLoading: false,
    error: null,
    checkedInToday: false,
  })

  // Check if already checked in today
  useEffect(() => {
    if (!seniorId) return
    const key = getCheckinKey(seniorId)
    const done = localStorage.getItem(key)
    if (done === 'true') {
      setState((s) => ({ ...s, checkedInToday: true }))
    }
  }, [seniorId])

  const runCheckin = useCallback(async () => {
    if (!seniorId) return null

    setState((s) => ({ ...s, isLoading: true, error: null }))

    try {
      const token = await getToken()
      if (!token) {
        setState((s) => ({ ...s, isLoading: false, error: 'Not authenticated' }))
        return null
      }

      const res = await fetch('/api/companion-checkin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senior_id: seniorId }),
      })

      if (!res.ok) {
        throw new Error('Failed to run check-in')
      }

      const data = (await res.json()) as { script: string }

      // Mark today as checked in
      const key = getCheckinKey(seniorId)
      localStorage.setItem(key, 'true')

      setState({
        script: data.script,
        isLoading: false,
        error: null,
        checkedInToday: true,
      })

      return data.script
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState((s) => ({ ...s, isLoading: false, error: message }))
      return null
    }
  }, [seniorId, getToken])

  return {
    script: state.script,
    isLoading: state.isLoading,
    error: state.error,
    checkedInToday: state.checkedInToday,
    runCheckin,
  }
}
