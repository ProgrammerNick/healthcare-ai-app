import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Loader2, CheckCircle } from 'lucide-react'

interface AnomalyAlert {
  id: string
  seniorId: string
  alertType: string
  description: string | null
  baselineValue: string | null
  observedValue: string | null
  resolvedAt: string | null
  createdAt: string
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  conversation_length: 'Conversation Length',
  sentiment_drop: 'Sentiment Drop',
  missed_checkin: 'Missed Check-in',
  vibe_urgent: 'Vibe Urgent',
  isolation: 'Isolation',
}

const ALERT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'conversation_length', label: 'Conversation Length' },
  { value: 'sentiment_drop', label: 'Sentiment Drop' },
  { value: 'missed_checkin', label: 'Missed Check-in' },
  { value: 'vibe_urgent', label: 'Vibe Urgent' },
  { value: 'isolation', label: 'Isolation' },
]

export default function AnomalyAlerts() {
  const { getToken } = useAuth()
  const { data: userData } = useUserData()
  const queryClient = useQueryClient()
  const seniorId = userData?.linkedSeniorId
  const [filterType, setFilterType] = useState('all')

  const { data: alerts, isLoading } = useQuery<AnomalyAlert[]>({
    queryKey: ['anomaly-alerts', seniorId, filterType],
    queryFn: async () => {
      const token = await getToken()
      const params = new URLSearchParams({ senior_id: seniorId! })
      if (filterType !== 'all') {
        params.set('alert_type', filterType)
      }
      const res = await fetch(`/api/anomaly-alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch alerts')
      const body = (await res.json()) as { alerts: AnomalyAlert[] }
      return body.alerts
    },
    enabled: !!seniorId,
  })

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const token = await getToken()
      const res = await fetch(`/api/anomaly-alerts?id=${alertId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) throw new Error('Failed to resolve alert')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] })
    },
  })

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Anomaly Alerts</h1>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48" aria-label="Filter alerts by type">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {ALERT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {alerts && alerts.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8">
              <CheckCircle className="size-8 text-green-500" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">No unresolved alerts. Everything looks good!</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {alerts?.map((alert) => (
            <Card key={alert.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="destructive">
                    {ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}
                  </Badge>
                </CardTitle>
                <CardDescription>{formatDate(alert.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{alert.description || 'No details available.'}</p>
                {(alert.baselineValue || alert.observedValue) && (
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    {alert.baselineValue && <span>Baseline: {alert.baselineValue}</span>}
                    {alert.observedValue && <span>Observed: {alert.observedValue}</span>}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending}
                  aria-label={`Mark alert resolved: ${ALERT_TYPE_LABELS[alert.alertType] || alert.alertType}`}
                >
                  {resolveMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : (
                    'Mark Resolved'
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
