import { NextResponse } from 'next/server';
import { JOB_SOURCES } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ sources: JOB_SOURCES });
}