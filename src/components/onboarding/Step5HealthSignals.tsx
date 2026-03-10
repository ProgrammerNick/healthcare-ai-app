import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'

const HEALTH_SIGNALS = [
  { id: 'mood', label: 'Mood' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'pain_level', label: 'Pain level' },
  { id: 'medication', label: 'Medication' },
  { id: 'hydration', label: 'Hydration' },
  { id: 'appetite', label: 'Appetite' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'social_contact', label: 'Social contact' },
] as const

type SignalId = (typeof HEALTH_SIGNALS)[number]['id']

interface Step5HealthSignalsProps {
  onNext: (signals: Record<SignalId, boolean>) => void
  onBack: () => void
  isSaving: boolean
  initialSignals?: Record<string, boolean>
}

export default function Step5HealthSignals({
  onNext,
  onBack,
  isSaving,
  initialSignals,
}: Step5HealthSignalsProps) {
  const [signals, setSignals] = useState<Record<SignalId, boolean>>(() => {
    const defaults: Record<string, boolean> = {}
    for (const signal of HEALTH_SIGNALS) {
      defaults[signal.id] = initialSignals?.[signal.id] ?? true
    }
    return defaults as Record<SignalId, boolean>
  })

  function toggleSignal(id: SignalId) {
    setSignals((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function handleSubmit() {
    onNext(signals)
  }

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      role="group"
      aria-label="Health signal preferences"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          What would you like to keep an eye on?
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HEALTH_SIGNALS.map((signal) => (
          <Card key={signal.id}>
            <CardContent className="flex items-center justify-between py-1">
              <span className="text-sm font-medium">{signal.label}</span>
              <Switch
                checked={signals[signal.id]}
                onCheckedChange={() => toggleSignal(signal.id)}
                aria-label={`Track ${signal.label}`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="flex-1"
          type="button"
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1"
          type="button"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
