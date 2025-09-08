<script setup lang="ts">
import { onMounted, watch, nextTick, ref } from "vue";
import { clients, images, loading, fetchData, selectedClient, 
  setSelectedClient, updateClientConfig, sliceImagesForClients,
  startPresentationModeForAllClients,
  showNextImageForAllClients,
  showPreviousImageForAllClients,
  stopPresentationModeForAllClients,
  pushAllConfigsToClients
 } from "@/composables/useClients";
import { populateRects, rects } from "@/composables/useRects";
import { previewCanvas, selectedImage, setSelectedImage, drawCanvas } from "@/composables/useCanvas";
import { onMouseDown, onMouseMove, onMouseUp } from "@/composables/useMouseHandlers";
import type { Assignment, Client, ClientConfig } from "@/types/projection";


function handleClientClick(client: Client) {
  setSelectedClient(client);
  drawCanvas(clients.value);
}

function saveClientConfig(client: Client) {
  if (typeof client === 'string') return; // Can't save config for string clients
  let currentConfig: ClientConfig = client.config!
  let newAssigments: Assignment[] = rects.value.map(r => ({
    display_output: r.display_output,
    rect: r.rect
  }));
  let newConfig: ClientConfig = { ...currentConfig, assignments: newAssigments, client_canvas_size: { width: previewCanvas.value?.width || 400, height: previewCanvas.value?.height || 300 } };
  updateClientConfig(client, newConfig);
}

onMounted(() => {
  fetchData(populateRects, setSelectedImage);
});

watch(selectedImage, (newImage) => drawCanvas(clients.value, newImage));
watch(selectedClient, () => drawCanvas(clients.value));
watch(loading, async (newVal) => {
  await nextTick();
  if (!newVal && previewCanvas.value) {
    const canvas = previewCanvas.value;
    canvas.addEventListener("mousedown", (e) => onMouseDown(e, canvas));
    canvas.addEventListener("mousemove", (e) => onMouseMove(e, canvas, clients.value));
    canvas.addEventListener("mouseup", onMouseUp);
    drawCanvas(clients.value);
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
        <button v-if="selectedClient" @click="selectedClient = null; drawCanvas(clients)"
          class="mb-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"> Unselect Client </button>
        <!-- button to slice images for clients -->
        <button @click="sliceImagesForClients()"
          class="mb-2 ml-2 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"> Slice images </button>
        <!-- push config to clients -->
        <button @click="pushAllConfigsToClients(clients)"
          class="mb-2 ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"> Push all configs </button>
        <!-- send command to start presentation mode -->
        <button @click="startPresentationModeForAllClients()"
          class="mb-2 ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"> Start Presentation</button>
        <!-- send command to stop presentation mode -->
        <button @click="stopPresentationModeForAllClients()"
          class="mb-2 ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"> Stop Presentation</button>
        <!-- send command to show previous image -->
        <button @click="showPreviousImageForAllClients()"
          class="mb-2 ml-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"> Previous Image</button>
        <!-- send command to show next image -->
        <button @click="showNextImageForAllClients()"
          class="mb-2 ml-2 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"> Next Image</button>
  
          <ul class="space-y-2">
          <li v-for="client in clients" :key="client.client_id" class="p-3 rounded shadow"
            :class="{
              'bg-blue-100 cursor-pointer': selectedClient && ((typeof client === 'string' && client === selectedClient) || (typeof client !== 'string' && selectedClient && client.client_id === selectedClient.client_id)),
              'hover:bg-gray-100 cursor-pointer': !selectedClient || (typeof client !== 'string' && (!selectedClient || client.client_id !== selectedClient.client_id))
            }"
            @click="handleClientClick(client)">
            <div class="font-medium">{{ client.client_id || client }}</div>
            <div class="text-sm text-gray-600" v-if="client.config"> Config: {{ client.config }} </div>
            <!-- save config button below-->
            <button v-if="typeof client !== 'string'" @click.stop="saveClientConfig(client)"
              class="mt-2 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"> Save Config </button>
             
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
