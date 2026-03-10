import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'

interface HealthLog {
  id: string
  seniorId: string
  logType: string
  value: string
  recordedAt: string
  source: string
  notes: string | null
}

interface AnomalyAlert {
  id: string
  seniorId: string
  alertType: string
  description: string | null
  createdAt: string
}

const METRIC_TYPES = [
  { key: 'mood_score', label: 'Mood' },
  { key: 'sleep_hours', label: 'Sleep' },
  { key: 'pain_level', label: 'Pain' },
  { key: 'blood_pressure', label: 'Blood Pressure' },
  { key: 'weight', label: 'Weight' },
  { key: 'hydration_glasses', label: 'Hydration' },
  { key: 'appetite_rating', label: 'Appetite' },
  { key: 'social_contact_count', label: 'Social' },
] as const

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function computeAverage(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

export default function HealthTimeline() {
  const { getToken } = useAuth()
  const { data: userData } = useUserData()
  const seniorId = userData?.linkedSeniorId

  const { data: logs, isLoading } = useQuery<HealthLog[]>({
    queryKey: ['health-logs', seniorId],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`/api/health-logs?senior_id=${seniorId}&days=30`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch health logs')
      const body = (await res.json()) as { logs: HealthLog[] }
      return body.logs
    },
    enabled: !!seniorId,
    refetchInterval: 60_000,
  })

  const { data: anomalies } = useQuery<AnomalyAlert[]>({
    queryKey: ['anomaly-alerts-timeline', seniorId],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`/api/anomaly-alerts?senior_id=${seniorId}&include_resolved=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return []
      const body = (await res.json()) as { alerts: AnomalyAlert[] }
      return body.alerts
    },
    enabled: !!seniorId,
  })

  function getMetricData(metricKey: string) {
    if (!logs) return { chartData: [], avg7: 0, avg30: 0, anomalyDots: [] }

    const filtered = logs
      .filter((l) => l.logType === metricKey)
      .map((l) => ({
        date: formatDate(l.recordedAt),
        rawDate: l.recordedAt,
        value: parseFloat(l.value) || 0,
      }))
      .reverse()

    const values = filtered.map((d) => d.value)
    const last7 = values.slice(-7)
    const avg7 = computeAverage(last7)
    const avg30 = computeAverage(values)

    // Find anomaly dates that overlap with this metric's data
    const anomalyDates = new Set(
      (anomalies || []).map((a) => formatDate(a.createdAt))
    )

    const anomalyDots = filtered.filter((d) => anomalyDates.has(d.date))

    return { chartData: filtered, avg7, avg30, anomalyDots }
  }

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold">Health Timeline</h1>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {!isLoading && (
          <Tabs defaultValue="mood_score">
            <TabsList className="flex-wrap">
              {METRIC_TYPES.map((m) => (
                <TabsTrigger key={m.key} value={m.key}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {METRIC_TYPES.map((m) => {
              const { chartData, avg7, avg30, anomalyDots } = getMetricData(m.key)

              return (
                <TabsContent key={m.key} value={m.key}>
                  <Card>
                    <CardHeader>
                      <CardTitle>{m.label} - 30 Day Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 flex gap-2">
                        <Badge variant="secondary">7-day avg: {avg7}</Badge>
                        <Badge variant="outline">30-day avg: {avg30}</Badge>
                      </div>

                      {chartData.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No data available for this metric.
                        </p>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={chartData}>
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                            {anomalyDots.map((dot, i) => (
                              <ReferenceDot
                                key={`anomaly-${i}`}
                                x={dot.date}
                                y={dot.value}
                                r={6}
                                fill="hsl(var(--destructive))"
                                stroke="none"
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </div>
    </CaregiverLayout>
  )
}
