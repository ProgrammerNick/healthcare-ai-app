import { useEffect, useRef } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SeniorStep4SuccessProps {
  seniorName: string
  companionName: string
  seniorId: string
  onFinish: () => void
}

export function SeniorStep4Success({ seniorName, companionName, seniorId, onFinish }: SeniorStep4SuccessProps) {
  const hasPostedRef = useRef(false)

  useEffect(() => {
    if (hasPostedRef.current) return
    hasPostedRef.current = true

    // Mark onboarding as complete and notify caregiver
    fetch('/api/onboarding-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seniorId }),
    }).catch(() => {
      // Non-critical — the senior can still proceed
    })
  }, [seniorId])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      role="main"
      aria-label="Onboarding complete"
    >
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <CheckCircle2
          className="text-[#16a34a]"
          size={96}
          strokeWidth={1.5}
          aria-hidden="true"
        />

        <h1 className="text-[36px] font-semibold leading-tight text-foreground">
          That&apos;s it &mdash; you&apos;re all set, {seniorName}.
        </h1>

        <p className="text-[28px] leading-snug text-muted-foreground">
          {companionName} will check in with you tomorrow morning.
        </p>

        <Button
          onClick={onFinish}
          aria-label="See today's reminders"
          className="mt-8 min-h-[72px] w-full max-w-sm rounded-xl px-8 text-[24px] font-medium"
        >
          See today&apos;s reminders
        </Button>
      </div>
    </div>
  )
}
