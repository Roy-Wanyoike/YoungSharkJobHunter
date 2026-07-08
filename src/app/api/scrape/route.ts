import { NextResponse } from 'next/server';
import { JOB_SOURCES } from '@/lib/mock-data';

export async function POST(request: Request) {
  const { sourceIds } = await request.json();
  const sourcesToScrape = sourceIds
    ? JOB_SOURCES.filter(s => sourceIds.includes(s.id))
    : JOB_SOURCES.filter(s => s.isActive);

  // Simulate scraping progress
  const results = sourcesToScrape.map(source => ({
    source: source.name,
    sourceId: source.id,
    status: 'completed' as const,
    jobsFound: Math.floor(Math.random() * 20) + 5,
    jobsNew: Math.floor(Math.random() * 10) + 1,
  }));

  const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
  const totalNew = results.reduce((sum, r) => sum + r.jobsNew, 0);

  return NextResponse.json({
    status: 'completed',
    sourcesScraped: results.length,
    totalJobsFound: totalFound,
    totalJobsNew: totalNew,
    results,
    completedAt: new Date().toISOString(),
  });
}