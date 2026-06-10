export type BlobUrlDataUrl = {
  mimeType: string;
  dataUrl: string;
};

/** Fetch a blob/object URL and return a base64 data URL for JSON export. */
export async function blobUrlToDataUrl(src: string): Promise<BlobUrlDataUrl> {
  const response = await fetch(src);
  const blob = await response.blob();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  return {
    mimeType: blob.type || "application/octet-stream",
    dataUrl,
  };
}
