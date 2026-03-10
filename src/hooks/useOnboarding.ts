import { useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'

interface StepData {
  [key: string]: unknown
}

export function useOnboarding(initialStep = 2) {
  const [currentStep, setCurrentStep] = useState(initialStep)
  const [isSaving, setIsSaving] = useState(false)
  const { getToken } = useAuth()

  const saveStep = useCallback(
    async (step: number, data: StepData) => {
      setIsSaving(true)
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')

        const res = await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ step, data }),
        })

        if (!res.ok) {
          throw new Error('Failed to save onboarding step')
        }

        return (await res.json()) as { success: boolean; user: unknown }
      } finally {
        setIsSaving(false)
      }
    },
    [getToken]
  )

  const createReminders = useCallback(
    async (
      reminders: Array<{
        title: string
        reminderType: string
        recurrence: unknown
      }>
    ) => {
      setIsSaving(true)
      try {
        const token = await getToken()
        if (!token) throw new Error('Not authenticated')

        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'create_reminders',
            data: { reminders },
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to create reminders')
        }

        return (await res.json()) as { success: boolean; reminders: unknown[] }
      } finally {
        setIsSaving(false)
      }
    },
    [getToken]
  )

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, 7))
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 2))
  }, [])

  return {
    currentStep,
    setCurrentStep,
    isSaving,
    saveStep,
    createReminders,
    goNext,
    goBack,
  }
}
