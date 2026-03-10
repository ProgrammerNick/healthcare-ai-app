import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PRESET_NAMES = ['Sunny', 'Grace', 'Charlie', 'Mae', 'Oliver', 'Rose']

interface Step3CompanionNameProps {
  relationship: string
  onNext: (companionName: string) => void
  onBack: () => void
  isSaving: boolean
  initialName?: string
}

export default function Step3CompanionName({
  relationship,
  onNext,
  onBack,
  isSaving,
  initialName,
}: Step3CompanionNameProps) {
  const [selectedName, setSelectedName] = useState(initialName ?? '')
  const [customName, setCustomName] = useState(
    initialName && !PRESET_NAMES.includes(initialName) ? initialName : ''
  )
  const [isCustom, setIsCustom] = useState(
    initialName ? !PRESET_NAMES.includes(initialName) : false
  )

  const activeName = isCustom ? customName.trim() : selectedName

  function handlePresetSelect(name: string) {
    setSelectedName(name)
    setIsCustom(false)
    setCustomName('')
  }

  function handleCustomChange(value: string) {
    setCustomName(value)
    setIsCustom(true)
    setSelectedName('')
  }

  function handleSubmit() {
    if (!activeName) return
    onNext(activeName)
  }

  const relationshipLabel = relationship || 'loved one'

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      role="group"
      aria-label="Choose companion name"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Your {relationshipLabel} will talk to an AI companion every day. What
          should it be called?
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {PRESET_NAMES.map((name) => {
          const isSelected = !isCustom && selectedName === name
          return (
            <Card
              key={name}
              className={cn(
                'cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary/50',
                isSelected && 'ring-2 ring-primary'
              )}
              onClick={() => handlePresetSelect(name)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${name} as companion name`}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handlePresetSelect(name)
                }
              }}
            >
              <CardContent className="flex flex-col items-center gap-2 py-2">
                <span className="text-lg font-medium">{name}</span>
                {isSelected && <Badge>Selected</Badge>}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="customName" className="text-sm font-medium">
          Choose your own
        </label>
        <Input
          id="customName"
          placeholder="Type a custom name..."
          value={customName}
          onChange={(e) => handleCustomChange(e.target.value)}
          aria-label="Enter a custom companion name"
        />
        {isCustom && customName.trim() && (
          <Badge className="w-fit">Selected</Badge>
        )}
      </div>

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
          onClick={handleSubmit}
          disabled={!activeName || isSaving}
          className="flex-1"
          type="button"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
