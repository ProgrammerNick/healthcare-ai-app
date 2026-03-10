import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import {
  Heart,
  Scale,
  Moon,
  Pill,
  Smile,
  AlertCircle,
  Droplets,
  Footprints,
  UtensilsCrossed,
  Users,
  ChevronDown,
  Play,
  CheckCircle,
  Mail,
} from 'lucide-react'
import { useUserData } from '@/hooks/useUserData'
import { useHealthLogs, type HealthLog } from '@/hooks/useHealthLogs'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

// Types
interface Memory {
  id: string
  summary: string | null
  transcript: string
  tags: string[] | null
  createdAt: string
}

interface FamilyMessage {
  id: string
  fromName: string
  messageText: string
  playedAt: string | null
  createdAt: string
}

// Icon mapping for health log types
const LOG_TYPE_ICONS: Record<string, typeof Heart> = {
  blood_pressure: Heart,
  weight: Scale,
  sleep_hours: Moon,
  medication_taken: Pill,
  mood_score: Smile,
  pain_level: AlertCircle,
  hydration_glasses: Droplets,
  mobility_difficulty: Footprints,
  appetite_rating: UtensilsCrossed,
  social_contact_count: Users,
}

const LOG_TYPE_LABELS: Record<string, string> = {
  blood_pressure: 'Blood Pressure',
  weight: 'Weight',
  sleep_hours: 'Sleep',
  medication_taken: 'Medication',
  mood_score: 'Mood',
  pain_level: 'Pain Level',
  hydration_glasses: 'Hydration',
  mobility_difficulty: 'Mobility',
  appetite_rating: 'Appetite',
  social_contact_count: 'Social Contact',
}

function formatLogValue(log: HealthLog): string {
  switch (log.logType) {
    case 'mood_score':
    case 'pain_level':
      return `${log.value}/10`
    case 'appetite_rating':
      return `${log.value}/5`
    case 'sleep_hours':
      return `${log.value} hours`
    case 'hydration_glasses':
      return `${log.value} glasses`
    case 'weight':
      return `${log.value} lbs`
    case 'medication_taken':
      return log.value === 'true' ? 'Taken' : 'Not taken'
    case 'mobility_difficulty':
      return log.value === 'true' ? 'Difficulty reported' : 'No difficulty'
    case 'social_contact_count':
      return `${log.value} contact${log.value === '1' ? '' : 's'}`
    default:
      return log.value
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// Filter to only today's logs
function isTodayLog(log: HealthLog): boolean {
  const today = new Date()
  const logDate = new Date(log.recordedAt)
  return (
    logDate.getFullYear() === today.getFullYear() &&
    logDate.getMonth() === today.getMonth() &&
    logDate.getDate() === today.getDate()
  )
}

export default function MyDay() {
  const { getToken } = useAuth()
  const { data: user } = useUserData()
  const seniorId = user?.role === 'senior' ? user.id : undefined
  const { data: healthLogs } = useHealthLogs(seniorId, 1)

  const [memories, setMemories] = useState<Memory[]>([])
  const [messages, setMessages] = useState<{ unplayed: FamilyMessage[]; played: FamilyMessage[] }>({
    unplayed: [],
    played: [],
  })

  // Fetch memories
  useEffect(() => {
    if (!seniorId) return

    async function fetchMemories() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`/api/memory?senior_id=${seniorId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = (await res.json()) as { memories: Memory[] }
          setMemories(data.memories || [])
        }
      } catch {
        // Silently fail
      }
    }

    void fetchMemories()
  }, [seniorId, getToken])

  // Fetch messages
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
          const data = (await res.json()) as { unplayed: FamilyMessage[]; played: FamilyMessage[] }
          setMessages(data)
        }
      } catch {
        // Silently fail
      }
    }

    void fetchMessages()
  }, [seniorId, getToken])

  const todayLogs = (healthLogs || []).filter(isTodayLog)

  return (
    <div className="senior-page min-h-screen bg-background px-4 pb-8 pt-6">
      <h1 className="text-[32px] font-bold mb-6">My Day</h1>

      <Tabs defaultValue="health">
        <TabsList className="w-full h-auto">
          <TabsTrigger
            value="health"
            className="flex-1 text-[20px] min-h-[64px] py-3"
          >
            Health
          </TabsTrigger>
          <TabsTrigger
            value="memories"
            className="flex-1 text-[20px] min-h-[64px] py-3"
          >
            Memories
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="flex-1 text-[20px] min-h-[64px] py-3"
          >
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Health Tab */}
        <TabsContent value="health" className="mt-4">
          <HealthTab logs={todayLogs} />
        </TabsContent>

        {/* Memories Tab */}
        <TabsContent value="memories" className="mt-4">
          <MemoriesTab memories={memories} />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-4">
          <MessagesTab
            unplayed={messages.unplayed}
            played={messages.played}
            getToken={getToken}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function HealthTab({ logs }: { logs: HealthLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <p className="text-[24px] text-muted-foreground">
          No health updates recorded today yet.
        </p>
        <p className="text-[20px] text-muted-foreground mt-2">
          Use the voice orb to share how you&apos;re feeling.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => {
        const Icon = LOG_TYPE_ICONS[log.logType] || Heart
        const label = LOG_TYPE_LABELS[log.logType] || log.logType

        return (
          <Card key={log.id} className="w-full min-h-[72px]">
            <CardContent className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted shrink-0">
                <Icon className="size-6" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[24px] font-medium">{label}</p>
                <p className="text-[20px] text-muted-foreground">{formatLogValue(log)}</p>
              </div>
              <span className="text-[18px] text-muted-foreground shrink-0">
                {formatTime(log.recordedAt)}
              </span>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function MemoriesTab({ memories }: { memories: Memory[] }) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-12">
        <Smile className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <p className="text-[24px] text-muted-foreground">
          No memories recorded yet.
        </p>
        <p className="text-[20px] text-muted-foreground mt-2">
          Share a story with your companion to save it here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  )
}

function MemoryCard({ memory }: { memory: Memory }) {
  const [open, setOpen] = useState(false)
  const tags = Array.isArray(memory.tags) ? memory.tags : []

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="w-full min-h-[72px]">
        <CardContent>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full min-h-[64px] flex items-center justify-between p-0 text-left"
              aria-label={`Expand memory: ${memory.summary || 'A memory'}`}
              aria-expanded={open}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[24px] font-medium leading-snug">
                  {memory.summary || 'A memory'}
                </p>
                <p className="text-[18px] text-muted-foreground">
                  {formatDate(memory.createdAt)}
                </p>
              </div>
              <ChevronDown
                className={`size-8 text-muted-foreground shrink-0 transition-transform ${
                  open ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="pt-4 border-t mt-4">
              <p className="text-[20px] text-foreground leading-relaxed">
                {memory.transcript}
              </p>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-muted px-4 py-1 text-[18px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  )
}

function MessagesTab({
  unplayed,
  played,
  getToken,
}: {
  unplayed: FamilyMessage[]
  played: FamilyMessage[]
  getToken: () => Promise<string | null>
}) {
  const handlePlay = useCallback(
    async (message: FamilyMessage) => {
      // Use speech synthesis to play message
      if (!window.speechSynthesis) return

      const utterance = new SpeechSynthesisUtterance(
        `Message from ${message.fromName}: ${message.messageText}`
      )
      utterance.rate = 0.9
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)

      // Mark as played
      try {
        const token = await getToken()
        if (token) {
          await fetch(`/api/family-message?id=${message.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
        }
      } catch {
        // Silently fail
      }
    },
    [getToken]
  )

  if (unplayed.length === 0 && played.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="size-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
        <p className="text-[24px] text-muted-foreground">No messages yet.</p>
        <p className="text-[20px] text-muted-foreground mt-2">
          Family messages will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {unplayed.length > 0 && (
        <div>
          <h3 className="text-[24px] font-semibold mb-3">New Messages</h3>
          <div className="space-y-3">
            {unplayed.map((msg) => (
              <Card key={msg.id} className="w-full min-h-[72px]">
                <CardContent className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[24px] font-medium">{msg.fromName}</p>
                    <p className="text-[20px] text-muted-foreground line-clamp-2">
                      {msg.messageText}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => void handlePlay(msg)}
                    className="min-w-[64px] min-h-[64px] shrink-0"
                    aria-label={`Play message from ${msg.fromName}`}
                  >
                    <Play className="size-8" aria-hidden="true" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {played.length > 0 && (
        <div>
          <h3 className="text-[24px] font-semibold mb-3">Played Messages</h3>
          <div className="space-y-3">
            {played.map((msg) => (
              <Card key={msg.id} className="w-full min-h-[72px] opacity-75">
                <CardContent className="flex items-center gap-4">
                  <CheckCircle className="size-8 text-muted-foreground shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[24px] font-medium">{msg.fromName}</p>
                    <p className="text-[20px] text-muted-foreground line-clamp-2">
                      {msg.messageText}
                    </p>
                  </div>
                  <span className="text-[18px] text-muted-foreground shrink-0">
                    {formatDate(msg.createdAt)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
