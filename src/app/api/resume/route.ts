import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

function safeParseJson<T>(jsonStr: string | null | undefined, fallback: T): T {
  if (!jsonStr) return fallback;
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return fallback;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Try to find the primary resume first, fallback to the first resume
    let resume = await db.resume.findFirst({
      where: { isPrimary: true },
    });

    if (!resume) {
      resume = await db.resume.findFirst();
    }

    if (!resume) {
      return NextResponse.json({ data: null });
    }

    const parsedData = safeParseJson(resume.parsedData, {});
    const skills = safeParseJson<string[]>(resume.skills, []);
    const experience = safeParseJson<unknown[]>(resume.experience, []);
    const education = safeParseJson<unknown[]>(resume.education, []);
    const projects = safeParseJson<unknown[]>(resume.projects, []);
    const certifications = safeParseJson<string[]>(resume.certifications, []);
    const languages = safeParseJson<string[]>(resume.languages, []);

    return NextResponse.json({
      data: {
        id: resume.id,
        userId: resume.userId,
        fileName: resume.fileName,
        fileType: resume.fileType,
        isPrimary: resume.isPrimary,
        parsedData,
        skills,
        experience,
        education,
        projects,
        certifications,
        languages,
        hasFileData: !!resume.fileData,
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[API /resume] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch resume', message, code: 'RESUME_FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          error: 'No file uploaded',
          message: 'A file is required in the "file" form field',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Get the first user (single-user app)
    const user = await db.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json(
        { error: 'No user found', message: 'Please create a user account first', code: 'NO_USER' },
        { status: 400 }
      );
    }

    // Read file as base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileData = buffer.toString('base64');

    // Determine file type from extension or MIME
    const fileName = file.name || 'uploaded_resume.pdf';
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf';
    const fileType = ext === 'docx' ? 'docx' : 'pdf';

    // Check if there's already a primary resume and demote it
    const existingPrimary = await db.resume.findFirst({
      where: { userId: user.id, isPrimary: true },
    });

    const isPrimary = !existingPrimary;

    // If the new resume is primary and an existing primary exists, demote it
    if (existingPrimary) {
      await db.resume.update({
        where: { id: existingPrimary.id },
        data: { isPrimary: false },
      });
    }

    // Create resume with basic parsed data
    const emptyParsedData = {
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      website: '',
      summary: '',
      experience: [],
      education: [],
      projects: [],
      certifications: [],
      languages: [],
      skills: [],
    };

    const resume = await db.resume.create({
      data: {
        userId: user.id,
        fileName,
        fileData,
        fileType,
        isPrimary,
        parsedData: JSON.stringify(emptyParsedData),
        skills: JSON.stringify([]),
        experience: JSON.stringify([]),
        education: JSON.stringify([]),
        projects: JSON.stringify([]),
        certifications: JSON.stringify([]),
        languages: JSON.stringify([]),
      },
    });

    return NextResponse.json(
      {
        data: {
          id: resume.id,
          userId: resume.userId,
          fileName: resume.fileName,
          fileType: resume.fileType,
          isPrimary: resume.isPrimary,
          parsedData: emptyParsedData,
          skills: [],
          experience: [],
          education: [],
          projects: [],
          certifications: [],
          languages: [],
          hasFileData: true,
          createdAt: resume.createdAt.toISOString(),
          updatedAt: resume.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API /resume] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload resume', message, code: 'RESUME_UPLOAD_ERROR' },
      { status: 500 }
    );
  }
}