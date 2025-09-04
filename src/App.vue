<script setup lang="ts">
import { onMounted, watch, nextTick, ref } from "vue";
import { clients, images, loading, fetchData, selectedClient, setSelectedClient } from "@/composables/useClients";
import { populateRects } from "@/composables/useRects";
import { previewCanvas, selectedImage, setSelectedImage, drawCanvas } from "@/composables/useCanvas";
import { onMouseDown, onMouseMove, onMouseUp } from "@/composables/useMouseHandlers";
import type { Client } from "@/types/projection";


function handleClientClick(client: Client) {
  setSelectedClient(client);
  drawCanvas();
}

onMounted(() => {
  fetchData(populateRects, setSelectedImage);
});

watch(selectedImage, (newImage) => drawCanvas(newImage));
watch(selectedClient, () => drawCanvas());
watch(loading, async (newVal) => {
  await nextTick();
  if (!newVal && previewCanvas.value) {
    const canvas = previewCanvas.value;
    canvas.addEventListener("mousedown", (e) => onMouseDown(e, canvas));
    canvas.addEventListener("mousemove", (e) => onMouseMove(e, canvas));
    canvas.addEventListener("mouseup", onMouseUp);
    drawCanvas();
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
        <button v-if="selectedClient" @click="selectedClient = null; drawCanvas();"
          class="mb-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"> Unselect Client </button>
        <ul class="space-y-2">
          <li v-for="client in clients" :key="client.client_id" class="p-3 rounded shadow"
            :class="{
              'bg-blue-100 cursor-pointer': selectedClient && ((typeof client === 'string' && client === selectedClient) || (typeof client !== 'string' && selectedClient && client.client_id === selectedClient.client_id)),
              'hover:bg-gray-100 cursor-pointer': !selectedClient || (typeof client !== 'string' && (!selectedClient || client.client_id !== selectedClient.client_id))
            }"
            @click="handleClientClick(client)">
            <div class="font-medium">{{ client.client_id || client }}</div>
            <div class="text-sm text-gray-600" v-if="client.config"> Config: {{ client.config }} </div>
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
