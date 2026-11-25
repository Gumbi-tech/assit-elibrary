// lib/pdf-cover.ts
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';

const PDFJS_ROOT = path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
const RENDER_TIMEOUT_MS = 20_000;

// pdf.js requires directory URLs to end with "/", so force forward slashes on Windows.
function dirWithSlash(...parts: string[]): string {
  return (
    path.join(PDFJS_ROOT, ...parts).replace(/\\/g, '/').replace(/\/+$/, '') + '/'
  );
}

let pdfjsPromise: Promise<any> | null = null;

async function getPdfJs(): Promise<any> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
      // Preload the worker so pdf.js doesn't need to locate the worker file.
      (globalThis as any).pdfjsWorker = worker;
      return pdfjs;
    })().catch((err) => {
      pdfjsPromise = null; // allow retry on the next upload
      throw err;
    });
  }
  return pdfjsPromise;
}

/**
 * Renders page 1 of a PDF to a PNG buffer.
 * Returns null on any failure (corrupt, password-protected, timeout, ...)
 * so uploads never fail because of a thumbnail.
 */
export async function renderFirstPagePngBuffer(
  pdfBuffer: Buffer,
  targetWidth = 600
): Promise<Buffer | null> {
  let loadingTask: any = null;
  let timer: NodeJS.Timeout | null = null;

  try {
    const pdfjs = await getPdfJs();

    loadingTask = pdfjs.getDocument({
      // pdf.js needs a Uint8Array (not a Buffer); copy so the original stays intact.
      data: new Uint8Array(pdfBuffer),
      cMapUrl: dirWithSlash('cmaps'),
      cMapPacked: true,
      standardFontDataUrl: dirWithSlash('standard_fonts'),
      wasmUrl: dirWithSlash('wasm'),
      isEvalSupported: false,
      useSystemFonts: false,
      verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderTask = page.render({
      canvas: canvas as any,
      canvasContext: ctx as any,
      viewport,
    });

    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        try {
          renderTask.cancel();
        } catch {}
        reject(new Error('Cover render timed out'));
      }, RENDER_TIMEOUT_MS);
    });

    await Promise.race([renderTask.promise, timeout]);

    page.cleanup();
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error('[renderFirstPagePngBuffer] Failed:', err);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
    try {
      await loadingTask?.destroy();
    } catch {}
  }
}