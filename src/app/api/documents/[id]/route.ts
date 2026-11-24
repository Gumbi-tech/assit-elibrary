// app/api/documents/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { canManageDocuments, getAccessContext } from '@/lib/document-access';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function toSlug(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
  );
}

function normalizeStringArray(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'name' in item && typeof item.name === 'string') {
        return item.name.trim();
      }
      return '';
    })
    .filter(Boolean);
}

async function resolveProgramConnect(names: string[]): Promise<Array<{ id: string }>> {
  const unique = Array.from(
    new Map(names.map((n) => [n.toLowerCase(), n])).values()
  );
  const refs: Array<{ id: string }> = [];

  for (const progName of unique) {
    const existing = await prisma.program.findFirst({
      where: { name: { equals: progName, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      refs.push({ id: existing.id });
      continue;
    }

    const baseSlug = toSlug(progName);
    const slugTaken = await prisma.program.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const created = await prisma.program.create({
      data: {
        name: progName,
        slug: slugTaken ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug,
      },
      select: { id: true },
    });
    refs.push({ id: created.id });
  }

  return refs;
}

async function resolveTagConnect(names: string[]): Promise<Array<{ id: string }>> {
  const unique = Array.from(
    new Set(names.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );
  const refs: Array<{ id: string }> = [];

  for (const tagName of unique) {
    const existing = await prisma.tag.findUnique({
      where: { name: tagName },
      select: { id: true },
    });
    if (existing) {
      refs.push({ id: existing.id });
      continue;
    }

    const baseSlug = toSlug(tagName);
    const slugTaken = await prisma.tag.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });
    const created = await prisma.tag.create({
      data: {
        name: tagName,
        slug: slugTaken ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug,
      },
      select: { id: true },
    });
    refs.push({ id: created.id });
  }

  return refs;
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canManageDocuments(ctx.role)) {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to update documents.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.document.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const nextName =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : existing.name;

    let categoryRelationUpdate:
      | { connect: { id: string } }
      | { disconnect: true }
      | undefined;

    if (typeof body.category === 'string') {
      const trimmedCategory = body.category.trim();
      if (!trimmedCategory) {
        categoryRelationUpdate = { disconnect: true };
      } else {
        const matchedCategory = await prisma.category.findFirst({
          where: {
            name: { equals: trimmedCategory, mode: 'insensitive' },
          },
          select: { id: true },
        });

        if (!matchedCategory) {
          return NextResponse.json(
            {
              ok: false,
              error: `Category "${trimmedCategory}" does not exist in the database.`,
            },
            { status: 400 }
          );
        }
        categoryRelationUpdate = { connect: { id: matchedCategory.id } };
      }
    } else if (body.category === null) {
      categoryRelationUpdate = { disconnect: true };
    }

    const programNames = normalizeStringArray(body.programs);
    const tagNames = normalizeStringArray(body.tags);

    const [programRefs, tagRefs] = await Promise.all([
      programNames !== undefined ? resolveProgramConnect(programNames) : Promise.resolve(undefined),
      tagNames !== undefined ? resolveTagConnect(tagNames) : Promise.resolve(undefined),
    ]);

    const updated = await prisma.document.update({
      where: { id },
      data: {
        name: nextName,
        title: nextName,
        ...(typeof body.author === 'string'
          ? { author: body.author.trim() || null }
          : {}),
        ...(typeof body.description === 'string'
          ? { description: body.description.trim() || null }
          : {}),
        ...(categoryRelationUpdate ? { category: categoryRelationUpdate } : {}),
        ...(programRefs !== undefined ? { programs: { set: programRefs } } : {}),
        ...(tagRefs !== undefined ? { tags: { set: tagRefs } } : {}),
      },
      include: {
        category: true,
        programs: {
          orderBy: { name: 'asc' },
        },
        tags: {
          orderBy: { name: 'asc' },
        },
        uploadedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    const signedUrl = getStorageProvider().createSignedUrl(updated.path, 300);

    return NextResponse.json({
      ok: true,
      document: {
        ...updated,
        category: updated.category?.name ?? null,
        signedUrl,
      },
    });
  } catch (err) {
    console.error('PATCH /api/documents/[id] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to update document.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    if (!canManageDocuments(ctx.role)) {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to delete documents.' },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const existing = await prisma.document.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Document not found.' }, { status: 404 });
    }

    await prisma.document.delete({ where: { id } });

    const storage = getStorageProvider() as { deleteFile?: (key: string) => Promise<void> };
    if (typeof storage.deleteFile === 'function' && existing.path) {
      await storage.deleteFile(existing.path).catch((e) => {
        console.warn('Storage delete warning:', e);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/documents/[id] error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to delete document.' },
      { status: 500 }
    );
  }
}