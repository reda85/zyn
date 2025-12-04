// utils/pdfUtils.js
import { createCanvas, loadImage } from "canvas";
import fetch from "node-fetch";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import "pdfjs-dist/legacy/build/pdf.worker.js"; // registers worker in Node


// Disable worker (fake worker mode)
pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.js";



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
