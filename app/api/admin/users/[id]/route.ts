import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, withDbRetry } from '@/lib/prisma';
import { COOKIE_NAME, verifySessionToken } from '@/lib/auth';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session.user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { role, status } = body || {};

    const targetUser = await withDbRetry(async () => {
      return await prisma.user.findUnique({ where: { id } });
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Safety guard: Cannot demote or disable the last active admin
    if (
      (role === 'STAFF' && targetUser.role === 'ADMIN') ||
      (status === 'DISABLED' && targetUser.role === 'ADMIN')
    ) {
      const activeAdminCount = await withDbRetry(async () => {
        return await prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } },
        });
      });

      if (activeAdminCount === 0) {
        return NextResponse.json(
          { error: 'Cannot demote or disable the only remaining active administrator.' },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: { role?: string; status?: string } = {};
    if (role && ['ADMIN', 'STAFF'].includes(role)) {
      dataToUpdate.role = role;
    }
    if (status && ['ACTIVE', 'DISABLED', 'PENDING'].includes(status)) {
      dataToUpdate.status = status;
    }

    const updatedUser = await withDbRetry(async () => {
      return await prisma.user.update({
        where: { id },
        data: dataToUpdate,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('PATCH /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update member.' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const { id } = await params;

    const targetUser = await withDbRetry(async () => {
      return await prisma.user.findUnique({ where: { id } });
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Safety guard: Cannot delete the last active admin
    if (targetUser.role === 'ADMIN' && targetUser.status === 'ACTIVE') {
      const otherAdmins = await withDbRetry(async () => {
        return await prisma.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } },
        });
      });

      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Cannot remove the only remaining active administrator.' },
          { status: 400 }
        );
      }
    }

    await withDbRetry(async () => {
      return await prisma.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Member deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/admin/users/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete member.' }, { status: 500 });
  }
}
