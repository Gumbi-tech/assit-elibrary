import fs from 'fs';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as worker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';

globalThis.pdfjsWorker = worker; // skip worker file lookup

process.on('exit', (code) => console.log('exit code:', code));

async function main() {
  const file = fs.readdirSync('.').find((f) => f.toLowerCase().endsWith('.pdf'));
  console.log('1. file:', file);

  const data = new Uint8Array(fs.readFileSync(file));
  console.log('2. bytes read:', data.length);

  const pdf = await pdfjs.getDocument({ data, verbosity: 5 }).promise;
  console.log('3. pages:', pdf.numPages);

  const page = await pdf.getPage(1);
  console.log('4. got page 1');

  const viewport = page.getViewport({ scale: 1 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  console.log('5. rendered');

  fs.writeFileSync('test-cover.png', canvas.toBuffer('image/png'));
  console.log('done');
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});