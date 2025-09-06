import { ref } from "vue";
import { rects, isRectFromSelectedClient } from "./useRects";
import type { Client, Rect } from "@/types/projection";

export const previewCanvas = ref<HTMLCanvasElement | null>(null);
export const selectedImage = ref<string | null>(null);
export const cachedImage = ref<HTMLImageElement | null>(null);
export const cachedSrc = ref<string | null>(null);

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
  const src = `http://localhost:5000/uploads/${newImage}`;

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

  // Draw rects after image
  rects.value.forEach((r) => {
    ctx.strokeStyle = isRectFromSelectedClient(r) ? "blue" : "green";
    ctx.lineWidth = 2;
    const client = clients.find(c => c.client_id === r.client_id);
    if (!client) return;
    if (!client.config) return;
    if (!client.config.client_canvas_size) return;
    const canvasW = client.config.client_canvas_size.width;
    const canvasH = client.config.client_canvas_size.height;
    if (canvasW <= 0 || canvasH <= 0) return;
    // scale rect to current canvas size
    const scaleX = canvas.width / canvasW;
    const scaleY = canvas.height / canvasH;
    // use the smaller scale to maintain aspect ratio
    const scaleUniform = Math.min(scaleX, scaleY);
    let rect = { ...r.rect };
    rect.x = rect.x * scaleUniform + x;
    rect.y = rect.y * scaleUniform + y;
    rect.w = rect.w * scaleUniform;
    rect.h = rect.h * scaleUniform;
    
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    // Draw handles (corners)
    const handles = getHandles(rect);
    ctx.fillStyle = "red";
    handles.forEach((h) => ctx.fillRect(h.x - 4, h.y - 4, 8, 8));
  });
}