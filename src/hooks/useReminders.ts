import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'

export interface Reminder {
  id: string
  seniorId: string
  reminderType: string
  title: string
  recurrence: unknown
  isActive: boolean
  lastTriggeredAt: string | null
}

async function fetchReminders(
  getToken: () => Promise<string | null>,
  seniorId: string
): Promise<Reminder[]> {
  const token = await getToken()
  if (!token) return []

  const res = await fetch(`/api/reminders?senior_id=${seniorId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    throw new Error('Failed to fetch reminders')
  }

  const data = (await res.json()) as { reminders: Reminder[] }
  return data.reminders
}

export function useReminders(seniorId: string | undefined) {
  const { getToken, isSignedIn } = useAuth()

  return useQuery<Reminder[]>({
    queryKey: ['reminders', seniorId],
    queryFn: () => fetchReminders(getToken, seniorId!),
    enabled: !!isSignedIn && !!seniorId,
  })
}
