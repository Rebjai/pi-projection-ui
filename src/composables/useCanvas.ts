import { ref } from "vue";
import { rects, isRectFromSelectedClient } from "./useRects";
import type { Rect } from "@/types/projection";

export const previewCanvas = ref<HTMLCanvasElement | null>(null);
export const selectedImage = ref<string | null>(null);
export const drawnImage = ref<HTMLImageElement | null>(null);

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

export function drawCanvas(newImage = selectedImage.value) {
  console.log("drawCanvas called with image", newImage);


  if (!newImage || !previewCanvas.value) return;
  console.log("Drawing canvas with image", newImage);
  console.log("canvas ref", previewCanvas.value);


  const canvas = previewCanvas.value;
  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.src = `http://localhost:5000/uploads/${newImage}`;

  img.onload = () => {
    // Clear canvas
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
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      // Draw handles (corners)
      const handles = getHandles(r);
      ctx.fillStyle = "red";
      handles.forEach((h) => ctx.fillRect(h.x - 4, h.y - 4, 8, 8));
    });
  };
  img.onerror = (err) => {
    console.error("Error loading image", err);
  };
}
