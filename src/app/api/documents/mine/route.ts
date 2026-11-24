import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // adjust to your Prisma client export path

export const dynamic = 'force-dynamic';

type SessionUser = {
  id: string;
  email?: string;
  fullName?: string;
  role?: string;
};

async function resolveAuthenticatedUser(
  req: NextRequest
): Promise<SessionUser | null> {
  // 1. Check x-elibrary-user header (used by library-api.ts)
  const rawHeader = req.headers.get('x-elibrary-user');
  if (rawHeader) {
    try {
      const parsed = JSON.parse(decodeURIComponent(rawHeader));
      if (parsed?.id) {
        return {
          id: String(parsed.id),
          email: parsed.email ? String(parsed.email) : undefined,
          fullName: parsed.fullName || parsed.name ? String(parsed.fullName || parsed.name) : undefined,
          role: parsed.role ? String(parsed.role) : undefined,
        };
      }
    } catch {
      // ignore malformed header
    }
  }

  // 2. Check cookie-based session if your app stores current user or token in cookies
  const cookieUser = req.cookies.get('elibrary_current_user')?.value;
  if (cookieUser) {
    try {
      const parsed = JSON.parse(decodeURIComponent(cookieUser));
      if (parsed?.id) {
        return {
          id: String(parsed.id),
          email: parsed.email ? String(parsed.email) : undefined,
          fullName: parsed.fullName || parsed.name ? String(parsed.fullName || parsed.name) : undefined,
          role: parsed.role ? String(parsed.role) : undefined,
        };
      }
    } catch {
      // ignore malformed cookie
    }
  }

  // 3. Optional: if you use a session lookup helper (e.g. getSessionUser(req)), wire it here
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please sign in to view your posted books.' },
        { status: 401 }
      );
    }

    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category')?.trim() || '';
    const program = searchParams.get('program')?.trim() || '';
    const q = searchParams.get('q')?.trim() || '';

    // Adjust `uploadedById` if your Prisma Document model uses `userId` or `authorId`
    const where: Record<string, unknown> = {
      uploadedById: user.id,
    };

    if (category && category !== 'ALL') {
      where.category = {
        equals: category,
        mode: 'insensitive',
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { filename: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (program && program !== 'ALL') {
      // Adjust relation name (`programs`) to match your Prisma schema
      where.programs = {
        some: {
          name: {
            equals: program,
            mode: 'insensitive',
          },
        },
      };
    }

    const rows = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        programs: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    const documents = rows.map((doc) => ({
      ...doc,
      signedUrl: `/api/documents/${encodeURIComponent(doc.id)}/file`,
    }));

    return NextResponse.json({
      ok: true,
      documents,
    });
  } catch (error) {
    console.error('[GET /api/documents/mine] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load your posted books.' },
      { status: 500 }
    );
  }
}