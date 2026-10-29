import { mkdir, readFile, rm, unlink, writeFile } from "fs/promises";
import { basename, join } from "path";

export interface OrderPhotoMetadata {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  type: string;
  caption: string;
  timestamp: string;
  status: string;
}

export const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Photos live outside public/: Next only serves files that were in public/ at build time,
 * and anything there is readable without signing in. Set ORDER_PHOTOS_DIR to a persistent
 * volume in production.
 */
function photosDir(orderId: string): string {
  const root = process.env.ORDER_PHOTOS_DIR || join(process.cwd(), "storage", "order-photos");
  return join(root, basename(orderId));
}

const metadataPath = (orderId: string) => join(photosDir(orderId), "photos.json");

// Serialises read-modify-write of one order's metadata within this server process
const locks = new Map<string, Promise<unknown>>();
function withOrderLock<T>(orderId: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(orderId) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(fn);
  locks.set(orderId, next);
  next.finally(() => {
    if (locks.get(orderId) === next) locks.delete(orderId);
  }).catch(() => {});
  return next;
}

export async function listOrderPhotos(orderId: string): Promise<OrderPhotoMetadata[]> {
  try {
    const parsed = JSON.parse(await readFile(metadataPath(orderId), "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMetadata(orderId: string, photos: OrderPhotoMetadata[]) {
  await writeFile(metadataPath(orderId), JSON.stringify(photos, null, 2), "utf-8");
}

export function addOrderPhoto(
  orderId: string,
  data: Buffer,
  extension: string,
  details: { type: string; caption: string; status: string }
): Promise<OrderPhotoMetadata> {
  return withOrderLock(orderId, async () => {
    await mkdir(photosDir(orderId), { recursive: true });
    const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const filename = `${id}.${extension}`;
    await writeFile(join(photosDir(orderId), filename), data);

    const photo: OrderPhotoMetadata = {
      id,
      url: `/api/orders/${encodeURIComponent(orderId)}/photos/${id}`,
      filename,
      contentType: ALLOWED_PHOTO_TYPES[extension],
      type: details.type,
      caption: details.caption,
      timestamp: new Date().toISOString(),
      status: details.status,
    };
    const photos = await listOrderPhotos(orderId);
    photos.push(photo);
    await saveMetadata(orderId, photos);
    return photo;
  });
}

/** Returns false when the photo does not exist */
export function deleteOrderPhoto(orderId: string, photoId: string): Promise<boolean> {
  return withOrderLock(orderId, async () => {
    const photos = await listOrderPhotos(orderId);
    const target = photos.find((p) => p.id === photoId);
    if (!target) return false;
    await saveMetadata(orderId, photos.filter((p) => p.id !== photoId));
    await unlink(join(photosDir(orderId), basename(target.filename))).catch(() => {});
    return true;
  });
}

/** Removes every photo of an order (used when the business deletes its account) */
export async function deleteAllOrderPhotos(orderId: string): Promise<void> {
  await rm(photosDir(orderId), { recursive: true, force: true });
}

export async function readOrderPhoto(
  orderId: string,
  photoId: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const target = (await listOrderPhotos(orderId)).find((p) => p.id === photoId);
  if (!target) return null;
  try {
    const data = await readFile(join(photosDir(orderId), basename(target.filename)));
    return { data, contentType: target.contentType || "application/octet-stream" };
  } catch {
    return null;
  }
}
