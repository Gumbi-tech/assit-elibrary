import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function slugifyCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `category-${Date.now()}`;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Category not found.' },
        { status: 404 }
      );
    }

    const nextName =
      typeof body?.name === 'string' && body.name.trim()
        ? body.name.trim()
        : existing.name;

    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        name: { equals: nextName, mode: 'insensitive' },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { ok: false, error: `Another category already uses "${nextName}".` },
        { status: 409 }
      );
    }

    const nextDescription =
      typeof body?.description === 'string'
        ? body.description.trim() || `Open library resources in ${nextName}.`
        : existing.description;

    const nextSlug =
      nextName.toLowerCase() !== existing.name.toLowerCase()
        ? slugifyCategory(nextName)
        : existing.slug;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: nextName,
        slug: nextSlug,
        description: nextDescription,
      },
    });

    return NextResponse.json({ ok: true, category });
  } catch (error) {
    console.error('PATCH /api/categories/[id] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to update category.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: 'Category not found.' },
        { status: 404 }
      );
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error('DELETE /api/categories/[id] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete category.' },
      { status: 500 }
    );
  }
}