/**
 * Compress an uploaded image entirely in the browser before we store it.
 *
 * Banners are stored as data URLs in IndexedDB so they survive offline. To keep
 * storage light (per the "lightweight assets" goal) we downscale to a max
 * dimension and re-encode as JPEG at moderate quality. Returns a data URL.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  const { width, height, draw } = await (async () => {
    if (bitmap) {
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx: CanvasRenderingContext2D, w: number, h: number) =>
          ctx.drawImage(bitmap, 0, 0, w, h),
      };
    }
    // Fallback for browsers without createImageBitmap.
    const img = await loadImageElement(file);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) =>
        ctx.drawImage(img, 0, 0, w, h),
    };
  })();

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  draw(ctx, targetW, targetH);

  bitmap?.close?.();

  // PNGs with transparency lose it as JPEG; that's fine for a banner backdrop.
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image."));
    };
    img.src = url;
  });
}
