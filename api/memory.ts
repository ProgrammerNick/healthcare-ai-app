import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../drizzle/schema';
import { generateJSON } from '../src/lib/gemini';

function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

interface MemorySummaryResult {
  summary: string;
  tags: string[];
}

const SYSTEM_PROMPT = `Summarize this personal memory in 1-2 warm sentences. Extract 2-3 topic tags. Return JSON: { summary: string, tags: string[] }`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET: Fetch memories for a senior
  if (req.method === 'GET') {
    try {
      const seniorId = req.query.senior_id as string;

      if (!seniorId) {
        return res.status(400).json({ error: 'Missing query parameter: senior_id' });
      }

      const db = getDb();

      const memories = await db
        .select()
        .from(schema.memories)
        .where(eq(schema.memories.seniorId, seniorId))
        .orderBy(desc(schema.memories.createdAt));

      return res.status(200).json({
        memories: memories.map((m) => ({
          id: m.id,
          seniorId: m.seniorId,
          promptUsed: m.promptUsed,
          transcript: m.transcript,
          summary: m.summary,
          tags: m.tags,
          createdAt: m.createdAt,
        })),
      });
    } catch (error) {
      console.error('memory GET error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { senior_id, transcript, prompt_used } = req.body;

    if (!senior_id || !transcript) {
      return res.status(400).json({ error: 'Missing required fields: senior_id, transcript' });
    }

    // Generate summary and tags via Gemini
    const result = await generateJSON<MemorySummaryResult>(transcript, SYSTEM_PROMPT);

    const db = getDb();

    const [memory] = await db
      .insert(schema.memories)
      .values({
        seniorId: senior_id,
        transcript,
        promptUsed: prompt_used || null,
        summary: result.summary,
        tags: result.tags,
      })
      .returning();

    return res.status(201).json({
      memory_id: memory.id,
      summary: result.summary,
      tags: result.tags,
    });
  } catch (error) {
    console.error('memory error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
