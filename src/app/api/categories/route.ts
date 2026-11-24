import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugifyCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to load categories from database.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
    const rawDescription =
      typeof body?.description === 'string' ? body.description.trim() : '';

    if (!rawName) {
      return NextResponse.json(
        { ok: false, error: 'Category name is required.' },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: rawName, mode: 'insensitive' },
      },
    });

    if (existing) {
      return NextResponse.json(
        { ok: false, error: `Category "${rawName}" already exists.` },
        { status: 409 }
      );
    }

    const baseSlug = slugifyCategory(rawName);
    const slugCollision = await prisma.category.findUnique({
      where: { slug: baseSlug },
    });
    const slug = slugCollision ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

    const category = await prisma.category.create({
      data: {
        name: rawName,
        slug,
        description: rawDescription || `Open library resources in ${rawName}.`,
      },
    });

    return NextResponse.json({ ok: true, category }, { status: 201 });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create category in database.' },
      { status: 500 }
    );
  }
}