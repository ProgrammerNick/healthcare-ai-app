import { cn } from '@/lib/utils'

export type VoiceOrbState = 'idle' | 'listening' | 'processing' | 'error' | 'success'

interface VoiceOrbProps {
  state: VoiceOrbState
  onClick: () => void
  companionName: string
}

export function VoiceOrb({ state, onClick, companionName }: VoiceOrbProps) {
  const label = state === 'listening'
    ? `Listening... Tap to stop`
    : state === 'processing'
      ? 'Thinking...'
      : state === 'error'
        ? 'Something went wrong. Tap to try again'
        : state === 'success'
          ? 'All done!'
          : `Tap to talk to ${companionName}`

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          'relative flex items-center justify-center rounded-full',
          'w-[200px] h-[200px] transition-colors duration-300',
          'focus-visible:outline-3 focus-visible:outline-[#1a56db]',
          'cursor-pointer select-none',
          state === 'idle' && 'bg-[#0f2a4a] voice-orb-idle',
          state === 'listening' && 'bg-[#16a34a] voice-orb-listening',
          state === 'processing' && 'bg-[#d97706] voice-orb-processing',
          state === 'error' && 'bg-[#dc2626] voice-orb-error',
          state === 'success' && 'bg-[#0d9488] voice-orb-success',
        )}
      >
        {/* Ripple effect for listening */}
        {state === 'listening' && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#16a34a]/40 voice-orb-ripple" />
            <span className="absolute inset-0 rounded-full bg-[#16a34a]/20 voice-orb-ripple voice-orb-ripple-delayed" />
          </>
        )}

        {/* Rotating arc for processing */}
        {state === 'processing' && (
          <span className="absolute inset-[-4px] rounded-full border-4 border-transparent border-t-white/60 voice-orb-rotate" />
        )}

        {/* Inner icon area */}
        <span className="relative z-10 text-white" aria-hidden="true">
          {state === 'idle' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
          {state === 'listening' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
          {state === 'processing' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          )}
          {state === 'error' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          )}
          {state === 'success' && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>

      <p
        className="text-[20px] text-muted-foreground text-center max-w-[280px]"
        aria-live="polite"
      >
        {label}
      </p>
    </div>
  )
}
