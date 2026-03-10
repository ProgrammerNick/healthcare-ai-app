import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'
import { useUserData } from '@/hooks/useUserData'

export default function AuthRedirect() {
  const { isSignedIn, isLoaded } = useAuth()
  const { data: user, isLoading } = useUserData()

  if (!isLoaded || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />
  }

  if (!user || !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  if (user.role === 'senior') {
    return <Navigate to="/senior/home" replace />
  }

  return <Navigate to="/caregiver/dashboard" replace />
}
