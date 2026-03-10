import { useState, useEffect, useRef, useCallback } from 'react'
import { VoiceOrb } from '@/components/shared/VoiceOrb'
import type { VoiceOrbState } from '@/components/shared/VoiceOrb'
import { useVoice } from '@/hooks/useVoice'

interface SeniorStep3FirstConversationProps {
  seniorName: string
  companionName: string
  seniorId: string
  onComplete: (transcript: ConversationEntry[]) => void
}

export interface ConversationEntry {
  role: 'senior' | 'companion'
  text: string
  timestamp: string
}

// Warm hardcoded responses for the guided onboarding conversation
const COMPANION_RESPONSES = [
  "That's wonderful to hear! Thank you for sharing that with me. I'm really looking forward to our chats together. Tell me, what's something you enjoy doing?",
  "Oh, that sounds lovely! I'll remember that. We're going to get along great. One more thing — is there anything you'd like me to help remind you about during the day?",
  "I'll make sure to help with that! Well, it's been so nice meeting you. I'm really glad we had this first chat. I'll talk to you again soon!",
]

export function SeniorStep3FirstConversation({
  seniorName,
  companionName,
  seniorId,
  onComplete,
}: SeniorStep3FirstConversationProps) {
  const { startListening, speak, isListening, isSpeaking } = useVoice()
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle')
  const [exchangeCount, setExchangeCount] = useState(0)
  const [transcript, setTranscript] = useState<ConversationEntry[]>([])
  const [lastMessage, setLastMessage] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completedRef = useRef(false)

  const TARGET_EXCHANGES = 3

  // Auto-complete after 3 minutes
  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      if (!completedRef.current) {
        finishConversation()
      }
    }, 3 * 60 * 1000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync orb state from voice hook
  useEffect(() => {
    if (isListening) {
      setOrbState('listening')
    } else if (isSpeaking) {
      setOrbState('processing')
    }
  }, [isListening, isSpeaking])

  const finishConversation = useCallback(async () => {
    if (completedRef.current) return
    completedRef.current = true

    const farewell = `It was so nice talking to you, ${seniorName}. I'll see you tomorrow morning!`
    setLastMessage(`${companionName}: ${farewell}`)
    setOrbState('success')

    const farewellEntry: ConversationEntry = {
      role: 'companion',
      text: farewell,
      timestamp: new Date().toISOString(),
    }

    const finalTranscript = [...transcript, farewellEntry]
    setTranscript(finalTranscript)

    try {
      await speak(farewell)
    } catch {
      // Continue even if speech fails
    }

    // Post transcript to API (fire and forget)
    try {
      await fetch('/api/voice-to-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seniorId,
          transcript: finalTranscript,
          type: 'onboarding',
        }),
      })
    } catch {
      // Non-critical, continue
    }

    setTimeout(() => onComplete(finalTranscript), 1500)
  }, [seniorName, companionName, seniorId, transcript, speak, onComplete])

  const handleOrbClick = useCallback(async () => {
    // Don't allow new interactions while speaking or if completed
    if (isSpeaking || completedRef.current) return

    if (isListening) {
      // Already listening, this would be handled by the recognition ending
      return
    }

    try {
      setOrbState('listening')
      const userText = await startListening()

      if (!userText.trim()) {
        setOrbState('idle')
        return
      }

      // Add user speech to transcript
      const userEntry: ConversationEntry = {
        role: 'senior',
        text: userText,
        timestamp: new Date().toISOString(),
      }
      setLastMessage(`${seniorName}: ${userText}`)

      const currentExchange = exchangeCount
      const newTranscript = [...transcript, userEntry]
      setTranscript(newTranscript)

      // Processing state while we "think"
      setOrbState('processing')

      // Get companion response
      let companionText: string
      if (currentExchange < COMPANION_RESPONSES.length) {
        companionText = COMPANION_RESPONSES[currentExchange]
      } else {
        companionText = COMPANION_RESPONSES[COMPANION_RESPONSES.length - 1]
      }

      // Try to get a response from the API, fall back to hardcoded
      try {
        const res = await fetch('/api/companion-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seniorId,
            seniorName,
            companionName,
            userMessage: userText,
            exchangeNumber: currentExchange + 1,
            context: 'onboarding',
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as { response: string }
          if (data.response) {
            companionText = data.response
          }
        }
      } catch {
        // Use hardcoded response
      }

      const companionEntry: ConversationEntry = {
        role: 'companion',
        text: companionText,
        timestamp: new Date().toISOString(),
      }
      const updatedTranscript = [...newTranscript, companionEntry]
      setTranscript(updatedTranscript)
      setLastMessage(`${companionName}: ${companionText}`)

      // Speak the response
      try {
        await speak(companionText)
      } catch {
        // Continue even if speech fails
      }

      const newExchangeCount = currentExchange + 1
      setExchangeCount(newExchangeCount)

      if (newExchangeCount >= TARGET_EXCHANGES) {
        await finishConversation()
      } else {
        setOrbState('idle')
      }
    } catch {
      setOrbState('error')
      setTimeout(() => setOrbState('idle'), 2000)
    }
  }, [
    isListening,
    isSpeaking,
    startListening,
    speak,
    exchangeCount,
    transcript,
    seniorId,
    seniorName,
    companionName,
    finishConversation,
  ])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      role="main"
      aria-label="First conversation with your companion"
    >
      <div className="flex max-w-lg flex-col items-center gap-10 text-center">
        {lastMessage && (
          <p
            className="text-[28px] leading-relaxed text-foreground min-h-[100px]"
            aria-live="polite"
          >
            {lastMessage}
          </p>
        )}

        {!lastMessage && (
          <p className="text-[32px] leading-relaxed text-foreground">
            Tap the circle below to talk to {companionName}.
          </p>
        )}

        <VoiceOrb
          state={orbState}
          onClick={handleOrbClick}
          companionName={companionName}
        />

        <div className="flex gap-2 mt-4" aria-label={`Conversation progress: ${exchangeCount} of ${TARGET_EXCHANGES}`}>
          {Array.from({ length: TARGET_EXCHANGES }).map((_, i) => (
            <span
              key={i}
              className={`w-4 h-4 rounded-full transition-colors duration-300 ${
                i < exchangeCount ? 'bg-[#0d9488]' : 'bg-muted'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
