import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import { useVibeCheck } from '@/hooks/useVibeCheck'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Loader2 } from 'lucide-react'

interface LinkedSenior {
  id: string
  fullName: string | null
  seniorFirstName: string | null
  lastActiveAt: string | null
  vibeStatus: 'none' | 'watch' | 'urgent' | null
  onboardingCompleted: boolean
}

export default function CaregiverDashboard() {
  const { getToken } = useAuth()
  const { data: userData } = useUserData()
  const { runVibeCheck, isLoading: vibeLoading } = useVibeCheck()

  const { data: seniors, isLoading } = useQuery<LinkedSenior[]>({
    queryKey: ['linked-seniors', userData?.id],
    queryFn: async () => {
      const token = await getToken()
      // For now, if the caregiver has a linkedSeniorId, fetch that senior's info
      if (!userData?.linkedSeniorId) return []

      const res = await fetch(`/api/health-logs?senior_id=${userData.linkedSeniorId}&days=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      // We construct the senior info from available data
      const seniorData: LinkedSenior = {
        id: userData.linkedSeniorId,
        fullName: userData.seniorFirstName || 'Senior',
        seniorFirstName: userData.seniorFirstName,
        lastActiveAt: null,
        vibeStatus: null,
        onboardingCompleted: userData.onboardingCompleted,
      }

      if (res.ok) {
        const body = (await res.json()) as { logs: Array<{ recordedAt: string }> }
        if (body.logs.length > 0) {
          seniorData.lastActiveAt = body.logs[0].recordedAt
        }
      }

      return [seniorData]
    },
    enabled: !!userData?.id,
  })

  const seniorSetupIncomplete = seniors?.some((s) => !s.onboardingCompleted)
  const seniorName = userData?.seniorFirstName || 'your senior'

  function getVibeBadgeVariant(status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
      case 'urgent':
        return 'destructive'
      case 'watch':
        return 'secondary'
      default:
        return 'default'
    }
  }

  function getVibeBadgeLabel(status: string | null): string {
    switch (status) {
      case 'urgent':
        return 'Urgent'
      case 'watch':
        return 'Watch'
      default:
        return 'Good'
    }
  }

  function formatLastActive(dateStr: string | null): string {
    if (!dateStr) return 'No recent activity'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return 'Active recently'
    if (diffHours < 24) return `Active ${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `Active ${diffDays}d ago`
  }

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {seniorSetupIncomplete && (
          <Alert>
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>Complete {seniorName}&apos;s setup</AlertTitle>
            <AlertDescription>
              Finish setting up {seniorName}&apos;s profile to enable all features.
            </AlertDescription>
            <div className="mt-2">
              <Link to="/onboarding/senior">
                <Button size="sm">Complete Setup</Button>
              </Link>
            </div>
          </Alert>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {seniors && seniors.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No linked seniors yet. Complete onboarding to get started.</p>
              <Link to="/onboarding/caregiver" className="mt-4 inline-block">
                <Button>Start Onboarding</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {seniors?.map((senior) => (
            <Card key={senior.id}>
              <CardHeader>
                <CardTitle>{senior.fullName || senior.seniorFirstName || 'Senior'}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Clock className="size-3" aria-hidden="true" />
                  {formatLastActive(senior.lastActiveAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vibe Status:</span>
                  <Badge variant={getVibeBadgeVariant(senior.vibeStatus)}>
                    {getVibeBadgeLabel(senior.vibeStatus)}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  onClick={() => runVibeCheck(senior.id)}
                  disabled={vibeLoading}
                  aria-label={`Run vibe check for ${senior.fullName || senior.seniorFirstName || 'senior'}`}
                >
                  {vibeLoading ? (
                    <>
                      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                      Running...
                    </>
                  ) : (
                    'Run Vibe Check'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </CaregiverLayout>
  )
}
