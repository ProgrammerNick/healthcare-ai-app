import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { SeniorStep1Welcome } from '@/components/onboarding/SeniorStep1Welcome'
import { SeniorStep2MeetCompanion } from '@/components/onboarding/SeniorStep2MeetCompanion'
import { SeniorStep3FirstConversation } from '@/components/onboarding/SeniorStep3FirstConversation'
import { SeniorStep4Success } from '@/components/onboarding/SeniorStep4Success'
import type { ConversationEntry } from '@/components/onboarding/SeniorStep3FirstConversation'

interface SeniorData {
  id: string
  seniorFirstName: string
  companionName: string
}

export default function SeniorOnboarding() {
  const [step, setStep] = useState(1)
  const [seniorData, setSeniorData] = useState<SeniorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [_transcript, setTranscript] = useState<ConversationEntry[]>([])

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getToken } = useAuth()
  const linkCode = searchParams.get('code')

  useEffect(() => {
    async function fetchSeniorData() {
      try {
        const token = await getToken()
        if (!token) {
          setError('Please sign in to continue.')
          setLoading(false)
          return
        }

        // Try fetching with link code first, then fall back to auth-based fetch
        const url = linkCode
          ? `/api/user?code=${encodeURIComponent(linkCode)}`
          : '/api/user'

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          setError('Could not load your information. Please try again.')
          setLoading(false)
          return
        }

        const data = (await res.json()) as {
          user: {
            id: string
            seniorFirstName: string | null
            companionName: string | null
            fullName: string | null
          }
        }

        const user = data.user
        setSeniorData({
          id: user.id,
          seniorFirstName: user.seniorFirstName || user.fullName?.split(' ')[0] || 'Friend',
          companionName: user.companionName || 'Joy',
        })
        setLoading(false)
      } catch {
        setError('Something went wrong. Please try again.')
        setLoading(false)
      }
    }

    fetchSeniorData()
  }, [getToken, linkCode])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <p className="text-[32px] text-muted-foreground animate-pulse">
          Getting things ready...
        </p>
      </div>
    )
  }

  if (error || !seniorData) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6" role="alert">
        <p className="text-[28px] text-destructive text-center">
          {error || 'Something went wrong.'}
        </p>
      </div>
    )
  }

  const { seniorFirstName, companionName, id: seniorId } = seniorData

  return (
    <div className="senior-page">
      {step === 1 && (
        <SeniorStep1Welcome
          seniorName={seniorFirstName}
          companionName={companionName}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <SeniorStep2MeetCompanion
          seniorName={seniorFirstName}
          companionName={companionName}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <SeniorStep3FirstConversation
          seniorName={seniorFirstName}
          companionName={companionName}
          seniorId={seniorId}
          onComplete={(conversationTranscript) => {
            setTranscript(conversationTranscript)
            setStep(4)
          }}
        />
      )}
      {step === 4 && (
        <SeniorStep4Success
          seniorName={seniorFirstName}
          companionName={companionName}
          seniorId={seniorId}
          onFinish={() => navigate('/senior/home')}
        />
      )}
    </div>
  )
}
