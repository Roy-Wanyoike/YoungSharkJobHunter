import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Try ResumeVersion first (generated tailored resumes)
    const version = await db.resumeVersion.findUnique({
      where: { id },
      include: { resume: true },
    });

    if (version?.fileData) {
      const contentType = version.fileType === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      return new NextResponse(Buffer.from(version.fileData, 'base64'), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${version.fileName}"`,
        },
      });
    }

    // Fallback: try the Resume table directly
    const resume = await db.resume.findUnique({
      where: { id },
    });

    if (resume?.fileData) {
      const contentType = resume.fileType === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      return new NextResponse(Buffer.from(resume.fileData, 'base64'), {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${resume.fileName}"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'File not found', message: 'No file data exists for the specified ID', code: 'NOT_FOUND' },
      { status: 404 }
    );
  } catch (error) {
    console.error('[API /resume/:id] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to retrieve file', message, code: 'RESUME_FILE_ERROR' },
      { status: 500 }
    );
  }
}