import { ref } from "vue";
import { rects } from "./useRects";
import { drawCanvas } from "./useCanvas";
import type { Rect, RectConfig } from "@/types/projection";

export const dragging = ref<{
    rectIndex: number;
    corner: string;
    offsetX?: number;
    offsetY?: number;
} | null>(null);


function getHandles(rect: Rect) {
  return [
    { corner: "tl", x: rect.x, y: rect.y },
    { corner: "tr", x: rect.x + rect.w, y: rect.y },
    { corner: "bl", x: rect.x, y: rect.y + rect.h },
    { corner: "br", x: rect.x + rect.w, y: rect.y + rect.h },
  ];
}

// Mouse handling
export function onMouseDown(e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let i = rects.value.length - 1; i >= 0; i--) {
    const r = rects.value[i].rect;
    const handles = getHandles(r);

    // Check corners first
    for (const h of handles) {
      if (Math.abs(mx - h.x) < 6 && Math.abs(my - h.y) < 6) {
        dragging.value = { rectIndex: i, corner: h.corner };
        return;
      }
    }

    // Check edges
    const edgeThreshold = 6;
    const onLeft = Math.abs(mx - r.x) < edgeThreshold && my >= r.y && my <= r.y + r.h;
    const onRight = Math.abs(mx - (r.x + r.w)) < edgeThreshold && my >= r.y && my <= r.y + r.h;
    const onTop = Math.abs(my - r.y) < edgeThreshold && mx >= r.x && mx <= r.x + r.w;
    const onBottom = Math.abs(my - (r.y + r.h)) < edgeThreshold && mx >= r.x && mx <= r.x + r.w;

    if (onLeft) { dragging.value = { rectIndex: i, corner: "left" }; return; }
    if (onRight) { dragging.value = { rectIndex: i, corner: "right" }; return; }
    if (onTop) { dragging.value = { rectIndex: i, corner: "top" }; return; }
    if (onBottom) { dragging.value = { rectIndex: i, corner: "bottom" }; return; }

    // Check inside rectangle for move
    if (mx > r.x && mx < r.x + r.w && my > r.y && my < r.y + r.h) {
      dragging.value = {
        rectIndex: i,
        corner: "move",
        offsetX: mx - r.x,
        offsetY: my - r.y,
      };
      return;
    }
  }
}

export function onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
  if (!dragging.value) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const r = rects.value[dragging.value.rectIndex].rect;

  switch (dragging.value.corner) {
    // Corners
    case "tl":
      r.w += r.x - mx;
      r.h += r.y - my;
      r.x = mx;
      r.y = my;
      break;
    case "tr":
      r.w = mx - r.x;
      r.h += r.y - my;
      r.y = my;
      break;
    case "bl":
      r.w += r.x - mx;
      r.x = mx;
      r.h = my - r.y;
      break;
    case "br":
      r.w = mx - r.x;
      r.h = my - r.y;
      break;

    // Edges
    case "left":
      r.w += r.x - mx;
      r.x = mx;
      break;
    case "right":
      r.w = mx - r.x;
      break;
    case "top":
      r.h += r.y - my;
      r.y = my;
      break;
    case "bottom":
      r.h = my - r.y;
      break;

    // Move rectangle
    case "move":
      r.x = mx - dragging.value.offsetX!;
      r.y = my - dragging.value.offsetY!;
      break;
  }

  drawCanvas();
}

export function onMouseUp() {
    dragging.value = null;
}
