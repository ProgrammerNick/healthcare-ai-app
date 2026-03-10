import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Role = 'caregiver' | 'senior'

export default function RoleSelection() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSelect(role: Role) {
    setIsSubmitting(true)
    try {
      const token = await getToken()
      if (!token) return

      await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ step: 1, data: { role } }),
      })

      if (role === 'caregiver') {
        navigate('/onboarding/caregiver')
      } else {
        navigate('/onboarding/senior')
      }
    } catch (error) {
      console.error('Failed to set role:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const roles: Array<{
    role: Role
    title: string
    description: string
  }> = [
    {
      role: 'caregiver',
      title: "I'm setting this up for a family member",
      description:
        'You\'ll configure the app, set reminders, and monitor health signals for your loved one.',
    },
    {
      role: 'senior',
      title: 'Someone set this up for me',
      description:
        'You\'ll talk to a friendly AI companion and share how you\'re feeling each day.',
    },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Take care of the people who matter most
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          {roles.map((item) => (
            <Card
              key={item.role}
              className={cn(
                'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50',
                isSubmitting && 'pointer-events-none opacity-50'
              )}
              onClick={() => void handleSelect(item.role)}
              role="button"
              tabIndex={0}
              aria-label={item.title}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  void handleSelect(item.role)
                }
              }}
            >
              <CardContent className="flex flex-col gap-2 py-4">
                <p className="text-lg font-semibold">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Most people choose the first option and take about 5 minutes to get
          started
        </p>
      </div>
    </div>
  )
}
