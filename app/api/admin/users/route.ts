import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, withDbRetry } from '@/lib/prisma';
import { COOKIE_NAME, verifySessionToken, hashPassword } from '@/lib/auth';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session.user;
}

export async function GET() {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const users = await withDbRetry(async () => {
      return await prisma.user.findMany({
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users. If the database was sleeping, please wait a moment.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role = 'STAFF' } = body || {};

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    const existing = await withDbRetry(async () => {
      return await prisma.user.findUnique({ where: { email: cleanEmail } });
    });

    if (existing) {
      return NextResponse.json({ error: 'A member with this email already exists.' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await withDbRetry(async () => {
      return await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          password: hashedPassword,
          role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
          status: 'ACTIVE', // Directly added by admin, so active immediately
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/users error:', error);
    return NextResponse.json({ error: 'Failed to create member.' }, { status: 500 });
  }
}
