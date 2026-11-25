// app/api/documents/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { getAccessContext } from '@/lib/document-access';

const MAX_PDF_SIZE_BYTES = 255 * 1024 * 1024; // 255 MB

function isPdfFile(file: File): boolean {
  const hasPdfMime = file.type === 'application/pdf';
  const hasPdfExt = file.name.toLowerCase().endsWith('.pdf');
  return hasPdfMime || hasPdfExt;
}

function toSlug(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `item-${Date.now()}`
  );
}

function parseStringList(entry: FormDataEntryValue | null): string[] {
  if (!entry || typeof entry !== 'string') return [];
  const trimmed = entry.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated parsing
  }

  return trimmed
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveProgramIds(names: string[]): Promise<string[]> {
  const uniqueByLower = new Map<string, string>();
  for (const name of names) {
    const clean = name.trim();
    if (clean) {
      const key = clean.toLowerCase();
      if (!uniqueByLower.has(key)) uniqueByLower.set(key, clean);
    }
  }

  const ids: string[] = [];
  for (const progName of uniqueByLower.values()) {
    const existing = await prisma.program.findFirst({
      where: { name: { equals: progName, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existing) {
      ids.push(existing.id);
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
        slug: slugTaken
          ? `${baseSlug}-${Date.now().toString().slice(-4)}`
          : baseSlug,
      },
      select: { id: true },
    });

    ids.push(created.id);
  }

  return ids;
}

async function resolveTagIds(names: string[]): Promise<string[]> {
  const normalizedTags = Array.from(
    new Set(names.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );

  const ids: string[] = [];
  for (const tagName of normalizedTags) {
    const existing = await prisma.tag.findUnique({
      where: { name: tagName },
      select: { id: true },
    });

    if (existing) {
      ids.push(existing.id);
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
        slug: slugTaken
          ? `${baseSlug}-${Date.now().toString().slice(-4)}`
          : baseSlug,
      },
      select: { id: true },
    });

    ids.push(created.id);
  }

  return ids;
}

export async function GET(req: Request) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category')?.trim() || undefined;
    const program = searchParams.get('program')?.trim() || undefined;
    const q = searchParams.get('q')?.trim() || undefined;

    const where = {
      ...(category && category.toUpperCase() !== 'ALL'
        ? {
            category: {
              is: {
                name: {
                  equals: category,
                  mode: 'insensitive' as const,
                },
              },
            },
          }
        : {}),
      ...(program && program.toUpperCase() !== 'ALL'
        ? {
            programs: {
              some: {
                name: {
                  equals: program,
                  mode: 'insensitive' as const,
                },
              },
            },
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { title: { contains: q, mode: 'insensitive' as const } },
              { author: { contains: q, mode: 'insensitive' as const } },
              { filename: { contains: q, mode: 'insensitive' as const } },
              {
                category: {
                  is: {
                    name: { contains: q, mode: 'insensitive' as const },
                  },
                },
              },
              {
                programs: {
                  some: {
                    name: { contains: q, mode: 'insensitive' as const },
                  },
                },
              },
              {
                tags: {
                  some: {
                    name: { contains: q, mode: 'insensitive' as const },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const storage = getStorageProvider();

    const rows = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    const documents = rows.map((doc) => ({
      ...doc,
      category: doc.category?.name ?? null,
      categoryId: doc.categoryId,
      signedUrl: storage.createSignedUrl(doc.path, 300),
    }));

    return NextResponse.json({
      ok: true,
      documents,
    });
  } catch (err) {
    console.error('GET /api/documents error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load documents.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAccessContext();
    if (!ctx) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized.' },
        { status: 401 }
      );
    }

    if (ctx.role === 'STUDENT') {
      return NextResponse.json(
        { ok: false, error: 'Students are not permitted to upload documents.' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'A valid PDF file upload is required.' },
        { status: 400 }
      );
    }

    if (fileEntry.size <= 0) {
      return NextResponse.json(
        { ok: false, error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    if (fileEntry.size > MAX_PDF_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'PDF exceeds the 25 MB upload limit.' },
        { status: 400 }
      );
    }

    if (!isPdfFile(fileEntry)) {
      return NextResponse.json(
        { ok: false, error: 'Only PDF files are allowed.' },
        { status: 400 }
      );
    }

    const rawDisplayName = formData.get('name');
    const displayName =
      typeof rawDisplayName === 'string' && rawDisplayName.trim()
        ? rawDisplayName.trim()
        : fileEntry.name;

    const rawAuthor = formData.get('author');
    const author =
      typeof rawAuthor === 'string' && rawAuthor.trim()
        ? rawAuthor.trim()
        : null;

    const rawDescription = formData.get('description');
    const description =
      typeof rawDescription === 'string' && rawDescription.trim()
        ? rawDescription.trim()
        : null;

    const categoryRaw = formData.get('category');
    const requestedCategoryName =
      typeof categoryRaw === 'string' && categoryRaw.trim()
        ? categoryRaw.trim()
        : '';

    let categoryId: string | null = null;
    if (requestedCategoryName) {
      const matchedCategory = await prisma.category.findFirst({
        where: {
          name: { equals: requestedCategoryName, mode: 'insensitive' },
        },
        select: { id: true },
      });

      if (!matchedCategory) {
        return NextResponse.json(
          {
            ok: false,
            error: `Category "${requestedCategoryName}" does not exist in the database.`,
          },
          { status: 400 }
        );
      }
      categoryId = matchedCategory.id;
    }

    const programNames = parseStringList(formData.get('programs'));
    const tagNames = parseStringList(formData.get('tags'));

    const [programIds, tagIds] = await Promise.all([
      resolveProgramIds(programNames),
      resolveTagIds(tagNames),
    ]);

    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const storage = getStorageProvider();
    const uploaded = await storage.uploadPdf({
      buffer,
      originalFilename: fileEntry.name,
      mimeType: 'application/pdf',
      folder: 'library',
    });

    const document = await prisma.document.create({
      data: {
        name: displayName,
        title: displayName,
        author,
        description,
        filename: uploaded.storedFilename,
        path: uploaded.storageKey,
        size: uploaded.size,
        mimeType: 'application/pdf',
        ...(categoryId ? { categoryId } : {}),
        ...(programIds.length > 0
          ? { programs: { connect: programIds.map((id) => ({ id })) } }
          : {}),
        ...(tagIds.length > 0
          ? { tags: { connect: tagIds.map((id) => ({ id })) } }
          : {}),
        uploadedById: ctx.userId,
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

    const signedUrl = storage.createSignedUrl(document.path, 300);

    return NextResponse.json(
      {
        ok: true,
        document: {
          ...document,
          category: document.category?.name ?? null,
          signedUrl,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/documents error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to upload PDF document.' },
      { status: 500 }
    );
  }
}