/**
 * Server-side validation for uploaded 3D model files (GLB/GLTF) and images.
 * Never trust client-side checks: enforce both MIME type and extension, and
 * enforce size limits in bytes.
 */

export const MODEL_UPLOAD_MAX_BYTES = Number(process.env.MODEL_UPLOAD_MAX_BYTES ?? 25 * 1024 * 1024);
export const IMAGE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const MODEL_MIME_TYPES = new Set(["model/gltf-binary", "model/gltf+json", "application/octet-stream"]);
const MODEL_EXTENSIONS = new Set([".glb", ".gltf"]);
const MODEL_EXTENSION_BY_MIME: Record<string, string> = {
  "model/gltf-binary": ".glb",
  "model/gltf+json": ".gltf",
};

export interface ModelUploadInput {
  name: string;
  size: number;
  type: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fileName?: string;
}

export function validateModelUpload(file: ModelUploadInput): ValidationResult {
  const errors: string[] = [];

  if (!file.name) errors.push("File name is required");
  if (!Number.isFinite(file.size) || file.size <= 0) errors.push("File is empty");
  if (file.size > MODEL_UPLOAD_MAX_BYTES) {
    errors.push(`Model exceeds the maximum size of ${Math.round(MODEL_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`);
  }

  const lower = file.name.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));
  if (!MODEL_EXTENSIONS.has(ext)) {
    errors.push("Only GLB and GLTF model files are supported");
  }

  // MIME must either be a known model type or an octet-stream with a valid ext.
  if (file.type && !MODEL_MIME_TYPES.has(file.type)) {
    errors.push("File type is not a supported 3D model format");
  }
  if (file.type && MODEL_EXTENSION_BY_MIME[file.type] && MODEL_EXTENSION_BY_MIME[file.type] !== ext) {
    errors.push("File extension does not match its declared type");
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors, fileName: file.name };
}

export interface ImageUploadInput {
  name: string;
  size: number;
  type: string;
}

export function validateImageUpload(file: ImageUploadInput): ValidationResult {
  const errors: string[] = [];
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
  const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

  const lower = file.name.toLowerCase();
  const ext = lower.slice(lower.lastIndexOf("."));

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) errors.push("Image exceeds the maximum size of 8 MB");
  if (!allowed.has(file.type)) errors.push("Only JPEG, PNG, WebP or AVIF images are supported");
  if (!allowedExt.has(ext)) errors.push("Unsupported image extension");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors, fileName: file.name };
}
