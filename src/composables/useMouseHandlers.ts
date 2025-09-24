import { ref } from "vue";
import { rects } from "./useRects";
import { drawCanvas, homographyPoints } from "./useCanvas";
import type { Client, Rect } from "@/types/projection";

export const draggingIndex = ref<number | null>(null);
export const dragging = ref<{
    rectIndex: number;
    corner: string;
    offsetX?: number;
    offsetY?: number;
} | null>(null);
export const homographyPointMoving = ref(false);
export const hiddenInput = ref<HTMLInputElement | null>(null);
export const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const edgeThreshold = 6;



function getHandles(rect: Rect) {
  return [
    { corner: "tl", x: rect.x, y: rect.y },
    { corner: "tr", x: rect.x + rect.w, y: rect.y },
    { corner: "bl", x: rect.x, y: rect.y + rect.h },
    { corner: "br", x: rect.x + rect.w, y: rect.y + rect.h },
  ];
}

export function getHandlesHomography(points: number[][]) {
  return points.map((p, index) => ({
    corner: `p${index}`,
    x: p[0],
    y: p[1],
  }));
}

// Mouse handling
export function onPointerDown(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  console.log("onPointerDown", clientX, clientY);
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

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
      console.log("Start moving rect", i);
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

export function onPointerMove(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
  if (!dragging.value) return;

  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;

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
}

export function onMouseDown(evt: MouseEvent, canvas: HTMLCanvasElement) {
  onPointerDown(evt.clientX, evt.clientY, canvas);
}

export function onMouseMove(evt: MouseEvent, canvas: HTMLCanvasElement) {
  if (dragging.value) {
    onPointerMove(evt.clientX, evt.clientY, canvas);
  }
}

export function onMouseUp() {
    dragging.value = null;
}

export function getMousePos(evt: MouseEvent | TouchEvent, canvasEl: HTMLCanvasElement | null = null) {
  if (!canvasEl) return { x: 0, y: 0 };
  const rect = canvasEl.getBoundingClientRect();
  const { clientX, clientY } = getClientPos(evt);
  return {
    x: ((clientX - rect.left) / rect.width) * canvasEl.width,
    y: ((clientY - rect.top) / rect.height) * canvasEl.height,
  };
}

export function onPointerDownHomography( clientX: number, clientY: number, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  const pos = { x: clientX, y: clientY };
  console.log("onPointerDownHomography", pos);

  // Convert normalized → canvas coords for hit testing
  const handles = getHandlesHomography(
    points.map(([nx, ny]) => [
      nx * canvas.width,
      ny * canvas.height
    ])
  );
  console.log("Handles:", handles);

  const radius = 10;
  draggingIndex.value = handles.findIndex(
    (h) => Math.abs(h.x - pos.x) < radius && Math.abs(h.y - pos.y) < radius
  );
  homographyPointMoving.value = true;
  console.log("onPointerDownHomography", draggingIndex.value);
}

export function onPointerMoveHomography(clientX: number, clientY: number, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  if (draggingIndex.value === null || draggingIndex.value === -1) return;
  if (!homographyPointMoving.value) return
  console.log("onMouseMoveHomography", draggingIndex.value);
  const pos = { x: clientX, y: clientY };
  const nx = pos.x / canvas.width;
  const ny = pos.y / canvas.height;
  points[draggingIndex.value] = [nx, ny];
  console.log("Updated point:", points[draggingIndex.value]);
}
export function onMouseUpHomography() {
  homographyPointMoving.value = false;
  console.log("onMouseUpHomography", draggingIndex.value);
  if (draggingIndex.value === -1) {
  draggingIndex.value = null;
  }
}

export function onMouseDownHomography(evt: MouseEvent, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  console.log("onMouseDownHomography");
  const mousePos = getMousePos(evt, canvas);
  onPointerDownHomography(mousePos.x, mousePos.y, canvas, points);
}

export function onMouseMoveHomography(evt: MouseEvent, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  if (draggingIndex.value !== null && draggingIndex.value !== -1 && homographyPointMoving.value) {
    console.log("onMouseMoveHomography");
    const mousePos = getMousePos(evt, canvas);
    onPointerMoveHomography(mousePos.x, mousePos.y, canvas, points);
    evt.preventDefault();
  }
}


function getClientPos(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if (e instanceof MouseEvent) {
    return { clientX: e.clientX, clientY: e.clientY };
  } else {
    console.log("Touch event", e);
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
  }
}


// --- Wrapper versions for touch, reusing mouse logic ---
export function onTouchStart(e: TouchEvent, canvas: HTMLCanvasElement) {
  console.log("onTouchStart");
  const { clientX, clientY } = getClientPos(e);
  console.log("Touch pos:", clientX, clientY);
  onPointerDown(clientX, clientY, canvas);
  e.preventDefault();
}

export function onTouchMove(e: TouchEvent, canvas: HTMLCanvasElement) {
  console.log("onTouchMove");
  const { clientX, clientY } = getClientPos(e);
  if (dragging.value) {
    onPointerMove(clientX, clientY, canvas);
    e.preventDefault();
  }
}

export function onTouchEnd(e: TouchEvent) {
  if (dragging.value) {
    // dragging.value = null;
    e.preventDefault();
  }
}

export function onTouchStartHomography(e: TouchEvent, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  console.log("onTouchStartHomography");
  const mousePos = getMousePos(e, canvas);
  onPointerDownHomography(mousePos.x, mousePos.y, canvas, points);
  e.preventDefault();
  
}

export function onTouchMoveHomography(e: TouchEvent, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  if (draggingIndex.value !== null && draggingIndex.value !== -1) {
    console.log("onTouchMoveHomography");
    const mousePos = getMousePos(e, canvas);
    onPointerMoveHomography(mousePos.x, mousePos.y, canvas, points);
    e.preventDefault();
  }
}

export function onKeyDownHomography(e: KeyboardEvent, canvas: HTMLCanvasElement, points: number[][] = homographyPoints.value || []) {
  if (draggingIndex.value === null || draggingIndex.value === -1) return;
  const step = e.shiftKey ? 0.01 : 0.001; // Larger step with Shift
  console.log("onKeyDownHomography", e.key, "step:", step);

  switch (e.key) {
    // case "ArrowUp":
    //   points[draggingIndex.value][1] = Math.max(0, points[draggingIndex.value][1] - step);
    //   e.preventDefault();
    //   break;
    // case "ArrowDown":
    //   points[draggingIndex.value][1] = Math.min(1, points[draggingIndex.value][1] + step);
    //   e.preventDefault();
    //   break;
    // case "ArrowLeft":
    //   points[draggingIndex.value][0] = Math.max(0, points[draggingIndex.value][0] - step);
    //   e.preventDefault();
    //   break;
    // case "ArrowRight":
    //   points[draggingIndex.value][0] = Math.min(1, points[draggingIndex.value][0] + step);
    //   e.preventDefault();
    //   break;
    //   // use wasd keys as alternative to arrow keys
    // case "w":
    //   points[draggingIndex.value][1] = Math.max(0, points[draggingIndex.value][1] - step);
    //   e.preventDefault();
    //   break;
    // case "s":
    //   points[draggingIndex.value][1] = Math.min(1, points[draggingIndex.value][1] + step);
    //   e.preventDefault();
    //   break;
    // case "a":
    //   points[draggingIndex.value][0] = Math.max(0, points[draggingIndex.value][0] - step);
    //   e.preventDefault();
    //   break;
    // case "d":
    //   points[draggingIndex.value][0] = Math.min(1, points[draggingIndex.value][0] + step);
    //   e.preventDefault();
    //   break;

    // version using movePoint function
    case "ArrowUp":
    case "w":
      movePoint("up", step, points, draggingIndex.value);
      e.preventDefault();
      break;
    case "ArrowDown":
    case "s":
      movePoint("down", step, points, draggingIndex.value);
      e.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
      movePoint("left", step, points, draggingIndex.value);
      e.preventDefault();
      break;
    case "ArrowRight":
    case "d":
      movePoint("right", step, points, draggingIndex.value);
      e.preventDefault();
      break;
    case "Escape":
      draggingIndex.value = null;
      homographyPointMoving.value = false;
      e.preventDefault();
      break;
  }
}


export function movePoint(direction: "up" | "down" | "left" | "right", step: number = 0.001, points: number[][] = homographyPoints.value || [], index: number | null = draggingIndex.value) {
  if (index === null || index === -1) return;
  console.log("movePoint", direction, "step:", step, "index:", index);
  switch (direction) {
    case "up":
      points[index][1] = Math.max(0, points[index][1] - step);
      break;
    case "down":
      points[index][1] = Math.min(1, points[index][1] + step);
      break;
    case "left":
      points[index][0] = Math.max(0, points[index][0] - step);
      break;
    case "right":
      points[index][0] = Math.min(1, points[index][0] + step);
      break;
  }
}