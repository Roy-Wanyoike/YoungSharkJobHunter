import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventBus, DomainEvents } from '@/services/events';
import { Prisma } from '@prisma/client';

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ApplicationWithRelations {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  resumeVersionId: string | null;
  status: string;
  coverLetter: string | null;
  notes: string | null;
  appliedAt: Date | null;
  lastFollowUp: Date | null;
  nextFollowUp: Date | null;
  salaryOffered: number | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterCompany: string | null;
  feedback: string | null;
  atsScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  job: {
    id: string;
    title: string;
    company: string;
    source: string;
    sourceType: string;
    location: string | null;
    remote: boolean;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    salaryType: string | null;
    description: string;
    skills: string;
    experienceLevel: string | null;
    sourceUrl: string;
  } | null;
  resume: {
    id: string;
    fileName: string;
    fileType: string;
    isPrimary: boolean;
  } | null;
  interviews: {
    id: string;
    round: number;
    type: string | null;
    date: Date | null;
    duration: number | null;
    interviewer: string | null;
    status: string;
    notes: string | null;
    feedback: string | null;
  }[];
}

function toApplicationResponse(app: ApplicationWithRelations) {
  let parsedJobSkills: string[] = [];
  if (app.job?.skills) {
    try {
      const raw = JSON.parse(app.job.skills);
      if (Array.isArray(raw)) {
        parsedJobSkills = raw.map((s: unknown) => String(s));
      }
    } catch {
      parsedJobSkills = [];
    }
  }

  return {
    id: app.id,
    userId: app.userId,
    jobId: app.jobId,
    resumeId: app.resumeId,
    resumeVersionId: app.resumeVersionId,
    status: app.status,
    coverLetter: app.coverLetter,
    notes: app.notes,
    appliedAt: app.appliedAt?.toISOString() ?? null,
    lastFollowUp: app.lastFollowUp?.toISOString() ?? null,
    nextFollowUp: app.nextFollowUp?.toISOString() ?? null,
    salaryOffered: app.salaryOffered,
    recruiterName: app.recruiterName,
    recruiterEmail: app.recruiterEmail,
    recruiterCompany: app.recruiterCompany,
    feedback: app.feedback,
    atsScore: app.atsScore,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    job: app.job
      ? {
          ...app.job,
          skills: parsedJobSkills,
        }
      : null,
    resume: app.resume,
    interviews: app.interviews.map((i) => ({
      ...i,
      date: i.date?.toISOString() ?? null,
    })),
  };
}

const VALID_STATUSES = [
  'draft',
  'submitted',
  'reviewing',
  'interview',
  'assessment',
  'offer',
  'rejected',
  'ghosted',
];

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where: Prisma.ApplicationWhereInput = {};
    if (status && status !== 'all' && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    // Fetch filtered applications with relations
    const applications = await db.application.findMany({
      where,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            source: true,
            sourceType: true,
            location: true,
            remote: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryType: true,
            description: true,
            skills: true,
            experienceLevel: true,
            sourceUrl: true,
          },
        },
        resume: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            isPrimary: true,
          },
        },
        interviews: {
          select: {
            id: true,
            round: true,
            type: true,
            date: true,
            duration: true,
            interviewer: true,
            status: true,
            notes: true,
            feedback: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute counts from ALL applications (not just filtered)
    const allApplications = await db.application.findMany({
      select: { status: true },
    });

    const counts: Record<string, number> = {
      all: allApplications.length,
      draft: 0,
      submitted: 0,
      reviewing: 0,
      interview: 0,
      assessment: 0,
      offer: 0,
      rejected: 0,
      ghosted: 0,
    };

    for (const app of allApplications) {
      if (app.status in counts) {
        counts[app.status]++;
      }
    }

    return NextResponse.json({
      data: applications.map(toApplicationResponse),
      counts,
      meta: { total: applications.length },
    });
  } catch (error) {
    console.error('[API /applications] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch applications', message, code: 'APPLICATIONS_FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { jobId, resumeId, status, coverLetter, notes } = body as {
      jobId?: string;
      resumeId?: string;
      status?: string;
      coverLetter?: string;
      notes?: string;
    };

    if (!jobId || !resumeId) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'jobId and resumeId are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Verify job exists
    const job = await db.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', message: 'The specified job does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Verify resume exists
    const resume = await db.resume.findUnique({ where: { id: resumeId } });
    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found', message: 'The specified resume does not exist', code: 'NOT_FOUND' },
        { status: 404 }
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

    const appStatus = status && VALID_STATUSES.includes(status) ? status : 'draft';
    const appliedAt = appStatus === 'submitted' ? new Date() : null;

    const application = await db.application.create({
      data: {
        userId: user.id,
        jobId,
        resumeId,
        status: appStatus,
        coverLetter: coverLetter ?? null,
        notes: notes ?? null,
        appliedAt,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            source: true,
            sourceType: true,
            location: true,
            remote: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryType: true,
            description: true,
            skills: true,
            experienceLevel: true,
            sourceUrl: true,
          },
        },
        resume: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            isPrimary: true,
          },
        },
        interviews: true,
      },
    });

    // Mark job as applied
    if (appStatus === 'submitted') {
      await db.job.update({
        where: { id: jobId },
        data: { isApplied: true },
      });
    }

    return NextResponse.json(
      { data: toApplicationResponse(application as ApplicationWithRelations) },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Foreign key constraint failed', message: 'Invalid jobId or resumeId', code: 'FK_ERROR' },
          { status: 400 }
        );
      }
    }
    console.error('[API /applications] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create application', message, code: 'APPLICATION_CREATE_ERROR' },
      { status: 500 }
    );
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, status, feedback, notes, recruiterName, recruiterEmail } = body as {
      applicationId?: string;
      status?: string;
      feedback?: string;
      notes?: string;
      recruiterName?: string;
      recruiterEmail?: string;
    };

    if (!applicationId) {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'applicationId is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Verify the application exists
    const existing = await db.application.findUnique({ where: { id: applicationId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Application not found', message: 'The specified application does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const updateData: Prisma.ApplicationUpdateInput = {};

    if (status && VALID_STATUSES.includes(status)) {
      updateData.status = status;

      // Set appliedAt when transitioning to submitted
      if (status === 'submitted' && !existing.appliedAt) {
        updateData.appliedAt = new Date();
        // Also mark the job as applied
        await db.job.update({
          where: { id: existing.jobId },
          data: { isApplied: true },
        });
      }
    }

    if (feedback !== undefined) updateData.feedback = feedback;
    if (notes !== undefined) updateData.notes = notes;
    if (recruiterName !== undefined) updateData.recruiterName = recruiterName;
    if (recruiterEmail !== undefined) updateData.recruiterEmail = recruiterEmail;

    const updated = await db.application.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            source: true,
            sourceType: true,
            location: true,
            remote: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryType: true,
            description: true,
            skills: true,
            experienceLevel: true,
            sourceUrl: true,
          },
        },
        resume: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            isPrimary: true,
          },
        },
        interviews: {
          select: {
            id: true,
            round: true,
            type: true,
            date: true,
            duration: true,
            interviewer: true,
            status: true,
            notes: true,
            feedback: true,
          },
        },
      },
    });

    // Emit domain event on status change
    if (status && status !== existing.status) {
      eventBus.emit(DomainEvents.APPLICATION_STATUS_CHANGED, {
        applicationId,
        previousStatus: existing.status,
        newStatus: status,
        jobId: existing.jobId,
      });
    }

    return NextResponse.json({ data: toApplicationResponse(updated as ApplicationWithRelations) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Application not found', message: 'The specified application does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    console.error('[API /applications] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update application', message, code: 'APPLICATION_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}