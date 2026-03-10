import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
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

  // GET: list reminders for a senior
  if (req.method === 'GET') {
    try {
      const seniorId = req.query.senior_id as string;

      if (!seniorId) {
        return res.status(400).json({ error: 'Missing required query parameter: senior_id' });
      }

      const reminders = await db
        .select()
        .from(schema.reminders)
        .where(eq(schema.reminders.seniorId, seniorId));

      return res.status(200).json({
        reminders: reminders.map((r) => ({
          id: r.id,
          seniorId: r.seniorId,
          reminderType: r.reminderType,
          title: r.title,
          recurrence: r.recurrence,
          isActive: r.isActive,
          lastTriggeredAt: r.lastTriggeredAt,
        })),
      });
    } catch (error) {
      console.error('reminders GET error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST: create a new reminder
  if (req.method === 'POST') {
    try {
      const { senior_id, reminder_type, title, recurrence } = req.body;

      if (!senior_id || !reminder_type || !title) {
        return res.status(400).json({ error: 'Missing required fields: senior_id, reminder_type, title' });
      }

      const [reminder] = await db
        .insert(schema.reminders)
        .values({
          seniorId: senior_id,
          reminderType: reminder_type,
          title,
          recurrence: recurrence || null,
          isActive: true,
        })
        .returning();

      return res.status(201).json({ success: true, reminder });
    } catch (error) {
      console.error('reminders POST error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PATCH: update a reminder
  if (req.method === 'PATCH') {
    try {
      const reminderId = req.query.id as string;

      if (!reminderId) {
        return res.status(400).json({ error: 'Missing query parameter: id' });
      }

      const existing = await db
        .select()
        .from(schema.reminders)
        .where(eq(schema.reminders.id, reminderId))
        .limit(1);

      if (!existing.length) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      const updates: Record<string, unknown> = {};
      if (req.body.title !== undefined) updates.title = req.body.title;
      if (req.body.reminder_type !== undefined) updates.reminderType = req.body.reminder_type;
      if (req.body.recurrence !== undefined) updates.recurrence = req.body.recurrence;
      if (req.body.is_active !== undefined) updates.isActive = req.body.is_active;

      const [updated] = await db
        .update(schema.reminders)
        .set(updates)
        .where(eq(schema.reminders.id, reminderId))
        .returning();

      return res.status(200).json({ success: true, reminder: updated });
    } catch (error) {
      console.error('reminders PATCH error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // DELETE: delete a reminder
  if (req.method === 'DELETE') {
    try {
      const reminderId = req.query.id as string;

      if (!reminderId) {
        return res.status(400).json({ error: 'Missing query parameter: id' });
      }

      const existing = await db
        .select()
        .from(schema.reminders)
        .where(eq(schema.reminders.id, reminderId))
        .limit(1);

      if (!existing.length) {
        return res.status(404).json({ error: 'Reminder not found' });
      }

      await db
        .delete(schema.reminders)
        .where(eq(schema.reminders.id, reminderId));

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('reminders DELETE error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
