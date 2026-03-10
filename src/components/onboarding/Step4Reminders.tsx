import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

export interface ReminderItem {
  id: string
  title: string
  reminderType: string
  times: string[]
  frequency: string
  enabled: boolean
}

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'morning-med',
    title: 'Morning medication',
    reminderType: 'medication',
    times: ['09:00'],
    frequency: 'daily',
    enabled: true,
  },
  {
    id: 'hydration',
    title: 'Drink a glass of water',
    reminderType: 'hydration',
    times: ['12:00', '15:00'],
    frequency: 'daily',
    enabled: true,
  },
  {
    id: 'evening-checkin',
    title: 'Evening check-in',
    reminderType: 'social',
    times: ['19:00'],
    frequency: 'daily',
    enabled: true,
  },
]

const REMINDER_TYPES = [
  { value: 'medication', label: 'Medication' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'meal', label: 'Meal' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'social', label: 'Social' },
  { value: 'appointment', label: 'Appointment' },
]

interface Step4RemindersProps {
  onNext: (reminders: ReminderItem[]) => void
  onBack: () => void
  isSaving: boolean
}

export default function Step4Reminders({
  onNext,
  onBack,
  isSaving,
}: Step4RemindersProps) {
  const [reminders, setReminders] = useState<ReminderItem[]>(DEFAULT_REMINDERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('medication')
  const [newTime, setNewTime] = useState('08:00')
  const [newFrequency, setNewFrequency] = useState('daily')

  function toggleReminder(id: string) {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  function addCustomReminder() {
    if (!newTitle.trim()) return

    const reminder: ReminderItem = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      reminderType: newType,
      times: [newTime],
      frequency: newFrequency,
      enabled: true,
    }

    setReminders((prev) => [...prev, reminder])
    setNewTitle('')
    setNewType('medication')
    setNewTime('08:00')
    setNewFrequency('daily')
    setDialogOpen(false)
  }

  function handleSubmit() {
    onNext(reminders.filter((r) => r.enabled))
  }

  function formatTimes(times: string[]) {
    return times
      .map((t) => {
        const [hours, minutes] = t.split(':')
        const h = parseInt(hours, 10)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
        return `${h12}:${minutes} ${ampm}`
      })
      .join(' and ')
  }

  return (
    <div
      className="mx-auto flex w-full max-w-md flex-col gap-6"
      role="group"
      aria-label="Set up reminders"
    >
      <div className="flex flex-col gap-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Let&apos;s add a few reminders to get started
        </h2>
      </div>

      <div className="flex flex-col gap-3">
        {reminders.map((reminder) => (
          <Card key={reminder.id}>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <CardTitle>{reminder.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {reminder.frequency === 'daily' ? 'Daily' : reminder.frequency}{' '}
                  at {formatTimes(reminder.times)}
                </p>
              </div>
              <Switch
                checked={reminder.enabled}
                onCheckedChange={() => toggleReminder(reminder.id)}
                aria-label={`Toggle ${reminder.title}`}
              />
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger
          render={
            <Button variant="outline" className="w-full" type="button" />
          }
        >
          Add a custom reminder
        </DialogTrigger>
        <DialogContent aria-label="Add custom reminder dialog">
          <DialogHeader>
            <DialogTitle>Add a custom reminder</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminderTitle">Title</Label>
              <Input
                id="reminderTitle"
                placeholder="e.g. Take vitamins"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                aria-required="true"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminderType">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v ?? 'medication')}>
                <SelectTrigger
                  id="reminderType"
                  className="w-full"
                  aria-label="Select reminder type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminderTime">Time</Label>
              <Input
                id="reminderTime"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                aria-label="Select reminder time"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminderFrequency">Frequency</Label>
              <Select value={newFrequency} onValueChange={(v) => setNewFrequency(v ?? 'daily')}>
                <SelectTrigger
                  id="reminderFrequency"
                  className="w-full"
                  aria-label="Select frequency"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
            >
              Cancel
            </DialogClose>
            <Button
              onClick={addCustomReminder}
              disabled={!newTitle.trim()}
              type="button"
            >
              Add reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          disabled={isSaving}
          className="flex-1"
          type="button"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}
