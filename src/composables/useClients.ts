import { ref } from "vue";
import type { Client } from "@/types/projection";

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
