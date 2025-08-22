import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function drawPin(ctx, x, y) {
  // Halo
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
  ctx.fill();

  // Pin
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, 2 * Math.PI);
  ctx.fillStyle = '#e63946';
  ctx.fill();

  // White center
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

export async function getZoomedInPinImage(
  pdfData,
  pageNum,
  x, // normalized [0-1]
  y, // normalized [0-1]
  width,
  height,
  zoom = 2
) {
  const loadingTask = pdfjsLib.getDocument(pdfData);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNum);

  const viewport = page.getViewport({ scale: 1 });
  const renderScale = 2;
  const renderViewport = page.getViewport({ scale: renderScale });

  const canvas = document.createElement('canvas');
  canvas.width = renderViewport.width;
  canvas.height = renderViewport.height;
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport: renderViewport }).promise;

  // Convert normalized PDF coords -> absolute page coords
  const absX = x * viewport.width;
  const absY = y * viewport.height;
 // flip Y (PDF vs canvas)

  // Scale to match renderScale
  const scaledX = absX * renderScale;
  const scaledY = absY * renderScale;

  const cropWidth = width * renderScale;
  const cropHeight = height * renderScale;

  // Center the crop around the scaled point
  let cropX = scaledX - cropWidth / 2;
  let cropY = scaledY - cropHeight / 2;

  // Clamp to canvas bounds
  cropX = clamp(cropX, 0, canvas.width - cropWidth);
  cropY = clamp(cropY, 0, canvas.height - cropHeight);

  console.log("PDF Normalized Point:", x, y);
  console.log("Absolute PDF:", absX, absY);
  console.log("Scaled Point:", scaledX, scaledY);
  console.log("Crop (x, y, w, h):", cropX, cropY, cropWidth, cropHeight);

  // Prepare zoomed canvas
  const zoomedCanvas = document.createElement('canvas');
  zoomedCanvas.width = cropWidth * zoom;
  zoomedCanvas.height = cropHeight * zoom;
  const zoomedContext = zoomedCanvas.getContext('2d');

  zoomedContext.drawImage(
    canvas,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, zoomedCanvas.width, zoomedCanvas.height
  );

  // Pin should be positioned relative to the crop, not always centered
  const pinX = (scaledX - cropX) * zoom;
  const pinY = (scaledY - cropY) * zoom;

  drawPin(zoomedContext, pinX, pinY);

  return zoomedCanvas.toDataURL('image/png');
}
