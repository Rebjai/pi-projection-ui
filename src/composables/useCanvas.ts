import { ref } from "vue";
import { rects, isRectFromSelectedClient } from "./useRects";
import { type DisplayConfig, type Client, type Rect } from "@/types/projection";
import { draggingIndex, getHandlesHomography } from "./useMouseHandlers";
import { selectedClient, selectedDisplay } from "./useClients";


export const previewCanvas = ref<HTMLCanvasElement | null>(null);
export const homographyCanvas = ref<HTMLCanvasElement | null>(null);
export const selectedImage = ref<string | null>(null);
export const cachedImage = ref<HTMLImageElement | null>(null);
export const cachedSrc = ref<string | null>(null);
export const homographyPoints = ref<number[][] | undefined>(undefined);
export const selectedDisplayImage = ref<string | null>(null);
export const cachedDisplayImage = ref<HTMLImageElement | null>(null);

export function setSelectedImage(img: string) {
  selectedImage.value = img;
}

function getHandles(rect: Rect) {
  return [
    { corner: "tl", x: rect.x, y: rect.y },
    { corner: "tr", x: rect.x + rect.w, y: rect.y },
    { corner: "bl", x: rect.x, y: rect.y + rect.h },
    { corner: "br", x: rect.x + rect.w, y: rect.y + rect.h },
  ];
}

export function drawCanvas(clients: Client[], newImage = selectedImage.value) {
  console.log("drawCanvas called with image", newImage);


  if (!newImage || !previewCanvas.value) return;
  const canvas = previewCanvas.value;
  const ctx = canvas.getContext("2d")!;
  const src = `${import.meta.env.VITE_API_URL}/uploads/${newImage}`;

  // Only reload if the source changes
  if (!cachedImage || cachedSrc.value !== src) {
    cachedImage.value = new Image();
    cachedSrc.value = src;
    cachedImage.value.src = src;

    cachedImage.value.onload = () => {
      renderCanvas(ctx, canvas, cachedImage.value, clients);
    };
    cachedImage.value.onerror = (err) => {
      console.error("Error loading image", err);
    };
  } else {
    // Just redraw with the cached image
    renderCanvas(ctx, canvas, cachedImage.value, clients);
  }
}

function renderCanvas(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, image: HTMLImageElement | null, clients : Client[]) {
  if (!image) return;
  const img = image;
  const parent = canvas.parentElement;
  if (parent) {
    const maxWidth = parent.clientWidth
    const aspectRatio = img.width / img.height;
    const newWidth =  maxWidth;
    const newHeight = newWidth / aspectRatio;
    canvas.width = newWidth;
    canvas.height = newHeight;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw image centered and scaled to fit
  const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
  const x = (canvas.width - img.width * scale) / 2;
  const y = (canvas.height - img.height * scale) / 2;
  ctx.drawImage(img, 0, 0, img.width, img.height, x, y, img.width * scale, img.height * scale);

  clients.forEach(client => {
    if (!client.config) return;
    if (!client.config.client_canvas_size) {
      client.config.client_canvas_size = { width: canvas.width, height: canvas.height };
    }
    const canvasW = client.config.client_canvas_size.width;
    const canvasH = client.config.client_canvas_size.height;
    if (canvasW <= 0 || canvasH <= 0) return;
    // scale rect to current canvas size
    const scaleX = canvas.width / canvasW;
    const scaleY = canvas.height / canvasH;
    // use the smaller scale to maintain aspect ratio
    const scaleUniform = Math.min(scaleX, scaleY);

    const clientRects = rects.value.filter(r => r.client_id === client.client_id);
    clientRects.forEach(r => {
      console.log("++++++++++++++++Drawing rect:", r);
      ctx.strokeStyle = isRectFromSelectedClient(r) ? "blue" : "green";
      ctx.lineWidth = 2;
      // scale rect to current canvas size
      r.rect.x = r.rect.x * scaleUniform + x;
      r.rect.y = r.rect.y * scaleUniform + y;
      r.rect.w = r.rect.w * scaleUniform;
      r.rect.h = r.rect.h * scaleUniform;
      ctx.strokeRect(r.rect.x, r.rect.y, r.rect.w, r.rect.h);
      console.log("Scaled rect to", r.rect);

      // Draw handles (corners)
      const handles = getHandles(r.rect);
      ctx.fillStyle = "red";
      handles.forEach((h) => ctx.fillRect(h.x - 4, h.y - 4, 8, 8));
      console.log("Drawn rect for client", client.client_id, "at", r.rect);
    });

    //update client canvas size to current canvas size
    client.config.client_canvas_size.width = canvas.width;
    client.config.client_canvas_size.height = canvas.height;
  });
}

export function drawHomographyCanvas() {
  console.log("drawHomographyCanvas called");

  // --- Guard Clauses ---
  if (!selectedDisplay.value) return;
  if (!homographyCanvas.value) return;
  if (!selectedDisplayImage.value) return;
  if (!selectedImage.value) return;

  const parent = homographyCanvas.value.parentElement;
  if (!parent) return;

  // --- Build image source path ---
  const imageName = selectedImage.value
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/\s+/g, "_");    // replace spaces with underscores

  const tileName = `client_${selectedClient.value?.client_id}_tile_${selectedDisplay.value.name}.png`;
  const src = `${import.meta.env.VITE_API_URL}/tiles/${imageName}/${tileName}`;

  // --- Load and cache image ---
  if (!cachedDisplayImage.value || cachedDisplayImage.value.src !== src) {
    const img = new Image();
    img.src = src;

    img.onload = () => {
      console.log("Loaded display image for homography:", src);
      cachedDisplayImage.value = img;
      drawHomographyCanvas(); // Redraw after loading
    };

    img.onerror = (err) => {
      console.error("Error loading display image", err);
    };

    return; // Exit until image is ready
  }

  // --- Resize canvas based on display resolution aspect ratio ---
  const displayAspect =
    selectedDisplay.value.resolution.width /
    selectedDisplay.value.resolution.height;

  const canvasWidth = parent.clientWidth;
  const canvasHeight = canvasWidth / displayAspect;

  homographyCanvas.value.width = canvasWidth;
  homographyCanvas.value.height = canvasHeight;

  const ctx = homographyCanvas.value.getContext("2d")!;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // --- Fit image to canvas while preserving image aspect ratio ---
  const img = cachedDisplayImage.value;
  const imgAspect = img.width / img.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth, drawHeight, offsetX, offsetY;

  if (imgAspect > canvasAspect) {
    // Image is wider → fit width
    drawWidth = canvasWidth;
    drawHeight = canvasWidth / imgAspect;
    offsetX = 0;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    // Image is taller → fit height
    drawHeight = canvasHeight;
    drawWidth = canvasHeight * imgAspect;
    offsetX = (canvasWidth - drawWidth) / 2;
    offsetY = 0;
  }


  console.log(
    "Canvas:",
    canvasWidth,
    "x",
    canvasHeight,
    "| Image drawn at:",
    drawWidth,
    "x",
    drawHeight,
    "offset:",
    offsetX,
    offsetY
  );
  drawGrid(ctx, canvasWidth, canvasHeight, homographyCanvas.value.width / 50);

  // --- Initialize homography points if missing ---
  let scaledPoints = [] as number[][];
  if (!homographyPoints.value) homographyPoints.value = [];
  if (homographyPoints.value.length !== 4) {
    console.log("Initializing homography points");
    homographyPoints.value = [
      [offsetX, offsetY],
      [offsetX + drawWidth, offsetY],
      [offsetX + drawWidth, offsetY + drawHeight],
      [offsetX, offsetY + drawHeight],
    ];
    scaledPoints = homographyPoints.value;
  } else {
    // Scale existing points to new canvas size
    console.log("Scaling existing homography points");
    scaledPoints = toCanvas(homographyPoints.value, homographyCanvas.value);
  }
  homographyPoints.value = toNormalized(scaledPoints, homographyCanvas.value);

  // --- Draw path connecting homography points ---
  ctx.strokeStyle = "blue";
  ctx.lineWidth = 2;
  ctx.beginPath();
  scaledPoints.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p[0], p[1]);
    } else {
      ctx.lineTo(p[0], p[1]);
    }
  });
  ctx.closePath();
  ctx.stroke();


  // --- Draw draggable corner handles ---
  const handles = getHandlesHomography(scaledPoints);

  console.log("draggingIndex:", draggingIndex.value);
  handles.forEach((h, index) => {
    console.log("Drawing handle", h);
    ctx.fillStyle =
      draggingIndex.value !== null &&
      draggingIndex.value !== -1 &&
      draggingIndex.value === index
        ? "orange"
        : "red";

    console.log("Handle color:", ctx.fillStyle);

    ctx.fillRect(h.x - 5, h.y - 5, 10, 10);
  });
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number) {
  ctx.strokeStyle = "#BBB";
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function toCanvas(points: number[][], canvas: HTMLCanvasElement): number[][] {
  return points.map(([nx, ny]) => [
    nx * canvas.width,
    ny * canvas.height,
  ]);
}

// Convert from canvas pixel coords back to normalized [0,1]
function toNormalized(points: number[][], canvas: HTMLCanvasElement): number[][] {
  return points.map(([x, y]) => [
    x / canvas.width,
    y / canvas.height,
  ]);
}
