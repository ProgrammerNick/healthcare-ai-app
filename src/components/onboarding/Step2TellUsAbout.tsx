import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Step2Data {
  seniorFirstName: string
  seniorAge: string
  seniorRelationship: string
}

interface Step2TellUsAboutProps {
  onNext: (data: Step2Data) => void
  isSaving: boolean
  initialData?: Partial<Step2Data>
}

const RELATIONSHIPS = [
  { value: 'parent', label: 'Parent' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'other', label: 'Other' },
]

export default function Step2TellUsAbout({
  onNext,
  isSaving,
  initialData,
}: Step2TellUsAboutProps) {
  const [seniorFirstName, setSeniorFirstName] = useState(
    initialData?.seniorFirstName ?? ''
  )
  const [seniorAge, setSeniorAge] = useState(initialData?.seniorAge ?? '')
  const [seniorRelationship, setSeniorRelationship] = useState(
    initialData?.seniorRelationship ?? ''
  )

  const isValid =
    seniorFirstName.trim() !== '' &&
    seniorAge.trim() !== '' &&
    seniorRelationship !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    onNext({ seniorFirstName, seniorAge, seniorRelationship })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      aria-label="Tell us about your loved one"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Tell us about your loved one
        </h2>
        <p className="text-sm text-muted-foreground">
          We use this to personalize the experience for them
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seniorFirstName">First name</Label>
          <Input
            id="seniorFirstName"
            placeholder="e.g. Margaret"
            value={seniorFirstName}
            onChange={(e) => setSeniorFirstName(e.target.value)}
            required
            aria-required="true"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seniorAge">Age</Label>
          <Input
            id="seniorAge"
            type="number"
            placeholder="e.g. 78"
            min={1}
            max={150}
            value={seniorAge}
            onChange={(e) => setSeniorAge(e.target.value)}
            required
            aria-required="true"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="seniorRelationship">Relationship</Label>
          <Select
            value={seniorRelationship}
            onValueChange={setSeniorRelationship}
          >
            <SelectTrigger
              id="seniorRelationship"
              className="w-full"
              aria-label="Select relationship"
            >
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((rel) => (
                <SelectItem key={rel.value} value={rel.value}>
                  {rel.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={!isValid || isSaving}>
        {isSaving ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  )
}
