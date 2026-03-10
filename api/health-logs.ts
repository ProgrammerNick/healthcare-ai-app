import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { decrypt } from '../src/lib/encryption';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const seniorId = req.query.senior_id as string;
    const daysParam = req.query.days as string | undefined;
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (!seniorId) {
      return res.status(400).json({ error: 'Missing required query parameter: senior_id' });
    }

    const db = getDb();

    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await db
      .select()
      .from(schema.healthLogs)
      .where(
        and(
          eq(schema.healthLogs.seniorId, seniorId),
          gte(schema.healthLogs.recordedAt, since)
        )
      )
      .orderBy(desc(schema.healthLogs.recordedAt));

    // Decrypt values before returning
    const decryptedLogs = await Promise.all(
      logs.map(async (log) => {
        let decryptedValue: string;
        let decryptedNotes: string | null = null;

        try {
          decryptedValue = await decrypt(log.valueEncrypted);
        } catch {
          decryptedValue = '[decryption error]';
        }

        if (log.notesEncrypted) {
          try {
            decryptedNotes = await decrypt(log.notesEncrypted);
          } catch {
            decryptedNotes = '[decryption error]';
          }
        }

        return {
          id: log.id,
          seniorId: log.seniorId,
          logType: log.logType,
          value: decryptedValue,
          recordedAt: log.recordedAt,
          source: log.source,
          notes: decryptedNotes,
        };
      })
    );

    return res.status(200).json({ logs: decryptedLogs });
  } catch (error) {
    console.error('health-logs GET error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
