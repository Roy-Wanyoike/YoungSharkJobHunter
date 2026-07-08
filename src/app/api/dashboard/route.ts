import { NextResponse } from 'next/server';
import { MOCK_DASHBOARD_STATS, DAILY_APPLICATION_DATA, MATCH_DISTRIBUTION, SOURCE_DISTRIBUTION, MOCK_APPLICATIONS } from '@/lib/mock-data';

export async function GET() {
  const statusBreakdown = {
    draft: MOCK_APPLICATIONS.filter(a => a.status === 'draft').length,
    submitted: MOCK_APPLICATIONS.filter(a => a.status === 'submitted').length,
    reviewing: MOCK_APPLICATIONS.filter(a => a.status === 'reviewing').length,
    interview: MOCK_APPLICATIONS.filter(a => a.status === 'interview').length,
    assessment: MOCK_APPLICATIONS.filter(a => a.status === 'assessment').length,
    offer: MOCK_APPLICATIONS.filter(a => a.status === 'offer').length,
    rejected: MOCK_APPLICATIONS.filter(a => a.status === 'rejected').length,
    ghosted: MOCK_APPLICATIONS.filter(a => a.status === 'ghosted').length,
  };

  return NextResponse.json({
    stats: MOCK_DASHBOARD_STATS,
    dailyApplications: DAILY_APPLICATION_DATA,
    matchDistribution: MATCH_DISTRIBUTION,
    sourceDistribution: SOURCE_DISTRIBUTION,
    statusBreakdown,
  });
}