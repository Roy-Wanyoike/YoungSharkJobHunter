import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Get the first user (single-user app)
    const user = await db.user.findFirst({ select: { id: true } });
    if (!user) {
      return NextResponse.json({ data: [], meta: { total: 0 } });
    }

    const where: Prisma.NotificationWhereInput = { userId: user.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: { total: notifications.length },
    });
  } catch (error) {
    console.error('[API /notifications] GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch notifications', message, code: 'NOTIFICATIONS_FETCH_ERROR' },
      { status: 500 }
    );
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { notificationId, markAllRead } = body as {
      notificationId?: string;
      markAllRead?: boolean;
    };

    if (!notificationId && !markAllRead) {
      return NextResponse.json(
        {
          error: 'Missing required field',
          message: 'Either notificationId or markAllRead is required',
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

    if (markAllRead) {
      const result = await db.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({
        data: { updatedCount: result.count },
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notificationId', message: 'notificationId is required when markAllRead is not set', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const updated = await db.notification.update({
      where: { id: notificationId, userId: user.id },
      data: { isRead: true },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        isRead: updated.isRead,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Notification not found', message: 'The specified notification does not exist', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }
    console.error('[API /notifications] PATCH error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update notification', message, code: 'NOTIFICATION_UPDATE_ERROR' },
      { status: 500 }
    );
  }
}