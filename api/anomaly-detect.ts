import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { decrypt } from '../src/lib/encryption';
import { sendCaregiverDigest } from '../src/lib/resend';

function getDb() {
  const sqlClient = neon(process.env.DATABASE_URL!);
  return drizzle(sqlClient, { schema });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret if set (Vercel Cron sends this header)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getDb();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all seniors
    const seniors = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, 'senior'));

    const allAlerts: { seniorId: string; seniorName: string; alerts: string[] }[] = [];

    for (const senior of seniors) {
      const seniorAlerts: string[] = [];
      const seniorName = senior.fullName || senior.seniorFirstName || 'Unknown';

      // --- Check 1: Conversation length anomaly ---
      // Get today's conversations
      const todayConversations = await db
        .select()
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.seniorId, senior.id),
            gte(schema.conversations.createdAt, todayStart)
          )
        );

      const todayTotalWords = todayConversations.reduce((sum, c) => sum + (c.wordCount || 0), 0);

      // Get 30-day average
      const pastConversations = await db
        .select({
          totalWords: sql<number>`COALESCE(SUM(${schema.conversations.wordCount}), 0)`,
          dayCount: sql<number>`COUNT(DISTINCT DATE(${schema.conversations.createdAt}))`,
        })
        .from(schema.conversations)
        .where(
          and(
            eq(schema.conversations.seniorId, senior.id),
            gte(schema.conversations.createdAt, thirtyDaysAgo),
            lte(schema.conversations.createdAt, todayStart)
          )
        );

      const avgDailyWords =
        pastConversations[0]?.dayCount > 0
          ? pastConversations[0].totalWords / pastConversations[0].dayCount
          : 0;

      if (avgDailyWords > 0 && todayTotalWords < avgDailyWords * 0.4) {
        const alert = `Conversation length today (${todayTotalWords} words) is below 40% of 30-day average (${Math.round(avgDailyWords)} words)`;
        seniorAlerts.push(alert);

        await db.insert(schema.anomalyAlerts).values({
          seniorId: senior.id,
          alertType: 'conversation_length',
          description: alert,
          baselineValue: String(Math.round(avgDailyWords)),
          observedValue: String(todayTotalWords),
        });
      }

      // --- Check 2: Missed check-in ---
      const seniorTimezone = senior.timezone || 'America/New_York';
      const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: seniorTimezone }));
      const currentHour = nowInTz.getHours();

      if (currentHour >= 11) {
        // Check if there's been any morning check-in conversation today
        const morningCheckins = await db
          .select()
          .from(schema.healthLogs)
          .where(
            and(
              eq(schema.healthLogs.seniorId, senior.id),
              eq(schema.healthLogs.source, 'morning_checkin'),
              gte(schema.healthLogs.recordedAt, todayStart)
            )
          )
          .limit(1);

        if (!morningCheckins.length) {
          const alert = `No morning check-in recorded by 11 AM (${seniorTimezone})`;
          seniorAlerts.push(alert);

          await db.insert(schema.anomalyAlerts).values({
            seniorId: senior.id,
            alertType: 'missed_checkin',
            description: alert,
          });
        }
      }

      // --- Check 3: Isolation (social_contact_count = 0 for 3+ consecutive days) ---
      const threeDaysAgo = new Date(todayStart.getTime() - 3 * 24 * 60 * 60 * 1000);

      const socialLogs = await db
        .select()
        .from(schema.healthLogs)
        .where(
          and(
            eq(schema.healthLogs.seniorId, senior.id),
            eq(schema.healthLogs.logType, 'social_contact_count'),
            gte(schema.healthLogs.recordedAt, threeDaysAgo)
          )
        )
        .orderBy(desc(schema.healthLogs.recordedAt));

      if (socialLogs.length > 0) {
        let allZero = true;
        for (const log of socialLogs) {
          const value = await decrypt(log.valueEncrypted);
          if (Number(value) > 0) {
            allZero = false;
            break;
          }
        }

        // Check we have data spanning 3 days
        if (allZero && socialLogs.length >= 3) {
          const alert = 'Social contact count has been 0 for 3+ consecutive days';
          seniorAlerts.push(alert);

          await db.insert(schema.anomalyAlerts).values({
            seniorId: senior.id,
            alertType: 'isolation',
            description: alert,
            observedValue: '0',
          });
        }
      }

      if (seniorAlerts.length > 0) {
        allAlerts.push({
          seniorId: senior.id,
          seniorName,
          alerts: seniorAlerts,
        });
      }
    }

    // Send digest emails to linked caregivers
    for (const seniorAlert of allAlerts) {
      const caregivers = await db
        .select()
        .from(schema.users)
        .where(
          and(
            eq(schema.users.role, 'caregiver'),
            eq(schema.users.linkedSeniorId, seniorAlert.seniorId)
          )
        );

      for (const caregiver of caregivers) {
        try {
          // In production, look up caregiver email from Clerk
          await sendCaregiverDigest(
            `caregiver-${caregiver.id}@goldencare.app`, // placeholder - replace with actual email from Clerk
            seniorAlert.seniorName,
            `${seniorAlert.alerts.length} anomaly alert(s) detected for ${seniorAlert.seniorName}.`,
            seniorAlert.alerts
          );
        } catch (emailError) {
          console.error('Failed to send caregiver digest:', emailError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      seniors_checked: seniors.length,
      alerts_generated: allAlerts.reduce((sum, a) => sum + a.alerts.length, 0),
    });
  } catch (error) {
    console.error('anomaly-detect error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
