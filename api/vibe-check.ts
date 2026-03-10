import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { decrypt } from '../src/lib/encryption';
import { generateJSON } from '../src/lib/gemini';
import { sendUrgentAlert } from '../src/lib/resend';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

interface VibeCheckResult {
  sentiment_score: number;
  flags: {
    lethargy: boolean;
    confusion: boolean;
    distress: boolean;
    isolation: boolean;
  };
  summary: string;
  alert_level: 'none' | 'watch' | 'urgent';
  recommended_actions: string[];
}

const SYSTEM_PROMPT = `Analyze these conversation excerpts and health data from an elderly person. Return ONLY valid JSON: { sentiment_score: number (-1.0 to 1.0), flags: { lethargy: bool, confusion: bool, distress: bool, isolation: bool }, summary: string (max 2 sentences), alert_level: 'none'|'watch'|'urgent', recommended_actions: string[] (max 3) }`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { senior_id, lookback_hours = 24 } = req.body;

    if (!senior_id) {
      return res.status(400).json({ error: 'Missing required field: senior_id' });
    }

    const db = getDb();

    // Verify the requesting user is a caregiver linked to this senior
    // For now, check that at least one caregiver is linked to this senior
    const caregivers = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, 'caregiver'),
          eq(schema.users.linkedSeniorId, senior_id)
        )
      );

    if (!caregivers.length) {
      return res.status(403).json({ error: 'Forbidden: no caregiver role found for this senior' });
    }

    const windowStart = new Date(Date.now() - lookback_hours * 60 * 60 * 1000);

    // Fetch recent conversations
    const recentConversations = await db
      .select()
      .from(schema.conversations)
      .where(
        and(
          eq(schema.conversations.seniorId, senior_id),
          gte(schema.conversations.createdAt, windowStart)
        )
      )
      .orderBy(desc(schema.conversations.createdAt));

    // Fetch recent health logs
    const recentHealthLogs = await db
      .select()
      .from(schema.healthLogs)
      .where(
        and(
          eq(schema.healthLogs.seniorId, senior_id),
          gte(schema.healthLogs.recordedAt, windowStart)
        )
      )
      .orderBy(desc(schema.healthLogs.recordedAt));

    // Decrypt health log values for analysis
    const healthData: { type: string; value: string; notes: string | null }[] = [];
    for (const log of recentHealthLogs) {
      const value = await decrypt(log.valueEncrypted);
      const notes = log.notesEncrypted ? await decrypt(log.notesEncrypted) : null;
      healthData.push({ type: log.logType, value, notes });
    }

    const conversationExcerpts = recentConversations
      .map((c) => c.transcript.substring(0, 500))
      .join('\n---\n');

    const healthSummary = healthData
      .map((h) => `${h.type}: ${h.value}${h.notes ? ` (${h.notes})` : ''}`)
      .join(', ');

    const prompt = `Conversations (last ${lookback_hours}h):\n${conversationExcerpts || 'No conversations'}\n\nHealth data:\n${healthSummary || 'No health data'}`;

    const result = await generateJSON<VibeCheckResult>(prompt, SYSTEM_PROMPT);

    // Update sentiment on conversation rows
    for (const conv of recentConversations) {
      await db
        .update(schema.conversations)
        .set({
          sentimentScore: String(result.sentiment_score),
          sentimentFlags: result.flags,
        })
        .where(eq(schema.conversations.id, conv.id));
    }

    // If urgent: insert anomaly_alert and send email
    if (result.alert_level === 'urgent') {
      await db.insert(schema.anomalyAlerts).values({
        seniorId: senior_id,
        alertType: 'vibe_urgent',
        description: result.summary,
      });

      // Send urgent alert email to linked caregivers
      const senior = await db
        .select({ fullName: schema.users.fullName })
        .from(schema.users)
        .where(eq(schema.users.id, senior_id))
        .limit(1);

      const seniorName = senior[0]?.fullName || 'your loved one';

      for (const caregiver of caregivers) {
        if (caregiver.clerkUserId) {
          // In production, look up caregiver email from Clerk
          // For now, use a placeholder approach - the caregiver's email would come from Clerk
          // We'll send to any email we can find
          try {
            await sendUrgentAlert(
              `caregiver-${caregiver.id}@goldencare.app`, // placeholder - replace with actual email from Clerk
              seniorName,
              `${result.summary} Recommended actions: ${result.recommended_actions.join(', ')}`
            );
          } catch (emailError) {
            console.error('Failed to send urgent alert email:', emailError);
          }
        }
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('vibe-check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
