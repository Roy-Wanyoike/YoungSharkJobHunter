import { NextResponse } from 'next/server';
import { MOCK_APPLICATIONS } from '@/lib/mock-data';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';

  let filtered = [...MOCK_APPLICATIONS];
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.status === status);
  }

  return NextResponse.json({ applications: filtered, total: filtered.length });
}