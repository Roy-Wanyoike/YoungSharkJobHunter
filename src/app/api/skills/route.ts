import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    const where: Prisma.SkillWhereInput = {};

    if (search) {
      where.name = { contains: search };
    }

    if (category) {
      where.category = category;
    }

    const skills = await db.skill.findMany({
      where,
      orderBy: { demandScore: 'desc' },
    });

    return NextResponse.json({
      skills: skills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        demandScore: s.demandScore,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('[API /skills] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch skills', message, code: 'SKILLS_FETCH_ERROR' },
      { status: 500 }
    );
  }
}