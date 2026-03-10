import { useEffect, useRef, useState } from 'react'

interface SeniorStep2MeetCompanionProps {
  seniorName: string
  companionName: string
  onNext: () => void
}

export function SeniorStep2MeetCompanion({ seniorName, companionName, onNext }: SeniorStep2MeetCompanionProps) {
  const [displayedText, setDisplayedText] = useState('')
  const hasStartedRef = useRef(false)

  const fullText = `${companionName}: Hi ${seniorName}! I'm so glad to meet you. I'm ${companionName}. Every morning I'll check in with you, remind you about your day, and we can just chat. You don't have to do anything special — just talk to me like you'd talk to a friend. Let me ask you something to get started. How are you feeling today?`

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    // Reveal text progressively
    let charIndex = 0
    const textInterval = setInterval(() => {
      charIndex += 2
      if (charIndex >= fullText.length) {
        setDisplayedText(fullText)
        clearInterval(textInterval)
      } else {
        setDisplayedText(fullText.slice(0, charIndex))
      }
    }, 30)

    // Speak aloud using SpeechSynthesis
    if (window.speechSynthesis) {
      // Cancel any prior speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(fullText)
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.lang = 'en-US'

      utterance.onend = () => {
        // Ensure full text is shown
        clearInterval(textInterval)
        setDisplayedText(fullText)
        // Small delay before advancing
        setTimeout(onNext, 800)
      }

      utterance.onerror = () => {
        clearInterval(textInterval)
        setDisplayedText(fullText)
        setTimeout(onNext, 1500)
      }

      // Small delay to let the page render first
      setTimeout(() => {
        window.speechSynthesis.speak(utterance)
      }, 500)
    } else {
      // No speech synthesis available — just show text and advance
      setTimeout(() => {
        clearInterval(textInterval)
        setDisplayedText(fullText)
        setTimeout(onNext, 3000)
      }, 4000)
    }

    return () => {
      clearInterval(textInterval)
      window.speechSynthesis?.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      role="main"
      aria-label="Meeting your companion"
    >
      <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <p
          className="text-[32px] leading-relaxed text-foreground"
          aria-live="polite"
        >
          {displayedText}
          {displayedText.length < fullText.length && (
            <span className="inline-block w-[3px] h-[36px] bg-foreground ml-1 align-middle animate-pulse" aria-hidden="true" />
          )}
        </p>
      </div>
    </div>
  )
}
