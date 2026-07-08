import { NextResponse } from 'next/server';
import { triggerScraping } from '@/services/discovery';

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceIds, aiOnly } = body as {
      sourceIds?: string[];
      aiOnly?: boolean;
    };

    let finalSourceIds = sourceIds;

    // If aiOnly is true, filter source IDs to only ai_training type sources
    if (aiOnly) {
      const { db } = await import('@/lib/db');
      if (finalSourceIds && finalSourceIds.length > 0) {
        const aiSources = await db.jobSource.findMany({
          where: {
            id: { in: finalSourceIds },
            type: 'ai_training',
          },
          select: { id: true },
        });
        finalSourceIds = aiSources.map((s) => s.id);
      } else {
        // No specific IDs given — fetch all ai_training sources
        const aiSources = await db.jobSource.findMany({
          where: { type: 'ai_training' },
          select: { id: true },
        });
        finalSourceIds = aiSources.map((s) => s.id);
      }
    }

    const results = await triggerScraping(finalSourceIds);

    const totalJobsFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
    const totalJobsNew = results.reduce((sum, r) => sum + r.jobsNew, 0);

    return NextResponse.json({
      data: {
        status: 'completed',
        sourcesScraped: results.length,
        totalJobsFound,
        totalJobsNew,
        results,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[API /scrape] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Scraping failed', message, code: 'SCRAPE_ERROR' },
      { status: 500 }
    );
  }
}