import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';
import { encrypt } from '../src/lib/encryption';
import { generateJSON } from '../src/lib/gemini';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

// Simple in-memory rate limiter: 30 req/min per user
// TODO: Replace with @upstash/ratelimit for production (multi-instance safe)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= 30) {
    return false;
  }

  entry.count++;
  return true;
}

interface HealthEvent {
  type:
    | 'blood_pressure'
    | 'weight'
    | 'sleep_hours'
    | 'medication_taken'
    | 'mood_score'
    | 'pain_level'
    | 'hydration_glasses'
    | 'mobility_difficulty'
    | 'appetite_rating'
    | 'social_contact_count';
  value: unknown;
  unit: string | null;
  notes: string | null;
}

interface GeminiHealthResponse {
  events: HealthEvent[];
}

const SYSTEM_PROMPT = `Extract health events from the following speech. Return ONLY valid JSON: { events: [{ type: 'blood_pressure'|'weight'|'sleep_hours'|'medication_taken'|'mood_score'|'pain_level'|'hydration_glasses'|'mobility_difficulty'|'appetite_rating'|'social_contact_count', value: any, unit: string|null, notes: string|null }] } Mood and pain on 1-10 scale. Hydration in glasses. Mobility as boolean. Appetite on 1-5 scale. Social contact as count. Return { events: [] } if no health events found.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Clerk auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' });
  }

  // Extract a user identifier from the token for rate limiting
  // In production, verify JWT properly using Clerk SDK
  const token = authHeader.replace('Bearer ', '');

  if (!checkRateLimit(token)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }

  try {
    const { transcript, senior_id, duration_seconds, word_count } = req.body;

    if (!transcript || !senior_id) {
      return res.status(400).json({ error: 'Missing required fields: transcript, senior_id' });
    }

    // Extract health events from transcript via Gemini
    const result = await generateJSON<GeminiHealthResponse>(transcript, SYSTEM_PROMPT);
    const events = result.events || [];

    const db = getDb();
    const now = new Date();

    // Encrypt and insert each health event
    for (const event of events) {
      const encryptedValue = await encrypt(String(event.value));
      const encryptedNotes = event.notes ? await encrypt(event.notes) : null;

      await db.insert(schema.healthLogs).values({
        seniorId: senior_id,
        logType: event.type,
        valueEncrypted: encryptedValue,
        recordedAt: now,
        source: 'voice',
        notesEncrypted: encryptedNotes,
      });
    }

    // Insert conversation record
    await db.insert(schema.conversations).values({
      seniorId: senior_id,
      transcript,
      durationSeconds: duration_seconds || null,
      wordCount: word_count || null,
      createdAt: now,
    });

    return res.status(200).json({
      success: true,
      events_extracted: events.length,
    });
  } catch (error) {
    console.error('voice-to-health error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
