<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Assignment {
  display_output: string;
  rect: Rect;
}

interface DisplayConfig {
  name: string;
  resolution: { width: number; height: number };
  status: string;
}

interface Homography {
  matrix: number[][];
}

interface ClientConfig {
  client_id: string;
  assignments: Assignment[];
  displays: DisplayConfig[];
  homographies: { [key: string]: Homography };
  last_seen: string;
  is_connected: boolean;
}

interface Client {
  client_id: string;
  config?: ClientConfig;
}

const clients = ref<Client[]>([]);
const images = ref({ uploads: [] });
const loading = ref(true);
const selectedImage = ref<string | null>(null);
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const selectedClient = ref<Client | null>(null);

const rects = ref<Rect[]>([]);
const dragging = ref<{
  rectIndex: number;
  corner: string;
  offsetX?: number;
  offsetY?: number;
} | null>(null);


async function fetchData() {
  try {
    const [clientsRes, uploadsRes] = await Promise.all([
      fetch("http://localhost:5000/clients"),
      fetch("http://localhost:5000/uploads"),
    ]);
    clients.value = (await clientsRes.json()).connected!;
    console.log("Fetched clients", clients.value);

    images.value = await uploadsRes.json();
    if (images.value.uploads.length > 0) {
      console.log("Setting selected image to", images.value.uploads[0]);

      selectedImage.value = images.value.uploads[0];
    }
    populateRects();
    console.log("Fetched clients and images", clients.value, images.value);
  } catch (err) {
    console.error("Error fetching data", err);
  } finally {
    loading.value = false;
  }
}

function populateRects() {
  clients.value.forEach((client, index) => {
      if (!client.config) {
        console.warn("Client has no config", client);
      }
      if (!client.config!.assignments) {
        console.warn("Client config has no assignments", client.config);
      }
      console.log("Client config assignments", client.config?.assignments);
      if (!client.config?.assignments.length) {
        console.warn("No assignments for client", client.client_id);
        pushRectsFromDisplayConfig(client.config?.displays || [], index);
        // let mock5displays: DisplayConfig[] = [];
        // for (let i = 0; i < 5; i++) {
        //   mock5displays.push({
        //     name: `Display ${i + 1}`,
        //     resolution: { width: 800, height: 600 },
        //     status: "active",
        //   });
        // }
        // pushRectsFromDisplayConfig(mock5displays, index);
        console.log("Rects after pushing from display config", rects.value);
        
        return ;
      }
      client.config!.assignments.forEach((assignment) => {
        rects.value.push({ ...assignment.rect });
      });
    });
}

function pushRectsFromDisplayConfig(displays: DisplayConfig[], clientIndex: number) {
  displays.forEach((display, displayIndex) => {
    console.log("Pushing rect for display", display);

    if (!display.resolution || display.resolution.width <= 0 || display.resolution.height <= 0 || isNaN(display.resolution.width) || isNaN(display.resolution.height)) {
      console.warn("Invalid resolution for display", display, "defaulting to 800x600");
      display.resolution = { width: 800, height: 600 };
    }
    
    const aspectRatio = display.resolution.width / display.resolution.height;
    let w = 150;
    let h = w / aspectRatio;
    const defaultRect: Rect = {
      x: 20 + displayIndex * 30 + clientIndex * 10,
      y: 20 + displayIndex * 30 + clientIndex * 10,
      w,
      h,
    };
    rects.value.push(defaultRect);
    console.log(`Pushed rect for display ${display.name} of client ${clientIndex}`, defaultRect);
  });
}

function getHandles(rect: Rect) {
  return [
    { corner: "tl", x: rect.x, y: rect.y },
    { corner: "tr", x: rect.x + rect.w, y: rect.y },
    { corner: "bl", x: rect.x, y: rect.y + rect.h },
    { corner: "br", x: rect.x + rect.w, y: rect.y + rect.h },
  ];
}

// Mouse handling
function onMouseDown(e: MouseEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let i = rects.value.length - 1; i >= 0; i--) {
    const r = rects.value[i];
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

function onMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
  if (!dragging.value) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const r = rects.value[dragging.value.rectIndex];

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


function onMouseUp() {
  dragging.value = null;
}

onMounted(() => {
  fetchData();
});

function drawCanvas(newImage = selectedImage.value) {
  console.log("Drawing canvas with image", newImage);

  if (!newImage || !previewCanvas.value) return;

  const canvas = previewCanvas.value;
  console.log();

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
      ctx.strokeStyle = "lime";
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

// Draw image in canvas whenever selectedImage changes
watch(selectedImage, (newImage) => {
  console.log("Selected image changed to", newImage);

  drawCanvas(newImage);
});

watch(loading, async (newVal) => {
  await nextTick();
  if (newVal === false && previewCanvas.value) {
    const canvas = previewCanvas.value;
    console.log("Canvas ready", canvas);

    canvas.addEventListener("mousedown", (e) => onMouseDown(e, canvas));
    canvas.addEventListener("mousemove", (e) => onMouseMove(e, canvas));
    canvas.addEventListener("mouseup", onMouseUp);
  }
});


</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Projection Mapping Dashboard</h1>

    <div v-if="loading" class="text-gray-500">Loading...</div>

    <div v-else class="grid grid-cols-2 gap-6">
      <!-- Clients -->
      <div class="col-span-2 md:col-span-1">
        <h2 class="text-xl font-semibold mb-2">Connected Clients</h2>
        <ul class="space-y-2">
          <li v-for="client in clients" :key="client.client_id" class="p-3 bg-green-100 rounded shadow">
            <div class="font-medium">{{ client.client_id || client }}</div>
            <div class="text-sm text-gray-600" v-if="client.config">
              Config: {{ client.config }}
            </div>
          </li>
        </ul>
      </div>

      <!-- Images -->
      <div class="col-span-2 md:col-span-1">
        <h2 class="text-xl font-semibold mb-2">Uploaded Images</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-3">
            <select v-model="selectedImage" class="w-full p-2 border border-gray-300 rounded">
              <option v-for="img in images.uploads" :key="img" :value="img">
                {{ img }}
              </option>
            </select>
          </div>

          <!-- Thumbnail of selected image -->
          <div v-if="selectedImage" class="col-span-3 flex justify-center"> <img
              :src="`http://localhost:5000/uploads/${selectedImage}`" alt="Thumbnail"
              class="w-full h-26 object-contain rounded shadow" />
          </div>
        </div>
      </div>

      <!-- Projection Preview -->
      <div class="col-span-2 flex flex-col items-center">
        <h2 class="text-xl font-semibold mb-2">Projection Preview</h2>
        <canvas ref="previewCanvas" width="400" height="300" class="border border-gray-300 rounded"></canvas>
      </div>
    </div>
  </div>
</template>
