import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { generateContent } from '../src/lib/gemini';
import { sendOnboardingNotification } from '../src/lib/resend';

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
    const { senior_id, transcript, companion_name } = req.body;

    if (!senior_id || !transcript || !companion_name) {
      return res.status(400).json({
        error: 'Missing required fields: senior_id, transcript, companion_name',
      });
    }

    const db = getDb();

    // Fetch senior
    const senior = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, senior_id))
      .limit(1);

    if (!senior.length) {
      return res.status(404).json({ error: 'Senior not found' });
    }

    const seniorUser = senior[0];
    const seniorName = seniorUser.fullName || seniorUser.seniorFirstName || 'your loved one';

    // Generate 2-sentence summary via Gemini
    const summary = await generateContent(
      `Summarize this onboarding conversation in exactly 2 warm, friendly sentences:\n\n${transcript}`,
      `You are summarizing a first conversation between an elderly person named ${seniorName} and their AI companion named ${companion_name}. Keep it warm and positive.`
    );

    // Mark senior's onboarding as complete
    await db
      .update(schema.users)
      .set({
        onboardingCompleted: true,
        companionName: companion_name,
      })
      .where(eq(schema.users.id, senior_id));

    // Find linked caregivers and send notification
    const caregivers = await db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.role, 'caregiver'),
          eq(schema.users.linkedSeniorId, senior_id)
        )
      );

    for (const caregiver of caregivers) {
      try {
        // In production, look up caregiver email from Clerk
        await sendOnboardingNotification(
          `caregiver-${caregiver.id}@goldencare.app`, // placeholder - replace with actual email from Clerk
          seniorName,
          companion_name,
          summary
        );
      } catch (emailError) {
        console.error('Failed to send onboarding notification:', emailError);
      }
    }

    // Store the onboarding conversation
    await db.insert(schema.conversations).values({
      seniorId: senior_id,
      transcript,
      createdAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('onboarding-complete error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
