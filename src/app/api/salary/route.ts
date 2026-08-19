import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getSalaryInsights, type SalaryInput } from '@/services/matching';

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '';
    const location = searchParams.get('location') || '';
    const level = searchParams.get('level') || '';

    // Build where clause for SalaryData table
    const salaryWhere: Prisma.SalaryDataWhereInput = {};

    if (role) {
      salaryWhere.role = { contains: role };
    }
    if (location) {
      salaryWhere.location = { contains: location };
    }
    if (level) {
      salaryWhere.level = level;
    }

    // Fetch SalaryData records
    const salaryRecords = await db.salaryData.findMany({ where: salaryWhere });

    // Also fetch jobs with salary info for insights
    const jobWhere: Prisma.JobWhereInput = { isActive: true };
    if (role) {
      jobWhere.title = { contains: role };
    }
    if (level) {
      jobWhere.experienceLevel = level;
    }

    const jobsWithSalary = await db.job.findMany({
      where: jobWhere,
      select: {
        title: true,
        company: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        sourceType: true,
      },
    });

    // Prepare inputs for the matching service
    const salaryInputs: SalaryInput[] = jobsWithSalary
      .filter((j) => j.salaryMin != null && j.salaryMax != null)
      .map((j) => ({
        title: j.title,
        company: j.company,
        salaryMin: j.salaryMin!,
        salaryMax: j.salaryMax!,
        salaryType: j.salaryType || 'yearly',
        sourceType: j.sourceType,
      }));

    const insights = getSalaryInsights(salaryInputs);

    // Filter byRole if a role filter is provided
    let filteredByRole = insights.byRole;
    if (role) {
      const q = role.toLowerCase();
      filteredByRole = insights.byRole.filter((r) => r.role.includes(q));
    }

    // Build response
    return NextResponse.json({
      byRole: filteredByRole,
      bySourceType: insights.bySourceType,
      overallMin: insights.overallMin,
      overallMax: insights.overallMax,
      overallMedian: insights.overallMedian,
      totalSampleSize: insights.totalSampleSize,
    });
  } catch (error) {
    console.error('[API /salary] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch salary data', message, code: 'SALARY_FETCH_ERROR' },
      { status: 500 }
    );
  }
}