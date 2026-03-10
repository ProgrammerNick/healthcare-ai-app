import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'

interface Reminder {
  id: string
  seniorId: string
  reminderType: string
  title: string
  recurrence: unknown
  isActive: boolean
  lastTriggeredAt: string | null
}

const REMINDER_TYPES = [
  { value: 'medication', label: 'Medication' },
  { value: 'social', label: 'Social' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'meal', label: 'Meal' },
]

export default function Reminders() {
  const { getToken } = useAuth()
  const { data: userData } = useUserData()
  const queryClient = useQueryClient()
  const seniorId = userData?.linkedSeniorId

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState('medication')

  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders', seniorId],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`/api/reminders?senior_id=${seniorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch reminders')
      const body = (await res.json()) as { reminders: Reminder[] }
      return body.reminders
    },
    enabled: !!seniorId,
  })

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; reminder_type: string }) => {
      const token = await getToken()
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ senior_id: seniorId, ...data }),
      })
      if (!res.ok) throw new Error('Failed to create reminder')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setDialogOpen(false)
      resetForm()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; title?: string; reminder_type?: string; is_active?: boolean }) => {
      const token = await getToken()
      const { id, ...body } = data
      const res = await fetch(`/api/reminders?id=${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update reminder')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setDialogOpen(false)
      setEditingReminder(null)
      resetForm()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      const res = await fetch(`/api/reminders?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete reminder')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
  })

  function resetForm() {
    setFormTitle('')
    setFormType('medication')
  }

  function openAdd() {
    setEditingReminder(null)
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(reminder: Reminder) {
    setEditingReminder(reminder)
    setFormTitle(reminder.title)
    setFormType(reminder.reminderType)
    setDialogOpen(true)
  }

  function handleSubmit() {
    if (!formTitle.trim()) return
    if (editingReminder) {
      updateMutation.mutate({
        id: editingReminder.id,
        title: formTitle,
        reminder_type: formType,
      })
    } else {
      createMutation.mutate({ title: formTitle, reminder_type: formType })
    }
  }

  function handleToggle(reminder: Reminder) {
    updateMutation.mutate({ id: reminder.id, is_active: !reminder.isActive })
  }

  const typeLabel = (type: string) =>
    REMINDER_TYPES.find((t) => t.value === type)?.label || type

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Reminders</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" onClick={openAdd} aria-label="Add a new reminder" />}>
              <Plus className="size-4" aria-hidden="true" />
              Add Reminder
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Title</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Take morning medication"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <Select value={formType} onValueChange={(v) => setFormType(v ?? 'medication')}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={!formTitle.trim() || createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                  ) : editingReminder ? (
                    'Save Changes'
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {reminders && reminders.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No reminders yet. Add one to get started.</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {reminders?.map((reminder) => (
            <Card key={reminder.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className={reminder.isActive ? '' : 'text-muted-foreground line-through'}>
                    {reminder.title}
                  </span>
                  <Switch
                    checked={reminder.isActive}
                    onCheckedChange={() => handleToggle(reminder)}
                    aria-label={`Toggle ${reminder.title} ${reminder.isActive ? 'off' : 'on'}`}
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary">{typeLabel(reminder.reminderType)}</Badge>
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEdit(reminder)} aria-label={`Edit ${reminder.title}`}>
                  <Pencil className="size-3" aria-hidden="true" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(reminder.id)}
                  disabled={deleteMutation.isPending}
                  aria-label={`Delete ${reminder.title}`}
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </CaregiverLayout>
  )
}
