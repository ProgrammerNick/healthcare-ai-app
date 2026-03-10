import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, isNull, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { decrypt } from '../src/lib/encryption';
import { generateContent } from '../src/lib/gemini';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { senior_id } = req.body;

    if (!senior_id) {
      return res.status(400).json({ error: 'Missing required field: senior_id' });
    }

    const db = getDb();

    // Fetch senior profile
    const senior = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, senior_id))
      .limit(1);

    if (!senior.length) {
      return res.status(404).json({ error: 'Senior not found' });
    }

    const seniorUser = senior[0];
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Fetch today's active reminders
    const todayReminders = await db
      .select()
      .from(schema.reminders)
      .where(
        and(
          eq(schema.reminders.seniorId, senior_id),
          eq(schema.reminders.isActive, true)
        )
      );

    // Fetch yesterday's mood score (most recent)
    const yesterdayMood = await db
      .select()
      .from(schema.healthLogs)
      .where(
        and(
          eq(schema.healthLogs.seniorId, senior_id),
          eq(schema.healthLogs.logType, 'mood_score'),
          gte(schema.healthLogs.recordedAt, yesterdayStart)
        )
      )
      .orderBy(desc(schema.healthLogs.recordedAt))
      .limit(1);

    let moodText = 'no mood recorded yesterday';
    if (yesterdayMood.length > 0) {
      const decryptedMood = await decrypt(yesterdayMood[0].valueEncrypted);
      moodText = `yesterday's mood was ${decryptedMood}/10`;
    }

    // Fetch unplayed family messages
    const unplayedMessages = await db
      .select({
        messageText: schema.familyMessages.messageText,
        fromUserId: schema.familyMessages.fromUserId,
      })
      .from(schema.familyMessages)
      .where(
        and(
          eq(schema.familyMessages.toSeniorId, senior_id),
          isNull(schema.familyMessages.playedAt)
        )
      );

    // Look up sender names for messages
    const messagesWithNames: string[] = [];
    for (const msg of unplayedMessages) {
      const sender = await db
        .select({ fullName: schema.users.fullName })
        .from(schema.users)
        .where(eq(schema.users.id, msg.fromUserId))
        .limit(1);
      const senderName = sender[0]?.fullName || 'a family member';
      messagesWithNames.push(`${senderName} says: "${msg.messageText}"`);
    }

    const reminderList = todayReminders.map((r) => `${r.reminderType}: ${r.title}`).join(', ') || 'no reminders today';
    const messageList = messagesWithNames.join('; ') || 'no new messages';

    const seniorName = seniorUser.fullName || seniorUser.seniorFirstName || 'dear';
    const companionName = seniorUser.companionName || 'Joy';
    const age = seniorUser.seniorAge || 'unknown';

    const dateStr = today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const systemInstruction = `You are ${companionName}, a warm AI companion for ${seniorName}, who is ${age} years old. Generate a friendly morning check-in script. Include warm greeting, today's date, any messages from family, today's reminders, gentle prompts for mood (1-10), sleep quality, water intake. Under 150 words. Warm, unhurried, clear. No medical language.`;

    const prompt = `Today is ${dateStr}. ${moodText}. Reminders: ${reminderList}. Family messages: ${messageList}. Generate the morning check-in script now.`;

    const script = await generateContent(prompt, systemInstruction);

    return res.status(200).json({ script });
  } catch (error) {
    console.error('companion-checkin error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
