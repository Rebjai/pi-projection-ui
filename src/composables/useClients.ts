import { ref } from "vue";
import type { Client, ClientConfig, DisplayConfig } from "@/types/projection";
import { homographyPoints, previewCanvas } from "./useCanvas";

export const clients = ref<Client[]>([]);
export const images = ref<{ uploads: string[] }>({ uploads: [] });
export const loading = ref(true);
export const selectedClient = ref<Client | null>(null);
export const selectedDisplay = ref<DisplayConfig | null>(null);
export const isCalibrationMode = ref(false);

export function setSelectedClient(client: Client) {
  selectedClient.value = client;
}

export async function fetchData(populateRects: () => void, setSelectedImage: (img: string) => void) {
  try {
    const [clientsRes, uploadsRes] = await Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/clients`),
      fetch(`${import.meta.env.VITE_API_URL}/uploads`)
    ]);

    clients.value = (await clientsRes.json()).connected!;
    images.value = await uploadsRes.json();

    if (images.value.uploads.length > 0) {
      setSelectedImage(images.value.uploads[0]);
    }

    populateRects();
  } catch (err) {
    console.error("Error fetching data", err);
  } finally {
    loading.value = false;
  }
}

export async function updateClientConfig(client: Client, newConfig: ClientConfig) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/config/${client.client_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });

    if (!res.ok) {
      throw new Error(`Failed to update config: ${res.statusText}`);
    }

    const updatedConfig = await res.json();
    client.config = updatedConfig.config;
  } catch (err) {
    console.error("Error updating client config", err);
  }
}

export async function sliceImagesForClients() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/slice_all`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to slice images: ${res.statusText}`);
    }

  } catch (err) {
    console.error("Error slicing images", err);
  }
}

export async function startPresentationModeForAllClients() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/start_presentation`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to start presentation mode: ${res.statusText}`);
    }

  } catch (err) {
    console.error("Error starting presentation mode", err);
  }
}

export async function stopPresentationModeForAllClients() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/stop_presentation`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to stop presentation mode: ${res.statusText}`);
    }

  } catch (err) {
    console.error("Error stopping presentation mode", err);
  }
}

export async function showNextImageForAllClients() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/presentation/next`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to show next image: ${res.statusText}`);
    }
  } catch (err) {
    console.error("Error showing next image", err);
  }
}

export async function showPreviousImageForAllClients() {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/presentation/prev`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`Failed to show previous image: ${res.statusText}`);
    }
  } catch (err) {
    console.error("Error showing previous image", err);
  }
}


export async function pushAllConfigsToClients(clients: Client[]) {
  try {
    let configs = clients.map((client) => client.config);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/configs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configs }),
    });

    if (!res.ok) {
      throw new Error(`Failed to push configs: ${res.statusText}`);
    }
  } catch (err) {
    console.error("Error pushing configs to clients", err);
  }
}

export async function setHomographyForClientDisplay(client: Client, display: DisplayConfig, points: number[][] = homographyPoints.value || []) {
  try {
    if (!client.config) {
      throw new Error("Client config is undefined");
    }
    let currentConfig = client.config;
    if (!currentConfig) return;
    let newHomographies = { ...currentConfig.homographies, [display.name]: { matrix: points } }
    let newConfig = { ...currentConfig, homographies: newHomographies };
    await updateClientConfig(client, newConfig);
  } catch (err) {
    console.error("Error setting homography for client display", err);
  }
}

export async function saveClientConfig(client: Client) {
  try {
    if (!client.config) {
      throw new Error("Client config is undefined");
    }
    let currentConfig = client.config;
    await updateClientConfig(client, currentConfig);
  } catch (err) {
    console.error("Error saving client config", err);
  }
}

export function resetClientConfig(client: Client) {
      // example client config
        // " {
        //     "client_id": "pi-01",
        //     "config": {
        //         "assignments": [
        //             {
        //                 "display_output": "card1-DP-2",
        //                 "rect": {
        //                     "h": 83,
        //                     "w": 496,
        //                     "x": 853.8333339691162,
        //                     "y": 16.013885498046875
        //                 }
        //             }
        //         ],
        //         "client_canvas_size": {
        //             "height": 1367,
        //             "width": 1367
        //         },
        //         "client_id": "pi-01",
        //         "displays": [
        //             {
        //                 "active": true,
        //                 "name": "card1-DP-2",
        //                 "resolution": {
        //                     "height": 1440,
        //                     "width": 2560
        //                 },
        //                 "status": "connected"
        //             }
        //         ],
        //         "homographies": {
        //             "card1-DP-2": {
        //                 "matrix": [
        //                     [
        //                         0.3635831750541259,
        //                         0.17705501044122854
        //                     ],
        //                     [
        //                         0.7709439058282997,
        //                         0.10253079110435967
        //                     ],
        //                     [
        //                         0.7782326664186925,
        //                         0.8002758705145345
        //                     ],
        //                     [
        //                         0.379268278858621,
        //                         0.7869399019440089
        //                     ]
        //                 ]
        //             }
        //         },
        //         "is_connected": true,
        //         "last_seen": 1758095401,
        //         "server_url": "http://127.0.0.1:5000"
        //     }
        // },
  try {
    if (!client.config) {
      throw new Error("Client config is undefined");
    }
    // Reset to default values conserving client_id, reseting homographies and assignments to empty
    const newConfig: ClientConfig = {
      client_id: client.client_id,
      homographies: {},
      assignments: [],
      displays: client.config.displays || [],
      client_canvas_size: { width: previewCanvas.value!.width, height: previewCanvas.value!.height },
      last_seen: client.config.last_seen,
      is_connected: client.config.is_connected,
    };
    updateClientConfig(client, newConfig);
  } catch (err) {
    console.error("Error resetting client config", err);
  }
}

export async function enterCalibrationMode( client: Client = selectedClient.value!, display: DisplayConfig = selectedDisplay.value!) {
  if (!client || !display) return;
  isCalibrationMode.value = true;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/calibrate/${client.client_id}/${display.name}`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to enter calibration mode: ${res.statusText}`);
    }

  } catch (err) {
    console.error("Error entering calibration mode", err);
  }
}

export async function exitCalibrationMode( client: Client = selectedClient.value!, display: DisplayConfig = selectedDisplay.value!) {
  if (!client) return;
  isCalibrationMode.value = false;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/calibrate/${client.client_id}/${display.name}/exit`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`Failed to exit calibration mode: ${res.statusText}`);
    }

  } catch (err) {
    console.error("Error exiting calibration mode", err);
  }
}