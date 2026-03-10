import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useUserData } from '@/hooks/useUserData'
import CaregiverLayout from '@/components/caregiver/CaregiverLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Loader2, Filter, Copy, Check } from 'lucide-react'

interface Memory {
  id: string
  seniorId: string
  promptUsed: string | null
  transcript: string
  summary: string | null
  tags: string[] | null
  createdAt: string
}

export default function MemoryBook() {
  const { getToken } = useAuth()
  const { data: userData } = useUserData()
  const seniorId = userData?.linkedSeniorId

  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: memories, isLoading } = useQuery<Memory[]>({
    queryKey: ['memories', seniorId],
    queryFn: async () => {
      const token = await getToken()
      const res = await fetch(`/api/memory?senior_id=${seniorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      // If the endpoint doesn't support GET listing, return empty
      if (!res.ok) return []
      const body = (await res.json()) as { memories: Memory[] }
      return body.memories || []
    },
    enabled: !!seniorId,
  })

  // Collect all unique tags
  const allTags = Array.from(
    new Set(
      (memories || []).flatMap((m) => (m.tags as string[]) || [])
    )
  ).sort()

  // Filter memories by selected tags
  const filteredMemories =
    selectedTags.size === 0
      ? memories
      : memories?.filter((m) =>
          (m.tags as string[] || []).some((tag) => selectedTags.has(tag))
        )

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }
      return next
    })
  }

  async function handleShare(memoryId: string, summary: string | null) {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopiedId(memoryId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <CaregiverLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Memory Book</h1>
          {allTags.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <Filter className="size-3" aria-hidden="true" />
                    Filter by Tag
                    {selectedTags.size > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {selectedTags.size}
                      </Badge>
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuLabel>Tags</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allTags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={selectedTags.has(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {filteredMemories && filteredMemories.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                {selectedTags.size > 0
                  ? 'No memories match the selected tags.'
                  : 'No memories recorded yet.'}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {filteredMemories?.map((memory) => (
            <Card key={memory.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {memory.promptUsed || 'Memory'}
                </CardTitle>
                <CardDescription>{formatDate(memory.createdAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {memory.summary && (
                  <p className="text-sm">{memory.summary}</p>
                )}
                {memory.tags && (memory.tags as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(memory.tags as string[]).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleShare(memory.id, memory.summary)}
                  disabled={!memory.summary}
                  aria-label={`Share memory: ${memory.promptUsed || 'Memory'}`}
                >
                  {copiedId === memory.id ? (
                    <>
                      <Check className="size-3" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" aria-hidden="true" />
                      Share
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </CaregiverLayout>
  )
}
