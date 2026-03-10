import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useMutation } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Loader2, Check } from 'lucide-react'

interface AlertPreferences {
  dailyDigest: boolean
  deliveryTime: string
  email: string
}

const TIME_OPTIONS = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
]

export default function DigestSettings() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { data: userData } = useUserData()

  const existingPrefs = userData?.alertPreferences as AlertPreferences | null | undefined

  const [dailyDigest, setDailyDigest] = useState(false)
  const [deliveryTime, setDeliveryTime] = useState('08:00')
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (existingPrefs) {
      setDailyDigest(existingPrefs.dailyDigest ?? false)
      setDeliveryTime(existingPrefs.deliveryTime ?? '08:00')
      setEmail(existingPrefs.email ?? '')
    } else if (user?.primaryEmailAddress?.emailAddress) {
      setEmail(user.primaryEmailAddress.emailAddress)
    }
  }, [existingPrefs, user])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      const res = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: 6,
          data: {
            alertPreferences: {
              dailyDigest,
              deliveryTime,
              email,
            },
          },
        }),
      })
      if (!res.ok) throw new Error('Failed to save settings')
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Digest Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Daily Digest</CardTitle>
            <CardDescription>
              Receive a daily summary of {userData?.seniorFirstName || 'your senior'}&apos;s wellness data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Digest Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Daily Digest</p>
                <p className="text-xs text-muted-foreground">
                  Get an email summary of health trends and alerts.
                </p>
              </div>
              <Switch checked={dailyDigest} onCheckedChange={setDailyDigest} aria-label="Toggle daily digest" />
            </div>

            {/* Delivery Time */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Time</label>
              <Select value={deliveryTime} onValueChange={(v) => setDeliveryTime(v ?? '08:00')} disabled={!dailyDigest}>
                <SelectTrigger className="w-full" aria-label="Select delivery time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                disabled={!dailyDigest}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : saved ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </CaregiverLayout>
  )
}
