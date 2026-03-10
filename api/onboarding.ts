import type { VercelRequest, VercelResponse } from '@vercel/node'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../drizzle/schema'

async function verifyClerkSession(token: string): Promise<{ sub: string } | null> {
  const res = await fetch('https://api.clerk.com/v1/tokens/verify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const payload = JSON.parse(atob(parts[1]))
      if (payload.sub) return { sub: payload.sub as string }
    } catch {
      return null
    }
    return null
  }

  const data = (await res.json()) as { sub: string }
  return data
}

function getDb() {
  const sql = neon(process.env.DATABASE_URL!)
  return drizzle(sql, { schema })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.slice(7)
  const session = await verifyClerkSession(token)

  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  const clerkUserId = session.sub
  const db = getDb()

  if (req.method === 'PATCH') {
    try {
      const { step, data } = req.body as {
        step: number
        data: Record<string, unknown>
      }

      if (typeof step !== 'number') {
        return res.status(400).json({ error: 'Missing step number' })
      }

      const updateFields: Record<string, unknown> = {
        onboardingStep: step,
      }

      // Step 1: role selection
      if (step === 1 && data.role) {
        updateFields.role = data.role
      }

      // Step 2: senior info
      if (step === 2) {
        if (data.seniorFirstName) updateFields.seniorFirstName = data.seniorFirstName
        if (data.seniorAge) updateFields.seniorAge = data.seniorAge
        if (data.seniorRelationship) updateFields.seniorRelationship = data.seniorRelationship
      }

      // Step 3: companion name
      if (step === 3 && data.companionName) {
        updateFields.companionName = data.companionName
      }

      // Step 5: health signal preferences
      if (step === 5 && data.healthSignalPreferences) {
        updateFields.healthSignalPreferences = data.healthSignalPreferences
      }

      // Step 6: alert preferences
      if (step === 6 && data.alertPreferences) {
        updateFields.alertPreferences = data.alertPreferences
      }

      // Step 7: link code + mark complete
      if (step === 7) {
        if (data.linkCode) updateFields.linkCode = data.linkCode
        if (data.linkCodeExpiresAt) updateFields.linkCodeExpiresAt = new Date(data.linkCodeExpiresAt as string)
        if (data.onboardingCompleted) updateFields.onboardingCompleted = true
      }

      const updatedUsers = await db
        .update(schema.users)
        .set(updateFields)
        .where(eq(schema.users.clerkUserId, clerkUserId))
        .returning()

      if (!updatedUsers.length) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json({ success: true, user: updatedUsers[0] })
    } catch (error) {
      console.error('Error updating onboarding:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, data } = req.body as {
        action: string
        data: Record<string, unknown>
      }

      if (action === 'create_reminders') {
        const remindersData = data.reminders as Array<{
          title: string
          reminderType: 'medication' | 'social' | 'appointment' | 'exercise' | 'hydration' | 'meal'
          recurrence: unknown
        }>

        // Find user to get their ID
        const existingUsers = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.clerkUserId, clerkUserId))
          .limit(1)

        if (!existingUsers.length) {
          return res.status(404).json({ error: 'User not found' })
        }

        const userId = existingUsers[0].id

        const insertedReminders = await db
          .insert(schema.reminders)
          .values(
            remindersData.map((r) => ({
              seniorId: userId,
              reminderType: r.reminderType,
              title: r.title,
              recurrence: r.recurrence,
              isActive: true,
            }))
          )
          .returning()

        return res.status(201).json({ success: true, reminders: insertedReminders })
      }

      return res.status(400).json({ error: 'Unknown action' })
    } catch (error) {
      console.error('Error in onboarding POST:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
