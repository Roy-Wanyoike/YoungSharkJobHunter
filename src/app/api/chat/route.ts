import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, type ChatContext } from '@/services/chat';

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history } = body as {
      message?: string;
      history?: Array<{ role: string; content: string }>;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'A non-empty message is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Build context from database
    const context: ChatContext = {};

    // 1. Resume skills
    const user = await db.user.findFirst({ select: { id: true } });
    if (user) {
      let resume = await db.resume.findFirst({
        where: { userId: user.id, isPrimary: true },
      });
      if (!resume) {
        resume = await db.resume.findFirst({ where: { userId: user.id } });
      }

      if (resume) {
        const skills: string[] = safeParseJson(resume.skills, []);
        context.resumeSkills = skills;
      }

      // 2. Application stats
      const [total, submitted, interviewing, offers, rejected] = await Promise.all([
        db.application.count({ where: { userId: user.id } }),
        db.application.count({ where: { userId: user.id, status: 'submitted' } }),
        db.application.count({ where: { userId: user.id, status: 'interview' } }),
        db.application.count({ where: { userId: user.id, status: 'offer' } }),
        db.application.count({ where: { userId: user.id, status: 'rejected' } }),
      ]);

      context.applicationStats = {
        total,
        submitted,
        interviewing,
        offers,
        rejected,
      };
    }

    // 3. Recent scraping info
    const latestLogs = await db.scrapingLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { jobsFound: true, source: true, createdAt: true },
    });

    if (latestLogs.length > 0) {
      const totalJobsFound = latestLogs.reduce((sum, l) => sum + l.jobsFound, 0);
      const uniqueSources = new Set(latestLogs.map((l) => l.source)).size;
      context.scrapingInfo = {
        totalJobsFound,
        sourcesScraped: uniqueSources,
      };
    }

    const response = await chat(
      message,
      (history || []) as Array<{ role: string; content: string }>,
      context
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error('[API /chat] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Chat failed', message, code: 'CHAT_ERROR' },
      { status: 500 }
    );
  }
}