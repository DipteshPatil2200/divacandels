import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { AppError } from "../utils/http.js";

export type StoredImage = { imageUrl: string; cloudinaryPublicId: string | null };

const signatures = {
  jpeg: (buffer: Buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  png: (buffer: Buffer) => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (buffer: Buffer) => buffer.length > 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
};

function extensionFor(file: Express.Multer.File) {
  if (signatures.jpeg(file.buffer)) return "jpg";
  if (signatures.png(file.buffer)) return "png";
  if (signatures.webp(file.buffer)) return "webp";
  throw new AppError(422, "Only genuine JPG, PNG and WebP images are allowed", "INVALID_IMAGE");
}

function configureCloudinary() {
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
}

async function storeImage(file: Express.Multer.File, folder: "products" | "team"): Promise<StoredImage> {
  const extension = extensionFor(file);
  if (env.IMAGE_PROVIDER === "cloudinary") {
    configureCloudinary();
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: `diva-candles/${folder}`, resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] }, (error, uploaded) => error || !uploaded ? reject(error ?? new Error("Cloudinary upload failed")) : resolve(uploaded));
      stream.end(file.buffer);
    });
    return { imageUrl: result.secure_url, cloudinaryPublicId: result.public_id };
  }

  const uploadDirectory = path.resolve("uploads", folder);
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: "wx" });
  // Store a deployment-independent path. The frontend resolves it against its API origin.
  return { imageUrl: `/uploads/${folder}/${filename}`, cloudinaryPublicId: null };
}

export const storeProductImage = (file: Express.Multer.File) => storeImage(file, "products");
export const storeTeamImage = (file: Express.Multer.File) => storeImage(file, "team");

export async function deleteStoredImage(image: StoredImage): Promise<void> {
  if (image.cloudinaryPublicId) {
    configureCloudinary();
    await cloudinary.uploader.destroy(image.cloudinaryPublicId, { resource_type: "image", invalidate: true });
    return;
  }
  let pathname: string;
  try { pathname = new URL(image.imageUrl, "http://local").pathname; } catch { return; }
  const match = pathname.match(/^\/uploads\/(products|team)\/([a-f0-9-]+\.(?:jpg|png|webp))$/i);
  if (!match) return;
  const folder = match[1]!;
  const filename = match[2]!;
  if (!/^[a-f0-9-]+\.(?:jpg|png|webp)$/i.test(filename)) return;
  try { await unlink(path.resolve("uploads", folder, filename)); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
