<script setup>
import { ref, onMounted, watch } from "vue";

const clients = ref({ connected: [] });
const images = ref({ uploads: [] });
const loading = ref(true);
const selectedImage = ref(null);
const previewCanvas = ref(null);


async function fetchData() {
  try {
    const [clientsRes, uploadsRes] = await Promise.all([
      fetch("http://localhost:5000/clients"),
      fetch("http://localhost:5000/uploads"),
    ]);
    clients.value = await clientsRes.json();
    images.value = await uploadsRes.json();
    if (images.value.uploads.length > 0) {
      console.log("Setting selected image to", images.value.uploads[0]);
      
      selectedImage.value = images.value.uploads[0];
    }
    console.log("Fetched clients and images", clients.value, images.value);
  } catch (err) {
    console.error("Error fetching data", err);
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

function drawCanvas(newImage) {
  if (!newImage || !previewCanvas.value) return;

  const canvas = previewCanvas.value;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.src = `http://localhost:5000/uploads/${newImage}`;

  img.onload = () => {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling ratio to preserve aspect ratio
    const scale = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    );

    // Calculate position to center the image
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;

    // Draw image with scaling
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      x,
      y,
      img.width * scale,
      img.height * scale
    );
  };
  img.onerror = (err) => {
    console.error("Error loading image", err);
  };
}

// Draw image in canvas whenever selectedImage changes
watch(selectedImage, (newImage) => {
  drawCanvas(newImage);
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
          <li
            v-for="client in clients.connected"
            :key="client.id || client"
            class="p-3 bg-green-100 rounded shadow"
          >
            <div class="font-medium">{{ client.name || client }}</div>
            <div class="text-sm text-gray-500">{{ client.status || 'Connected' }}</div>
          </li>
        </ul>
      </div>

      <!-- Images -->
      <div class="col-span-2 md:col-span-1">
        <h2 class="text-xl font-semibold mb-2">Uploaded Images</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-3">
            <select
              v-model="selectedImage"
              class="w-full p-2 border border-gray-300 rounded"
            >
              <option
                v-for="img in images.uploads"
                :key="img"
                :value="img"
              >
                {{ img }}
              </option>
            </select>
          </div>

          <!-- Thumbnail of selected image -->
          <div v-if="selectedImage" class="col-span-3 flex justify-center">            <img
              :src="`http://localhost:5000/uploads/${selectedImage}`"
              alt="Thumbnail"
              class="w-full h-26 object-contain rounded shadow"
            />
          </div>
        </div>
      </div>

      <!-- Projection Preview -->
      <div class="col-span-2 flex flex-col items-center">
        <h2 class="text-xl font-semibold mb-2">Projection Preview</h2>
        <canvas
          ref="previewCanvas"
          width="400"
          height="300"
          class="border border-gray-300 rounded"
        ></canvas>
      </div>
    </div>
  </div>
</template>
