import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Settings, Play, Pill, Users, CalendarCheck, Dumbbell, Droplets, UtensilsCrossed } from 'lucide-react'
import { toast } from 'sonner'
import { useUserData } from '@/hooks/useUserData'
import { useReminders } from '@/hooks/useReminders'
import { useCompanion } from '@/hooks/useCompanion'
import { useVoice } from '@/hooks/useVoice'
import { VoiceOrb, type VoiceOrbState } from '@/components/shared/VoiceOrb'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription, AlertAction } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

interface FamilyMessageSummary {
  unplayed: { id: string; fromName: string; messageText: string }[]
}

const REMINDER_ICONS: Record<string, typeof Pill> = {
  medication: Pill,
  social: Users,
  appointment: CalendarCheck,
  exercise: Dumbbell,
  hydration: Droplets,
  meal: UtensilsCrossed,
}

export default function SeniorHome() {
  const { getToken } = useAuth()
  const { data: user } = useUserData()
  const seniorId = user?.role === 'senior' ? user.id : undefined
  const { data: reminders } = useReminders(seniorId)
  const { runCheckin, checkedInToday, isLoading: checkinLoading } = useCompanion(seniorId)
  const { startListening, stopListening, speak, isListening, isSpeaking } = useVoice()

  const [orbState, setOrbState] = useState<VoiceOrbState>('idle')
  const [unplayedMessages, setUnplayedMessages] = useState<FamilyMessageSummary['unplayed']>([])
  const [completedReminders, setCompletedReminders] = useState<Set<string>>(new Set())
  const [isPlayingMessages, setIsPlayingMessages] = useState(false)

  const companionName = user?.companionName || 'Joy'
  const seniorName = user?.fullName || user?.seniorFirstName || 'friend'

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Fetch unplayed family messages
  useEffect(() => {
    if (!seniorId) return

    async function fetchMessages() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`/api/family-message?senior_id=${seniorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = (await res.json()) as FamilyMessageSummary
          setUnplayedMessages(data.unplayed || [])
        }
      } catch {
        // Silently fail - messages are not critical
      }
    }

    void fetchMessages()
  }, [seniorId, getToken])

  // Morning auto check-in (before 11 AM, once per day)
  useEffect(() => {
    if (!seniorId || checkedInToday || checkinLoading) return
    if (hour >= 11) return

    async function autoCheckin() {
      const script = await runCheckin()
      if (script) {
        try {
          await speak(script)
        } catch {
          // Speech synthesis may not be available
        }
      }
    }

    void autoCheckin()
  }, [seniorId, checkedInToday, checkinLoading, hour, runCheckin, speak])

  // Play unplayed family messages aloud
  const handlePlayMessages = useCallback(async () => {
    if (unplayedMessages.length === 0) return
    setIsPlayingMessages(true)

    for (const msg of unplayedMessages) {
      const text = `Message from ${msg.fromName}: ${msg.messageText}`
      try {
        await speak(text)

        // Mark as played
        const token = await getToken()
        if (token) {
          await fetch(`/api/family-message?id=${msg.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
        }
      } catch {
        // Continue with next message
      }
    }

    setUnplayedMessages([])
    setIsPlayingMessages(false)
  }, [unplayedMessages, speak, getToken])

  // Voice interaction handler
  const handleOrbClick = useCallback(async () => {
    if (isListening) {
      stopListening()
      setOrbState('idle')
      return
    }

    if (isSpeaking) {
      return
    }

    setOrbState('listening')

    try {
      const transcript = await startListening()

      if (!transcript) {
        setOrbState('idle')
        return
      }

      setOrbState('processing')

      const token = await getToken()
      if (!token) {
        setOrbState('error')
        return
      }

      const res = await fetch('/api/voice-to-health', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          senior_id: seniorId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to process voice input')
      }

      const data = (await res.json()) as { events_extracted: number }

      setOrbState('success')
      toast.success(
        data.events_extracted > 0
          ? `Recorded ${data.events_extracted} health update${data.events_extracted > 1 ? 's' : ''}`
          : 'Got it! No health data to record from that.'
      )

      // Reset orb after a short delay
      setTimeout(() => setOrbState('idle'), 2000)
    } catch {
      setOrbState('error')
      toast.error('Could not process your voice. Please try again.')
      setTimeout(() => setOrbState('idle'), 3000)
    }
  }, [isListening, isSpeaking, startListening, stopListening, getToken, seniorId])

  const toggleReminder = useCallback((id: string) => {
    setCompletedReminders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return (
    <div className="senior-page min-h-screen bg-background px-4 pb-8 pt-6">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[32px] font-bold leading-tight">
            {greeting}, {seniorName}
          </h1>
          <p className="text-[20px] text-muted-foreground mt-1">{dateStr}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          className="min-w-[64px] min-h-[64px] shrink-0"
          aria-label="Settings"
        >
          <Settings className="size-6" aria-hidden="true" />
        </Button>
      </div>

      {/* Unplayed family messages alert */}
      {unplayedMessages.length > 0 && (
        <Alert className="mb-6 min-h-[64px] flex items-center">
          <AlertTitle className="text-[24px]">
            {unplayedMessages.length} new message{unplayedMessages.length > 1 ? 's' : ''} from family
          </AlertTitle>
          <AlertDescription className="text-[20px]">
            {unplayedMessages.map((m) => m.fromName).join(', ')}
          </AlertDescription>
          <AlertAction>
            <Button
              onClick={handlePlayMessages}
              disabled={isPlayingMessages}
              className="min-w-[64px] min-h-[64px]"
              aria-label="Play family messages"
            >
              <Play className="size-8" aria-hidden="true" />
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Voice Orb */}
      <div className="flex justify-center my-10">
        <VoiceOrb
          state={orbState}
          onClick={handleOrbClick}
          companionName={companionName}
        />
      </div>

      {/* Today's Reminders */}
      {reminders && reminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[32px] font-semibold mb-4">Today&apos;s Reminders</h2>
          {reminders.map((reminder) => {
            const Icon = REMINDER_ICONS[reminder.reminderType] || CalendarCheck
            const done = completedReminders.has(reminder.id)

            return (
              <Card key={reminder.id} className="w-full min-h-[72px]">
                <CardContent className="flex items-center gap-4">
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => toggleReminder(reminder.id)}
                    className="size-8"
                    aria-label={`Mark ${reminder.title} as done`}
                  />
                  <Icon className="size-8 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span
                    className={`text-[24px] ${done ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {reminder.title}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
