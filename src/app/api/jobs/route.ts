import { NextResponse } from 'next/server';
import { MOCK_JOBS, JOB_SOURCES } from '@/lib/mock-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const sourceType = searchParams.get('sourceType') || '';
  const remote = searchParams.get('remote');
  const minSalary = searchParams.get('minSalary');
  const maxSalary = searchParams.get('maxSalary');
  const minMatch = searchParams.get('minMatch');
  const experience = searchParams.get('experience') || '';
  const sortBy = searchParams.get('sortBy') || 'matchScore';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  let filtered = [...MOCK_JOBS];

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.skills.some(s => s.toLowerCase().includes(q)) ||
      j.description.toLowerCase().includes(q)
    );
  }

  if (sourceType) {
    const types = sourceType.split(',');
    filtered = filtered.filter(j => types.includes(j.sourceType));
  }

  if (remote === 'true') {
    filtered = filtered.filter(j => j.remote);
  }

  if (minSalary) {
    filtered = filtered.filter(j => (j.salaryMax || 0) >= parseFloat(minSalary));
  }

  if (maxSalary) {
    filtered = filtered.filter(j => (j.salaryMin || 0) <= parseFloat(maxSalary));
  }

  if (minMatch) {
    filtered = filtered.filter(j => (j.matchScore || 0) >= parseFloat(minMatch));
  }

  if (experience) {
    const levels = experience.split(',');
    filtered = filtered.filter(j => j.experienceLevel && levels.includes(j.experienceLevel));
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortBy) {
      case 'matchScore': aVal = a.matchScore || 0; bVal = b.matchScore || 0; break;
      case 'salary': aVal = a.salaryMax || 0; bVal = b.salaryMax || 0; break;
      case 'date': aVal = new Date(a.postedAt || 0).getTime(); bVal = new Date(b.postedAt || 0).getTime(); break;
      default: aVal = a.matchScore || 0; bVal = b.matchScore || 0;
    }
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({ jobs: paginated, total, page, limit });
}