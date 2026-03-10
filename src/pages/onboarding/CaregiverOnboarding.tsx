import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/hooks/useOnboarding'
import Step2TellUsAbout from '@/components/onboarding/Step2TellUsAbout'
import Step3CompanionName from '@/components/onboarding/Step3CompanionName'
import Step4Reminders from '@/components/onboarding/Step4Reminders'
import type { ReminderItem } from '@/components/onboarding/Step4Reminders'
import Step5HealthSignals from '@/components/onboarding/Step5HealthSignals'
import Step6AlertPreferences from '@/components/onboarding/Step6AlertPreferences'
import type { AlertPreferencesData } from '@/components/onboarding/Step6AlertPreferences'
import Step7LinkCode from '@/components/onboarding/Step7LinkCode'

export default function CaregiverOnboarding() {
  const { currentStep, isSaving, saveStep, createReminders, goNext, goBack } =
    useOnboarding(2)

  // Shared state across steps
  const [seniorFirstName, setSeniorFirstName] = useState('')
  const [seniorRelationship, setSeniorRelationship] = useState('')
  const [companionName, setCompanionName] = useState('')

  // Progress: steps 2-7 mapped to 0-100
  const progressValue = ((currentStep - 2) / 5) * 100

  async function handleStep2(data: {
    seniorFirstName: string
    seniorAge: string
    seniorRelationship: string
  }) {
    setSeniorFirstName(data.seniorFirstName)
    setSeniorRelationship(data.seniorRelationship)
    await saveStep(2, {
      seniorFirstName: data.seniorFirstName,
      seniorAge: parseInt(data.seniorAge, 10),
      seniorRelationship: data.seniorRelationship,
    })
    goNext()
  }

  async function handleStep3(name: string) {
    setCompanionName(name)
    await saveStep(3, { companionName: name })
    goNext()
  }

  async function handleStep4(reminders: ReminderItem[]) {
    await createReminders(
      reminders.map((r) => ({
        title: r.title,
        reminderType: r.reminderType,
        recurrence: { times: r.times, frequency: r.frequency },
      }))
    )
    await saveStep(4, {})
    goNext()
  }

  async function handleStep5(signals: Record<string, boolean>) {
    await saveStep(5, { healthSignalPreferences: signals })
    goNext()
  }

  async function handleStep6(prefs: AlertPreferencesData) {
    await saveStep(6, { alertPreferences: prefs })
    goNext()
  }

  async function handleStep7(action: string, code: string) {
    await saveStep(7, {
      linkCode: code,
      linkCodeExpiresAt: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      onboardingCompleted: action === 'later',
    })
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep - 1} of 6
          </span>
        </div>
        <Progress
          value={progressValue}
          aria-label={`Onboarding progress: step ${currentStep - 1} of 6`}
        />
      </div>

      <div className="flex flex-1 items-center justify-center py-8">
        {currentStep === 2 && (
          <Step2TellUsAbout
            onNext={(data) => void handleStep2(data)}
            isSaving={isSaving}
          />
        )}

        {currentStep === 3 && (
          <Step3CompanionName
            relationship={seniorRelationship}
            onNext={(name) => void handleStep3(name)}
            onBack={goBack}
            isSaving={isSaving}
            initialName={companionName}
          />
        )}

        {currentStep === 4 && (
          <Step4Reminders
            onNext={(reminders) => void handleStep4(reminders)}
            onBack={goBack}
            isSaving={isSaving}
          />
        )}

        {currentStep === 5 && (
          <Step5HealthSignals
            onNext={(signals) => void handleStep5(signals)}
            onBack={goBack}
            isSaving={isSaving}
          />
        )}

        {currentStep === 6 && (
          <Step6AlertPreferences
            onNext={(prefs) => void handleStep6(prefs)}
            onBack={goBack}
            isSaving={isSaving}
          />
        )}

        {currentStep === 7 && (
          <Step7LinkCode
            seniorName={seniorFirstName || 'your loved one'}
            onComplete={(action, code) => void handleStep7(action, code)}
            onBack={goBack}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  )
}
