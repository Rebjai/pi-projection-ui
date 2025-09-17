import { ref } from "vue";
import type { Client, ClientConfig } from "@/types/projection";

export const clients = ref<Client[]>([]);
export const images = ref<{ uploads: string[] }>({ uploads: [] });
export const loading = ref(true);
export const selectedClient = ref<Client | null>(null);

export function setSelectedClient(client: Client) {
  selectedClient.value = client;
}

export async function fetchData(populateRects: () => void, setSelectedImage: (img: string) => void) {
  try {
    const [clientsRes, uploadsRes] = await Promise.all([
      fetch("http://localhost:5000/clients"),
      fetch("http://localhost:5000/uploads"),
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
    const res = await fetch(`http://localhost:5000/config/${client.client_id}`, {
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
    const res = await fetch(`http://localhost:5000/slice_all`, {
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
    const res = await fetch(`http://localhost:5000/start_presentation`, {
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
    const res = await fetch(`http://localhost:5000/stop_presentation`, {
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
    const res = await fetch(`http://localhost:5000/presentation/next`, {
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
    const res = await fetch(`http://localhost:5000/presentation/prev`, {
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
    const res = await fetch(`http://localhost:5000/configs`, {
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

export async function setHomographyForClientDisplay(client: Client, displayName: string, points: [number, number][]) {
  try {
    if (!client.config) {
      throw new Error("Client config is undefined");
    }
    let currentConfig = client.config;
    if (!currentConfig) return;
    let newHomographies = { ...currentConfig.homographies, [displayName]: { matrix: points } }
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