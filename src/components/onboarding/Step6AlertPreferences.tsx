import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface AlertPreferencesData {
  dailySummary: boolean
  urgentAlerts: boolean
  onlyIfWrong: boolean
  digestTime: string
  email: string
}

interface Step6AlertPreferencesProps {
  onNext: (prefs: AlertPreferencesData) => void
  onBack: () => void
  isSaving: boolean
  initialPrefs?: Partial<AlertPreferencesData>
}

const DIGEST_TIMES = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '17:00', label: '5:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
]

export default function Step6AlertPreferences({
  onNext,
  onBack,
  isSaving,
  initialPrefs,
}: Step6AlertPreferencesProps) {
  const [dailySummary, setDailySummary] = useState(
    initialPrefs?.dailySummary ?? true
  )
  const [urgentAlerts, setUrgentAlerts] = useState(
    initialPrefs?.urgentAlerts ?? true
  )
  const [onlyIfWrong, setOnlyIfWrong] = useState(
    initialPrefs?.onlyIfWrong ?? false
  )
  const [digestTime, setDigestTime] = useState(
    initialPrefs?.digestTime ?? '20:00'
  )
  const [email, setEmail] = useState(initialPrefs?.email ?? '')

  function handleSubmit() {
    onNext({ dailySummary, urgentAlerts, onlyIfWrong, digestTime, email })
  }

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      role="group"
      aria-label="Alert preferences"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          How would you like to stay in the loop?
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="dailySummary" className="cursor-pointer">
            Daily summary email
          </Label>
          <Switch
            id="dailySummary"
            checked={dailySummary}
            onCheckedChange={setDailySummary}
            aria-label="Toggle daily summary email"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="urgentAlerts" className="cursor-pointer">
            Urgent alerts
          </Label>
          <Switch
            id="urgentAlerts"
            checked={urgentAlerts}
            onCheckedChange={setUrgentAlerts}
            aria-label="Toggle urgent alerts"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="onlyIfWrong" className="cursor-pointer">
            Only contact me if something seems wrong
          </Label>
          <Switch
            id="onlyIfWrong"
            checked={onlyIfWrong}
            onCheckedChange={setOnlyIfWrong}
            aria-label="Toggle only contact if something seems wrong"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="digestTime">Digest time</Label>
          <Select value={digestTime} onValueChange={(v) => setDigestTime(v ?? '20:00')}>
            <SelectTrigger
              id="digestTime"
              className="w-full"
              aria-label="Select digest time"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIGEST_TIMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="alertEmail">Email</Label>
          <Input
            id="alertEmail"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address for alerts"
          />
        </div>
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
