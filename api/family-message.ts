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

  // GET: Fetch family messages for a senior
  if (req.method === 'GET') {
    try {
      const seniorId = req.query.senior_id as string;

      if (!seniorId) {
        return res.status(400).json({ error: 'Missing query parameter: senior_id' });
      }

      const messages = await db
        .select({
          id: schema.familyMessages.id,
          fromUserId: schema.familyMessages.fromUserId,
          toSeniorId: schema.familyMessages.toSeniorId,
          messageText: schema.familyMessages.messageText,
          audioUrl: schema.familyMessages.audioUrl,
          playedAt: schema.familyMessages.playedAt,
          createdAt: schema.familyMessages.createdAt,
        })
        .from(schema.familyMessages)
        .where(eq(schema.familyMessages.toSeniorId, seniorId))
        .orderBy(desc(schema.familyMessages.createdAt));

      // Look up sender names
      const messagesWithSender = await Promise.all(
        messages.map(async (msg) => {
          const sender = await db
            .select({ fullName: schema.users.fullName })
            .from(schema.users)
            .where(eq(schema.users.id, msg.fromUserId))
            .limit(1);

          return {
            ...msg,
            fromName: sender[0]?.fullName || 'Family Member',
          };
        })
      );

      // Split into unplayed and played
      const unplayed = messagesWithSender.filter((m) => !m.playedAt);
      const played = messagesWithSender.filter((m) => m.playedAt);

      return res.status(200).json({ unplayed, played });
    } catch (error) {
      console.error('family-message GET error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // POST: Create a new family message
  if (req.method === 'POST') {
    try {
      const { to_senior_id, message_text, from_clerk_user_id } = req.body;

      if (!to_senior_id || !message_text) {
        return res.status(400).json({ error: 'Missing required fields: to_senior_id, message_text' });
      }

      // Look up sender by clerk user ID
      // In production, extract this from the verified JWT
      if (!from_clerk_user_id) {
        return res.status(400).json({ error: 'Missing required field: from_clerk_user_id' });
      }

      const sender = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.clerkUserId, from_clerk_user_id))
        .limit(1);

      if (!sender.length) {
        return res.status(404).json({ error: 'Sender not found' });
      }

      const senderUser = sender[0];

      // Verify sender is a caregiver linked to this senior
      if (senderUser.role !== 'caregiver' || senderUser.linkedSeniorId !== to_senior_id) {
        return res.status(403).json({ error: 'Forbidden: sender must be a caregiver linked to this senior' });
      }

      const [message] = await db
        .insert(schema.familyMessages)
        .values({
          fromUserId: senderUser.id,
          toSeniorId: to_senior_id,
          messageText: message_text,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message_id: message.id,
        created_at: message.createdAt,
      });
    } catch (error) {
      console.error('family-message POST error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // PATCH: Mark a message as played
  if (req.method === 'PATCH') {
    try {
      const messageId = req.query.id as string;

      if (!messageId) {
        return res.status(400).json({ error: 'Missing query parameter: id' });
      }

      const { from_clerk_user_id } = req.body;

      // Verify the requester is a linked caregiver or the senior themselves
      // For now, just verify the message exists and update it
      const existing = await db
        .select()
        .from(schema.familyMessages)
        .where(eq(schema.familyMessages.id, messageId))
        .limit(1);

      if (!existing.length) {
        return res.status(404).json({ error: 'Message not found' });
      }

      // If from_clerk_user_id is provided, verify they are linked
      if (from_clerk_user_id) {
        const requester = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.clerkUserId, from_clerk_user_id))
          .limit(1);

        if (requester.length) {
          const user = requester[0];
          const isLinkedCaregiver =
            user.role === 'caregiver' && user.linkedSeniorId === existing[0].toSeniorId;
          const isSenior = user.id === existing[0].toSeniorId;

          if (!isLinkedCaregiver && !isSenior) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        }
      }

      const [updated] = await db
        .update(schema.familyMessages)
        .set({ playedAt: new Date() })
        .where(eq(schema.familyMessages.id, messageId))
        .returning();

      return res.status(200).json({
        success: true,
        message_id: updated.id,
        played_at: updated.playedAt,
      });
    } catch (error) {
      console.error('family-message PATCH error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
