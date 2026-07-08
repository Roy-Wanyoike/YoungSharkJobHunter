import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────────────────────

interface JobFilters {
  search: string;
  sourceType: string;
  remote: string | null;
  minSalary: string | null;
  maxSalary: string | null;
  minMatch: string | null;
  experience: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  limit: number;
}

interface JobResponseItem {
  id: string;
  title: string;
  company: string;
  companyId: string | null;
  source: string;
  sourceId: string | null;
  sourceType: string;
  sourceUrl: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryType: string | null;
  description: string;
  requirements: string | null;
  skills: string[];
  experienceLevel: string | null;
  jobType: string | null;
  postedAt: string | null;
  expiresAt: string | null;
  matchScore: number | null;
  isActive: boolean;
  isApplied: boolean;
  isSaved: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseFilters(searchParams: URLSearchParams): JobFilters {
  return {
    search: searchParams.get('search') || '',
    sourceType: searchParams.get('sourceType') || '',
    remote: searchParams.get('remote'),
    minSalary: searchParams.get('minSalary'),
    maxSalary: searchParams.get('maxSalary'),
    minMatch: searchParams.get('minMatch'),
    experience: searchParams.get('experience') || '',
    sortBy: searchParams.get('sortBy') || 'matchScore',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
    limit: Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20)),
  };
}

function buildWhereClause(filters: JobFilters): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = { isActive: true };

  if (filters.search) {
    const q = filters.search.toLowerCase();
    // We need to search across title, company, and skills (JSON).
    // For title and company we can use Prisma contains.
    // For skills, we do a post-filter below since it's a JSON string.
    where.OR = [
      { title: { contains: q } },
      { company: { contains: q } },
    ];
  }

  if (filters.sourceType) {
    const types = filters.sourceType.split(',').filter(Boolean);
    if (types.length > 0) {
      where.sourceType = { in: types };
    }
  }

  if (filters.remote === 'true') {
    where.remote = true;
  }

  if (filters.minSalary) {
    const min = parseFloat(filters.minSalary);
    if (!isNaN(min)) {
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { salaryMax: { gte: min } },
      ];
    }
  }

  if (filters.maxSalary) {
    const max = parseFloat(filters.maxSalary);
    if (!isNaN(max)) {
      where.salaryMin = { lte: max };
    }
  }

  if (filters.experience) {
    const levels = filters.experience.split(',').filter(Boolean);
    if (levels.length > 0) {
      where.experienceLevel = { in: levels };
    }
  }

  return where;
}

function sortJobs(jobs: JobResponseItem[], sortBy: string, sortOrder: string): JobResponseItem[] {
  const sorted = [...jobs];
  const dir = sortOrder === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortBy) {
      case 'salary':
        aVal = a.salaryMax ?? 0;
        bVal = b.salaryMax ?? 0;
        break;
      case 'date':
        aVal = a.postedAt ? new Date(a.postedAt).getTime() : new Date(a.createdAt).getTime();
        bVal = b.postedAt ? new Date(b.postedAt).getTime() : new Date(b.createdAt).getTime();
        break;
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'company':
        return dir * a.company.localeCompare(b.company);
      case 'matchScore':
      default:
        aVal = a.matchScore ?? 0;
        bVal = b.matchScore ?? 0;
        break;
    }

    return dir * (aVal - bVal);
  });

  return sorted;
}

function toResponseItem(job: {
  id: string;
  title: string;
  company: string;
  companyId: string | null;
  source: string;
  sourceId: string | null;
  sourceType: string;
  sourceUrl: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryType: string | null;
  description: string;
  requirements: string | null;
  skills: string;
  experienceLevel: string | null;
  jobType: string | null;
  postedAt: Date | null;
  expiresAt: Date | null;
  matchScore: number | null;
  isActive: boolean;
  isApplied: boolean;
  isSaved: boolean;
  createdAt: Date;
  updatedAt: Date;
}): JobResponseItem {
  let parsedSkills: string[] = [];
  try {
    const raw = JSON.parse(job.skills);
    if (Array.isArray(raw)) {
      parsedSkills = raw.map((s: unknown) => String(s));
    }
  } catch {
    parsedSkills = [];
  }

  return {
    ...job,
    skills: parsedSkills,
    postedAt: job.postedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = parseFilters(searchParams);
    const where = buildWhereClause(filters);

    // Fetch all matching jobs (pagination is done in-memory after sorting)
    const jobs = await db.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse skills for every job
    let processed = jobs.map(toResponseItem);

    // Filter by search query in skills (JSON field) since Prisma can't do JSON contains in SQLite easily
    if (filters.search) {
      const q = filters.search.toLowerCase();
      processed = processed.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Filter by minMatch
    if (filters.minMatch) {
      const min = parseFloat(filters.minMatch);
      if (!isNaN(min)) {
        processed = processed.filter((j) => (j.matchScore ?? 0) >= min);
      }
    }

    // Sort in-memory
    processed = sortJobs(processed, filters.sortBy, filters.sortOrder);

    // Paginate
    const total = processed.length;
    const start = (filters.page - 1) * filters.limit;
    const paginated = processed.slice(start, start + filters.limit);

    return NextResponse.json({
      data: paginated,
      meta: { page: filters.page, limit: filters.limit, total },
    });
  } catch (error) {
    console.error('[API /jobs] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch jobs', message, code: 'JOBS_FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { jobId, isSaved } = body as { jobId?: string; isSaved?: boolean };

    if (!jobId || typeof isSaved !== 'boolean') {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'jobId (string) and isSaved (boolean) are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const updated = await db.job.update({
      where: { id: jobId },
      data: { isSaved },
    });

    const item = toResponseItem(updated);
    return NextResponse.json({ data: item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Job not found', message: `No job with id provided`, code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    console.error('[API /jobs] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update job', message, code: 'JOB_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}