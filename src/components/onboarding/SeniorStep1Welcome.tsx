import { Button } from '@/components/ui/button'

interface SeniorStep1WelcomeProps {
  seniorName: string
  companionName: string
  onNext: () => void
}

export function SeniorStep1Welcome({ seniorName, companionName, onNext }: SeniorStep1WelcomeProps) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      role="main"
      aria-label="Welcome screen"
    >
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <h1
          className="text-[40px] font-semibold leading-tight tracking-tight text-foreground"
        >
          Hello, {seniorName}.
        </h1>

        <p className="text-[32px] leading-snug text-muted-foreground">
          {companionName} is here to chat with you every day.
        </p>

        <Button
          onClick={onNext}
          aria-label="Let's say hello and meet your companion"
          className="mt-8 min-h-[72px] w-full max-w-sm rounded-xl px-8 text-[24px] font-medium"
        >
          Let&apos;s say hello
        </Button>
      </div>
    </div>
  )
}
