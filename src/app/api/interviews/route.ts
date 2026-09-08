import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { eventBus, DomainEvents } from '@/services/events';

const VALID_INTERVIEW_STATUSES = ['scheduled', 'completed', 'cancelled', 'rescheduled'] as const;

type InterviewResponse = {
  id: string;
  applicationId: string;
  round: number;
  type: string | null;
  date: string | null;
  duration: number | null;
  interviewer: string | null;
  status: string;
  notes: string | null;
  feedback: string | null;
  prepNotes?: string | null;
  application?: {
    id: string;
    status: string;
    job: {
      id: string;
      title: string;
      company: string;
      sourceType: string;
      location: string | null;
      remote: boolean;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
};

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId') || '';

    const where: Prisma.InterviewWhereInput = {};
    if (applicationId) {
      where.applicationId = applicationId;
    }

    const [interviews, total] = await Promise.all([
      db.interview.findMany({
        where,
        include: {
          application: {
            include: {
              job: {
                select: {
                  id: true,
                  title: true,
                  company: true,
                  sourceType: true,
                  location: true,
                  remote: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'asc' },
      }),
      db.interview.count({ where }),
    ]);

    const data: InterviewResponse[] = interviews.map((i) => ({
      id: i.id,
      applicationId: i.applicationId,
      round: i.round,
      type: i.type,
      date: i.date?.toISOString() ?? null,
      duration: i.duration,
      interviewer: i.interviewer,
      status: i.status,
      notes: i.notes,
      feedback: i.feedback,
      prepNotes: i.prepNotes,
      application: {
        id: i.application.id,
        status: i.application.status,
        job: i.application.job ?? null,
      },
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));

    return NextResponse.json({ interviews: data, total });
  } catch (error) {
    console.error('[API /interviews] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch interviews', message, code: 'INTERVIEWS_FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, round, type, date, duration, interviewer, notes } = body as {
      applicationId?: string;
      round?: number;
      type?: string;
      date?: string;
      duration?: number;
      interviewer?: string;
      notes?: string;
    };

    if (!applicationId || round === undefined) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          message: 'applicationId and round are required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Verify application exists
    const application = await db.application.findUnique({
      where: { id: applicationId },
    });
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found', message: 'The specified application does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const interview = await db.interview.create({
      data: {
        applicationId,
        round: Number(round),
        type: type ?? null,
        date: date ? new Date(date) : null,
        duration: duration != null ? Number(duration) : null,
        interviewer: interviewer ?? null,
        notes: notes ?? null,
      },
    });

    // Emit event
    eventBus.emit(DomainEvents.INTERVIEW_SCHEDULED, {
      interviewId: interview.id,
      applicationId,
      round: interview.round,
      date: interview.date,
    });

    const data: InterviewResponse = {
      id: interview.id,
      applicationId: interview.applicationId,
      round: interview.round,
      type: interview.type,
      date: interview.date?.toISOString() ?? null,
      duration: interview.duration,
      interviewer: interview.interviewer,
      status: interview.status,
      notes: interview.notes,
      feedback: interview.feedback,
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
    };

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Foreign key constraint failed', message: 'Invalid applicationId', code: 'FK_ERROR' },
        { status: 400 }
      );
    }
    console.error('[API /interviews] POST error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create interview', message, code: 'INTERVIEW_CREATE_ERROR' },
      { status: 500 }
    );
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { interviewId, status, feedback, notes } = body as {
      interviewId?: string;
      status?: string;
      feedback?: string;
      notes?: string;
    };

    if (!interviewId) {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'interviewId is required',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !VALID_INTERVIEW_STATUSES.includes(status as typeof VALID_INTERVIEW_STATUSES[number])) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          message: `status must be one of: ${VALID_INTERVIEW_STATUSES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }

    const updateData: Prisma.InterviewUpdateInput = {};
    if (status) updateData.status = status;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await db.interview.update({
      where: { id: interviewId },
      data: updateData,
    });

    const data: InterviewResponse = {
      id: updated.id,
      applicationId: updated.applicationId,
      round: updated.round,
      type: updated.type,
      date: updated.date?.toISOString() ?? null,
      duration: updated.duration,
      interviewer: updated.interviewer,
      status: updated.status,
      notes: updated.notes,
      feedback: updated.feedback,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Interview not found', message: 'The specified interview does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    console.error('[API /interviews] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update interview', message, code: 'INTERVIEW_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}
