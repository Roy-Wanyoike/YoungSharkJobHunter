import { NextResponse } from 'next/server';
import { MOCK_RESUME } from '@/lib/mock-data';

export async function GET() {
  return NextResponse.json({ resume: MOCK_RESUME });
}