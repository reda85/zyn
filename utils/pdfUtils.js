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

  // Centre blanc
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
}


export async function getZoomedInPinImage(pdfData, pageNum, x, y, width, height, zoom = 2) {
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

  const scale = renderScale;
  const cropWidth = width * scale;
  const cropHeight = height * scale;

  // Centrer le crop autour du point PDF
  let cropX = (x - width / 2) * scale;
  //let cropY = (viewport.height - y - height / 2) * scale;
let cropY = (y - height / 2) * scale;
  // Empêcher le crop de sortir du canvas
  cropX = clamp(cropX, 0, canvas.width - cropWidth);
  cropY = clamp(cropY, 0, canvas.height - cropHeight);

  console.log("PDF Point:", x, y);
  console.log("Viewport:", viewport.width, viewport.height);
  console.log("Crop (x, y, w, h):", cropX, cropY, cropWidth, cropHeight);

  const zoomedCanvas = document.createElement('canvas');
  zoomedCanvas.width = cropWidth * zoom;
  zoomedCanvas.height = cropHeight * zoom;
  const zoomedContext = zoomedCanvas.getContext('2d');

  zoomedContext.drawImage(
    canvas,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, zoomedCanvas.width, zoomedCanvas.height
  );

  const pinX = zoomedCanvas.width / 2;
  const pinY = zoomedCanvas.height / 2;

drawPin(zoomedContext, pinX, pinY);


  return zoomedCanvas.toDataURL('image/png');
}
