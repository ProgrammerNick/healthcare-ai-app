import { useAuth } from '@clerk/clerk-react'
import { Navigate, Outlet } from 'react-router-dom'
import { useUserData } from '@/hooks/useUserData'

export default function ProtectedRoute() {
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

  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
