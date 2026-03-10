import { useUserData } from '@/hooks/useUserData'
import { useVibeCheck } from '@/hooks/useVibeCheck'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'
import { Loader2, AlertTriangle, CheckCircle, Eye } from 'lucide-react'

const FLAG_LABELS: Record<string, string> = {
  lethargy: 'Lethargy',
  confusion: 'Confusion',
  distress: 'Distress',
  isolation: 'Isolation',
}

function sentimentToPercent(score: number): number {
  // Convert -1.0..1.0 to 0..100
  return Math.round(((score + 1) / 2) * 100)
}

function getSentimentColor(score: number): string {
  const pct = sentimentToPercent(score)
  if (pct >= 66) return 'bg-green-500'
  if (pct >= 33) return 'bg-amber-500'
  return 'bg-red-500'
}

export default function VibeCheck() {
  const { data: userData } = useUserData()
  const { runVibeCheck, isLoading, latestResult, error } = useVibeCheck()
  const seniorId = userData?.linkedSeniorId

  const activeFlags = latestResult
    ? Object.entries(latestResult.flags)
        .filter(([, active]) => active)
        .map(([key]) => key)
    : []

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Vibe Check</h1>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">
              Run an AI-powered wellness analysis of {userData?.seniorFirstName || 'your senior'}&apos;s recent
              conversations and health data.
            </p>
            <Button
              size="lg"
              onClick={() => {
                if (seniorId) runVibeCheck(seniorId)
              }}
              disabled={isLoading || !seniorId}
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Analyzing...
                </>
              ) : (
                'Run Vibe Check'
              )}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {latestResult && (
          <div className="space-y-4">
            {/* Sentiment Score */}
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Score</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={sentimentToPercent(latestResult.sentiment_score)}>
                  <ProgressLabel>Sentiment</ProgressLabel>
                  <ProgressValue>
                    {sentimentToPercent(latestResult.sentiment_score)}%
                  </ProgressValue>
                </Progress>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${getSentimentColor(latestResult.sentiment_score)}`}
                    style={{ width: `${sentimentToPercent(latestResult.sentiment_score)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Flags */}
            {activeFlags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Active Flags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {activeFlags.map((flag) => (
                      <Badge key={flag} variant="destructive">
                        {FLAG_LABELS[flag] || flag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{latestResult.summary}</p>
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            {latestResult.recommended_actions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {latestResult.recommended_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Alert Level */}
            <Alert
              variant={latestResult.alert_level === 'urgent' ? 'destructive' : 'default'}
            >
              {latestResult.alert_level === 'urgent' ? (
                <AlertTriangle className="size-4" aria-hidden="true" />
              ) : latestResult.alert_level === 'watch' ? (
                <Eye className="size-4" aria-hidden="true" />
              ) : (
                <CheckCircle className="size-4" aria-hidden="true" />
              )}
              <AlertTitle>
                Alert Level:{' '}
                {latestResult.alert_level === 'none'
                  ? 'All Clear'
                  : latestResult.alert_level === 'watch'
                    ? 'Watch'
                    : 'Urgent'}
              </AlertTitle>
              <AlertDescription>
                {latestResult.alert_level === 'none'
                  ? 'No concerning patterns detected.'
                  : latestResult.alert_level === 'watch'
                    ? 'Some patterns warrant monitoring.'
                    : 'Immediate attention may be needed.'}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </CaregiverLayout>
  )
}
