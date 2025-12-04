// utils/pdfUtils.js

import { createCanvas, loadImage } from "canvas"; 
// REMOVED: import fetch from "node-fetch"; // Assuming global fetch is used

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";

// --- START: FIX FOR NEXT.JS/VERCEL ---
// 1. Remove the direct import of the worker file.
// 2. Set the workerSrc to a public path that Webpack can resolve at runtime.
//    pdfjs-dist often copies its assets to a location like '/_next/static/chunks/...' 
//    or simply to the root of the node_modules folder.

// A robust way to set the path is to use a relative path that works post-bundle:
if (process.env.NODE_ENV === 'production') {
    // Vercel production: relies on the asset being in node_modules or bundled
    pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.js");
} else {
    // Local development: use the direct path that works relative to the project structure
    // This is often simpler but depends on your Next.js configuration.
    // Let's stick to the simplest relative path here:
    pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.js";
}

// NOTE: Some guides suggest copying the worker file to the public folder and using:
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js'; 
// but let's try the library-relative path first.
// --- END: FIX FOR NEXT.JS/VERCEL ---

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function drawPin(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,0,0,0.3)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = "#e63946";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

export async function getZoomedInPinImage(pdfUrl, pageNum, x, y, width, height, zoom = 2) {
  // 1) Fetch remote PDF file
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Failed to fetch PDF at ${pdfUrl}`);
  const pdfBytes = await res.arrayBuffer();

  // 2) Load PDF
  const loadingTask = pdfjs.getDocument({ data: pdfBytes });
  const pdf = await loadingTask.promise;

  if (pageNum > pdf.numPages) {
    throw new Error(`Page ${pageNum} exceeds ${pdf.numPages}`);
  }

  const page = await pdf.getPage(pageNum);

  // Render at scale 2 so we get HD image
  const viewport = page.getViewport({ scale: 2 });

  // 3) Render PDF page to a full canvas
  const fullCanvas = createCanvas(viewport.width, viewport.height);
  const fullCtx = fullCanvas.getContext("2d");

  await page.render({
    canvasContext: fullCtx,
    viewport
  }).promise;

  // 4) Crop around the pin
  const absX = x * viewport.width;
  const absY = y * viewport.height;

  const cropX = clamp(absX - width / 2, 0, viewport.width - width);
  const cropY = clamp(absY - height / 2, 0, viewport.height - height);

  // 5) Create zoomed canvas
  const zoomedCanvas = createCanvas(width * zoom, height * zoom);
  const zoomedCtx = zoomedCanvas.getContext("2d");

  zoomedCtx.drawImage(
    fullCanvas,
    cropX, cropY,
    width, height,
    0, 0,
    width * zoom,
    height * zoom
  );

  // 6) Draw pin on the zoomed snapshot
  const pinX = (absX - cropX) * zoom;
  const pinY = (absY - cropY) * zoom;
  drawPin(zoomedCtx, pinX, pinY);

  // 7) Return PNG data URL (PDF safe)
  return zoomedCanvas.toDataURL("image/png");
}
