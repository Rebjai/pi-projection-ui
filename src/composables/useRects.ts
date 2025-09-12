import { ref } from "vue";
import type { Rect, RectConfig, DisplayConfig, Client } from "@/types/projection";
import { clients, selectedClient } from "./useClients";

export const rects = ref<RectConfig[]>([]);

export function populateRects() {
  clients.value.forEach((client, index) => {
    if (!client.config?.assignments?.length) {
      pushRectsFromDisplayConfig(client, index);
      // let mock5displays: DisplayConfig[] = [];
      // for (let i = 0; i < 5; i++) {
      //   mock5displays.push({
      //     name: `Display ${i + 1}`,
      //     resolution: { width: 800, height: 600 },
      //     status: "active",
      //   });
      // }
      // client.config = {
      //   ...client.config!,
      //   displays: mock5displays,
      //   assignments: [],
      // };
      // pushRectsFromDisplayConfig(client, index);
    }
    if (!client.config?.assignments) return;
    client.config.assignments.forEach((assignment) => {
      rects.value.push({
        id: `${client.client_id}-${assignment.display_output}`,
        client_id: client.client_id,
        display_output: assignment.display_output,
        rect: assignment.rect,
      });
    });
  });
}

function pushRectsFromDisplayConfig(client: Client, clientIndex: number) {
  if (!client.config?.displays) return;
  const displays = client.config.displays;
  displays.forEach((display, displayIndex) => {
    if (!display.resolution || display.resolution.width <= 0 || display.resolution.height <= 0) {
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
    client.config!.assignments = client.config!.assignments || [];
    client.config!.assignments.push({
      display_output: display.name,
      rect: defaultRect,
    });
  });
}

export function isRectFromSelectedClient(rect?: RectConfig) {
  if (!selectedClient.value) return false;
  if (!rect) return false;
  return rect.client_id === selectedClient.value.client_id;
}

export function getRectsForSelectedClient() {
  if (!selectedClient.value) return [];
  return rects.value.filter((r) => r.client_id === selectedClient.value?.client_id);
}

export function updateRect(updatedRect: RectConfig) {
  const index = rects.value.findIndex((r) => r.id === updatedRect.id);
  if (index !== -1) {
    rects.value[index] = { ...updatedRect };
  }
}

export function deleteRect(rectId: string) {
  const index = rects.value.findIndex((r) => r.id === rectId);
  if (index !== -1) {
    rects.value.splice(index, 1);
  }
}