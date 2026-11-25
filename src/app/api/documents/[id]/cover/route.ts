import { NextRequest, NextResponse } from 'next/server';
import { pdfToPng } from 'pdf-to-png-converter';
import { prisma } from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { canReadDocuments, getAccessContext } from '@/lib/document-access';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function renderFirstPagePng(pdfBuffer: Buffer): Promise<Buffer | null> {
  try {
    const pages = await pdfToPng(pdfBuffer, {
      pagesToProcess: [1],
      viewportScale: 1.0,
      returnPageContent: true,
      verbosityLevel: 0,
    });
    const firstPage = pages?.[0];
    if (!firstPage?.content) return null;
    return Buffer.isBuffer(firstPage.content)
      ? firstPage.content
      : Buffer.from(firstPage.content);
  } catch (err) {
    console.error('[renderFirstPagePng] Failed to render page 1:', err);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const accessCtx = await getAccessContext();
    if (!canReadDocuments(accessCtx)) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized. Please sign in to view covers.' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const docId = id?.trim();
    if (!docId) {
      return NextResponse.json(
        { ok: false, error: 'Missing document id.' },
        { status: 400 }
      );
    }

    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        path: true,
        mimeType: true,
        coverPath: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { ok: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    const storage = getStorageProvider();

    // 1. Serve cached cover if already generated and stored
    if (doc.coverPath) {
      try {
        const cachedBytes = await storage.readFile(doc.coverPath);
        if (cachedBytes && cachedBytes.length > 0) {
          return new NextResponse(new Uint8Array(cachedBytes), {
            status: 200,
            headers: {
              'Content-Type': 'image/png',
              'Cache-Control': 'private, max-age=86400',
              'X-Cover-Cache': 'HIT',
            },
          });
        }
      } catch {
        // Cached file missing on disk/storage; regenerate below
      }
    }

    // 2. Read source PDF and render page 1 once
    const pdfBytes = await storage.readFile(doc.path);
    const pdfBuffer = Buffer.isBuffer(pdfBytes) ? pdfBytes : Buffer.from(pdfBytes);

    const pngBuffer = await renderFirstPagePng(pdfBuffer);
    if (!pngBuffer || pngBuffer.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Unable to generate cover from PDF page 1.' },
        { status: 404 }
      );
    }

    // 3. Save cover alongside storage and record coverPath in Neon
    const coverStorageKey = `covers/${doc.id}.png`;
    await storage.writeFile(coverStorageKey, pngBuffer);

    await prisma.document.update({
      where: { id: doc.id },
      data: {
        coverPath: coverStorageKey,
        coverGeneratedAt: new Date(),
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=86400',
        'X-Cover-Cache': 'MISS-GENERATED',
      },
    });
  } catch (err) {
    console.error('[GET /api/documents/[id]/cover] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'Failed to load document cover.' },
      { status: 500 }
    );
  }
}