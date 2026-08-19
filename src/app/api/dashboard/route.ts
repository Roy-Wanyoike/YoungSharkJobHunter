import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getScrapingHealth } from '@/services/discovery';

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── Core Stats ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalJobsFound,
      jobsToday,
      totalApplications,
      applicationsToday,
      interviews,
      offers,
      rejected,
      ghosted,
      savedJobs,
      allJobsForAvg,
      allApplicationsForRate,
    ] = await Promise.all([
      db.job.count({ where: { isActive: true } }),
      db.job.count({
        where: { isActive: true, createdAt: { gte: todayStart } },
      }),
      db.application.count(),
      db.application.count({ where: { createdAt: { gte: todayStart } } }),
      db.application.count({ where: { status: 'interview' } }),
      db.application.count({ where: { status: 'offer' } }),
      db.application.count({ where: { status: 'rejected' } }),
      db.application.count({ where: { status: 'ghosted' } }),
      db.job.count({ where: { isSaved: true } }),
      // For avgMatchScore: aggregate from jobs that have a matchScore
      db.job.aggregate({
        where: { isActive: true, matchScore: { not: null } },
        _avg: { matchScore: true },
        _count: true,
      }),
      // For responseRate: count non-draft applications
      db.application.count({ where: { status: { not: 'draft' } } }),
    ]);

    const avgMatchScore =
      allJobsForAvg._count > 0
        ? Math.round((allJobsForAvg._avg.matchScore ?? 0) * 10) / 10
        : 0;

    const responseRate =
      totalApplications > 0
        ? Math.round((allApplicationsForRate / totalApplications) * 1000) / 10
        : 0;

    const stats = {
      totalJobsFound,
      jobsToday,
      totalApplications,
      applicationsToday,
      interviews,
      offers,
      rejected,
      ghosted,
      avgMatchScore,
      responseRate,
      savedJobs,
    };

    // ── Daily Applications (last 14 days) ──
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const recentApps = await db.application.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    });

    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = 0;
    }

    for (const app of recentApps) {
      const key = app.createdAt.toISOString().slice(0, 10);
      if (key in dailyMap) {
        dailyMap[key]++;
      }
    }

    const dailyApplications = Object.entries(dailyMap).map(([date, count]) => ({
      date,
      count,
    }));

    // ── Match Distribution ──
    const jobsWithScore = await db.job.findMany({
      where: { isActive: true, matchScore: { not: null } },
      select: { matchScore: true },
    });

    const matchRanges = [
      { range: '0-20', min: 0, max: 20 },
      { range: '20-40', min: 20, max: 40 },
      { range: '40-60', min: 40, max: 60 },
      { range: '60-80', min: 60, max: 80 },
      { range: '80-100', min: 80, max: 100 },
    ];

    const matchDistribution = matchRanges.map(({ range, min, max }) => {
      const count = jobsWithScore.filter(
        (j) => j.matchScore! >= min && j.matchScore! < (range === '80-100' ? 101 : max)
      ).length;
      return { range, count };
    });

    // ── Source Distribution ──
    const sourceGroups = await db.job.groupBy({
      by: ['sourceType'],
      where: { isActive: true },
      _count: { sourceType: true },
    });

    const sourceDistribution = sourceGroups.map((g) => ({
      sourceType: g.sourceType,
      count: g._count.sourceType,
    }));

    // ── Status Breakdown ──
    const statusGroups = await db.application.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const statusBreakdown: Record<string, number> = {
      draft: 0,
      submitted: 0,
      reviewing: 0,
      interview: 0,
      assessment: 0,
      offer: 0,
      rejected: 0,
      ghosted: 0,
    };

    for (const g of statusGroups) {
      if (g.status in statusBreakdown) {
        statusBreakdown[g.status] = g._count.status;
      }
    }

    // ── Scraping Health ──
    const scrapingHealth = await getScrapingHealth();

    // ── Recent Notifications (latest 5 unread) ──
    const user = await db.user.findFirst({ select: { id: true } });
    let recentNotifications: Array<{
      id: string;
      userId: string;
      type: string;
      title: string;
      message: string;
      isRead: boolean;
      link: string | null;
      createdAt: Date;
    }> = [];
    if (user) {
      recentNotifications = await db.notification.findMany({
        where: { userId: user.id, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    }

    const notifications = recentNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      isRead: n.isRead,
      link: n.link,
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({
      stats,
      dailyApplications,
      matchDistribution,
      sourceDistribution,
      statusBreakdown,
      scrapingHealth,
      recentNotifications: notifications,
    });
  } catch (error) {
    console.error('[API /dashboard] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', message, code: 'DASHBOARD_FETCH_ERROR' },
      { status: 500 }
    );
  }
}