import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Step7LinkCodeProps {
  seniorName: string
  onComplete: (action: 'setup_now' | 'send_link' | 'later', code: string) => void
  onBack: () => void
  isSaving: boolean
}

function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

type SetupOption = 'setup_now' | 'send_link' | 'later'

export default function Step7LinkCode({
  seniorName,
  onComplete,
  onBack,
  isSaving,
}: Step7LinkCodeProps) {
  const code = useMemo(() => generateLinkCode(), [])
  const [selectedOption, setSelectedOption] = useState<SetupOption | null>(null)
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()

  async function handleCopyLink() {
    const link = `${window.location.origin}/onboarding/senior?code=${code}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleContinue() {
    if (!selectedOption) return

    if (selectedOption === 'setup_now') {
      onComplete('setup_now', code)
      navigate(`/onboarding/senior?code=${code}`)
    } else if (selectedOption === 'send_link') {
      void handleCopyLink()
      onComplete('send_link', code)
    } else {
      onComplete('later', code)
      navigate('/caregiver/dashboard')
    }
  }

  const options: Array<{
    id: SetupOption
    title: string
    description: string
  }> = [
    {
      id: 'setup_now',
      title: "I'll set it up on their device right now",
      description: 'Opens the senior setup flow in this browser',
    },
    {
      id: 'send_link',
      title: 'Send them a setup link',
      description: 'Copy a link to share with them',
    },
    {
      id: 'later',
      title: "I'll do this later",
      description: 'Go to your dashboard and set this up another time',
    },
  ]

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      role="group"
      aria-label="Link code setup"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Almost done. Now let&apos;s get {seniorName} set up.
        </h2>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">Setup code</p>
          <p
            className="font-mono text-5xl font-bold tracking-widest"
            aria-label={`Setup code: ${code.split('').join(' ')}`}
          >
            {code}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <Card
            key={option.id}
            className={cn(
              'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50',
              selectedOption === option.id && 'ring-2 ring-primary'
            )}
            onClick={() => setSelectedOption(option.id)}
            role="button"
            tabIndex={0}
            aria-label={option.title}
            aria-pressed={selectedOption === option.id}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setSelectedOption(option.id)
              }
            }}
          >
            <CardContent className="py-2">
              <p className="font-medium">{option.title}</p>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {copied && (
        <p className="text-center text-sm text-muted-foreground" role="status">
          Link copied to clipboard
        </p>
      )}

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
          onClick={handleContinue}
          disabled={!selectedOption || isSaving}
          className="flex-1"
          type="button"
        >
          {isSaving ? 'Saving...' : 'Finish'}
        </Button>
      </div>
    </div>
  )
}
