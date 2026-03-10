import { useState, useCallback, useRef } from 'react'

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  const w = window as unknown as Record<string, unknown>
  if (typeof w.SpeechRecognition === 'function') {
    return w.SpeechRecognition as unknown as SpeechRecognitionConstructor
  }
  if (typeof w.webkitSpeechRecognition === 'function') {
    return w.webkitSpeechRecognition as unknown as SpeechRecognitionConstructor
  }
  return null
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      setError(null)

      const SpeechRecognitionCtor = getSpeechRecognition()
      if (!SpeechRecognitionCtor) {
        const msg = 'Speech recognition is not supported in this browser.'
        setError(msg)
        reject(new Error(msg))
        return
      }

      const recognition = new SpeechRecognitionCtor()
      recognitionRef.current = recognition
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1]
        const transcript = last[0].transcript
        setIsListening(false)
        resolve(transcript)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false)
        const msg = `Speech recognition error: ${event.error}`
        setError(msg)
        reject(new Error(msg))
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      setIsListening(true)
      recognition.start()
    })
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setIsListening(false)
    }
  }, [])

  const speak = useCallback((text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setError(null)

      if (!window.speechSynthesis) {
        const msg = 'Speech synthesis is not supported in this browser.'
        setError(msg)
        reject(new Error(msg))
        return
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance
      utterance.rate = 0.9
      utterance.pitch = 1.0
      utterance.volume = 1.0
      utterance.lang = 'en-US'

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        setIsSpeaking(false)
        // 'interrupted' and 'canceled' are not real errors
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve()
          return
        }
        const msg = `Speech synthesis error: ${event.error}`
        setError(msg)
        reject(new Error(msg))
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  return {
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    isListening,
    isSpeaking,
    error,
  }
}
