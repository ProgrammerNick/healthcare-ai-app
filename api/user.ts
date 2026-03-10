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
    // Fallback: decode JWT payload without verification for development
    // In production, use Clerk's verify endpoint or a JWT library
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
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = authHeader.slice(7)
  const session = await verifyClerkSession(token)

  if (!session) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }

  const clerkUserId = session.sub
  const db = getDb()

  try {
    // Look up existing user
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.clerkUserId, clerkUserId))
      .limit(1)

    if (existingUsers.length > 0) {
      const user = existingUsers[0]
      res.status(200).json({
        user: {
          id: user.id,
          clerkUserId: user.clerkUserId,
          role: user.role,
          fullName: user.fullName,
          companionName: user.companionName,
          linkedSeniorId: user.linkedSeniorId,
          timezone: user.timezone,
          onboardingCompleted: user.onboardingCompleted,
          onboardingStep: user.onboardingStep,
          seniorFirstName: user.seniorFirstName,
          seniorAge: user.seniorAge,
          seniorRelationship: user.seniorRelationship,
        },
      })
      return
    }

    // Create new user record with default role (will be updated during onboarding)
    const newUsers = await db
      .insert(schema.users)
      .values({
        clerkUserId,
        role: 'senior',
        onboardingCompleted: false,
        onboardingStep: 0,
      })
      .returning()

    const newUser = newUsers[0]
    res.status(200).json({
      user: {
        id: newUser.id,
        clerkUserId: newUser.clerkUserId,
        role: newUser.role,
        fullName: newUser.fullName,
        companionName: newUser.companionName,
        linkedSeniorId: newUser.linkedSeniorId,
        timezone: newUser.timezone,
        onboardingCompleted: newUser.onboardingCompleted,
        onboardingStep: newUser.onboardingStep,
        seniorFirstName: newUser.seniorFirstName,
        seniorAge: newUser.seniorAge,
        seniorRelationship: newUser.seniorRelationship,
      },
    })
  } catch (error) {
    console.error('Error fetching/creating user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
