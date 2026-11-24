import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'At least one category ID is required.' },
        { status: 400 }
      );
    }

    const result = await prisma.category.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      ok: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error('POST /api/categories/bulk-delete error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to bulk delete categories.' },
      { status: 500 }
    );
  }
}