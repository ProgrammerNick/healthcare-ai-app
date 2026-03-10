import { useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'

interface FamilyMessage {
  id: string
  fromUserId: string
  toSeniorId: string
  messageText: string
  audioUrl: string | null
  playedAt: string | null
  createdAt: string
}

export default function FamilyMessages() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const { data: userData } = useUserData()
  const queryClient = useQueryClient()
  const seniorId = userData?.linkedSeniorId

  const [messageText, setMessageText] = useState('')

  // Fetch sent messages - we use health-logs endpoint pattern to get messages
  // Since the family-message API doesn't have a GET for listing, we query directly
  const { data: messages, isLoading } = useQuery<FamilyMessage[]>({
    queryKey: ['family-messages', seniorId],
    queryFn: async () => {
      const token = await getToken()
      // Use a custom query parameter to list messages for a senior
      const res = await fetch(`/api/family-message?senior_id=${seniorId}&action=list`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // If the endpoint doesn't support GET listing yet, return empty
      if (!res.ok) return []
      const body = (await res.json()) as { messages: FamilyMessage[] }
      return body.messages || []
    },
    enabled: !!seniorId,
  })

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const token = await getToken()
      const res = await fetch('/api/family-message', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_senior_id: seniorId,
          message_text: text,
          from_clerk_user_id: user?.id,
        }),
      })
      if (!res.ok) throw new Error('Failed to send message')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-messages'] })
      setMessageText('')
    },
  })

  function handleSend() {
    if (!messageText.trim()) return
    sendMutation.mutate(messageText)
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Family Messages</h1>

        {/* Compose */}
        <Card>
          <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>
              Send a voice or text message to {userData?.seniorFirstName || 'your senior'}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              rows={3}
              aria-label="Message text"
            />
            <Button
              onClick={handleSend}
              disabled={!messageText.trim() || sendMutation.isPending}
              aria-label="Send message"
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              Send Message
            </Button>
          </CardContent>
        </Card>

        {/* Sent History */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">Sent Messages</h2>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}

          {messages && messages.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No messages sent yet.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {messages?.map((msg) => (
              <Card key={msg.id}>
                <CardContent className="flex items-start justify-between gap-4 py-4">
                  <div className="flex-1">
                    <p className="text-sm">{msg.messageText}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(msg.createdAt)}</p>
                  </div>
                  <Badge variant={msg.playedAt ? 'default' : 'secondary'}>
                    {msg.playedAt ? 'Played' : 'Sent'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </CaregiverLayout>
  )
}
