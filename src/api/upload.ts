import { BASE_URL } from './client';

export interface UploadImageResponse {
  url: string;
  storageKey: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function uploadImageApi(file: File): Promise<UploadImageResponse> {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
    }
  } catch (err) {
    console.warn('Backend image upload endpoint unavailable, falling back to local file reader:', err);
  }

  // Fallback to data URL preview if backend upload endpoint is unreachable or returns error
  const dataUrl = await readFileAsDataUrl(file);
  return {
    url: dataUrl,
    storageKey: `local_${Date.now()}_${file.name}`,
  };
}

