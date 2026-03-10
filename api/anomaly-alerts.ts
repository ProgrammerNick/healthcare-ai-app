import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, isNull, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const db = getDb();

  // GET: list unresolved alerts for a senior
  if (req.method === 'GET') {
    try {
      const seniorId = req.query.senior_id as string;

      if (!seniorId) {
        return res.status(400).json({ error: 'Missing required query parameter: senior_id' });
      }

      const includeResolved = req.query.include_resolved === 'true';
      const alertType = req.query.alert_type as string | undefined;

      let query = db
        .select()
        .from(schema.anomalyAlerts)
        .where(
          and(
            eq(schema.anomalyAlerts.seniorId, seniorId),
            ...(!includeResolved ? [isNull(schema.anomalyAlerts.resolvedAt)] : []),
            ...(alertType
              ? [eq(schema.anomalyAlerts.alertType, alertType as typeof schema.alertTypeEnum.enumValues[number])]
              : [])
          )
        )
        .orderBy(desc(schema.anomalyAlerts.createdAt));

      const alerts = await query;

      return res.status(200).json({ alerts });
    } catch (error) {
      console.error('anomaly-alerts GET error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PATCH: mark alert as resolved
  if (req.method === 'PATCH') {
    try {
      const alertId = req.query.id as string;

      if (!alertId) {
        return res.status(400).json({ error: 'Missing query parameter: id' });
      }

      const existing = await db
        .select()
        .from(schema.anomalyAlerts)
        .where(eq(schema.anomalyAlerts.id, alertId))
        .limit(1);

      if (!existing.length) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      const [updated] = await db
        .update(schema.anomalyAlerts)
        .set({ resolvedAt: new Date() })
        .where(eq(schema.anomalyAlerts.id, alertId))
        .returning();

      return res.status(200).json({
        success: true,
        alert: updated,
      });
    } catch (error) {
      console.error('anomaly-alerts PATCH error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
