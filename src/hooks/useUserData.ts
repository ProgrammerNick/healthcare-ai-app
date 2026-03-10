import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'

export interface UserData {
  id: string
  clerkUserId: string
  role: 'senior' | 'caregiver'
  fullName: string | null
  companionName: string | null
  linkedSeniorId: string | null
  timezone: string | null
  onboardingCompleted: boolean
  onboardingStep: number
  seniorFirstName: string | null
  seniorAge: number | null
  seniorRelationship: string | null
  alertPreferences: Record<string, unknown> | null
}

async function fetchUserData(getToken: () => Promise<string | null>): Promise<UserData | null> {
  const token = await getToken()
  if (!token) return null

  const res = await fetch('/api/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (res.status === 404) {
    return null
  }

  if (!res.ok) {
    throw new Error('Failed to fetch user data')
  }

  const data = (await res.json()) as { user: UserData }
  return data.user
}

export function useUserData() {
  const { getToken, isSignedIn, userId } = useAuth()

  return useQuery<UserData | null>({
    queryKey: ['user', userId],
    queryFn: () => fetchUserData(getToken),
    enabled: !!isSignedIn,
  })
}
