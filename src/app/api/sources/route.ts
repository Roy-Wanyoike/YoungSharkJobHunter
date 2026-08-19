import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SourceResponse {
  id: string;
  name: string;
  type: string;
  website: string;
  logoUrl: string | null;
  isActive: boolean;
  lastScraped: string | null;
  jobsCount: number;
  healthStatus: string;
  avgResponseMs: number | null;
  errorRate: number;
  connectorName: string | null;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const sources = await db.jobSource.findMany({
      orderBy: { name: 'asc' },
    });

    const mapped: SourceResponse[] = sources.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      website: s.website,
      logoUrl: s.logoUrl,
      isActive: s.isActive,
      lastScraped: s.lastScraped?.toISOString() ?? null,
      jobsCount: s.jobsCount,
      healthStatus: s.healthStatus,
      avgResponseMs: s.avgResponseMs,
      errorRate: s.errorRate,
      connectorName: s.connectorName,
    }));

    // Group by type for convenience
    const grouped: Record<string, SourceResponse[]> = {};
    for (const source of mapped) {
      const type = source.type || 'other';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(source);
    }

    return NextResponse.json({
      sources: mapped,
      groupedByType: grouped,
    });
  } catch (error) {
    console.error('[API /sources] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch sources', message, code: 'SOURCES_FETCH_ERROR' },
      { status: 500 }
    );
  }
}