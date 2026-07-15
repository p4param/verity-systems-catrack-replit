/**
 * VS05F2 — StorageProvider Abstraction
 *
 * Architecture:
 *   IStorageProvider  — contract every backend must implement
 *   StorageProfile    — named bucket/container policy (e.g. "INCIDENT_ATTACHMENTS")
 *   StorageTarget     — resolved physical destination (Azure, S3, MinIO, Local, etc.)
 *
 * Controls never reference Azure/S3/MinIO directly.
 * They call `provider.upload(file, profile, onProgress)`.
 * The administrator maps profiles to physical targets in Platform Settings.
 *
 * Injection: The active provider is read from RuntimeContext.services.storage.
 * Future: VS06+ will expose a StorageService singleton behind the context.
 */

// ─── Storage Result ───────────────────────────────────────────────────────────

export interface StorageUploadResult {
  fileId: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// ─── Storage Profile ──────────────────────────────────────────────────────────
//
// Named storage policy. Administrator maps each profile to a StorageTarget.
// Example profiles: INCIDENT_ATTACHMENTS, EMPLOYEE_PHOTOS, INVOICE_DOCUMENTS
//
export interface StorageProfile {
  code: string;           // e.g. "INCIDENT_ATTACHMENTS"
  label: string;          // e.g. "Incident Attachments"
  targetId: string;       // references a StorageTarget
  allowedMimeTypes?: string[];
  maxFileSizeMB?: number;
  retentionDays?: number;
}

// ─── Storage Target ───────────────────────────────────────────────────────────
//
// Physical backend. Configured by administrator. Controls never reference this directly.
// Supported providers: local | azure | s3 | minio | gcs
//
export type StorageProviderType = "local" | "azure" | "s3" | "minio" | "gcs";

export interface StorageTarget {
  id: string;
  name: string;
  providerType: StorageProviderType;
  config: Record<string, unknown>;  // provider-specific (connection string, bucket name, etc.)
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface IStorageProvider {
  /** Upload a file. `profile` is the logical storage profile code (e.g. "INCIDENT_ATTACHMENTS"). */
  upload(
    file: File,
    profile: string,
    onProgress: (percent: number) => void
  ): Promise<StorageUploadResult>;

  /** Delete a previously uploaded file by its fileId. */
  delete(fileId: string, profile: string): Promise<void>;

  /** Get a pre-signed / public URL for an uploaded file. */
  getUrl(fileId: string, profile: string): Promise<string>;
}

// ─── Local Storage Provider ───────────────────────────────────────────────────
//
// Default implementation for VS05F2.
// Posts to /api/platform/storage/upload.
// In future milestones, swap this with AzureBlobProvider, S3Provider, etc.
// Zero control changes required — controls use IStorageProvider interface only.
//
export class LocalStorageProvider implements IStorageProvider {
  async upload(
    file: File,
    profile: string,
    onProgress: (percent: number) => void
  ): Promise<StorageUploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("profile", profile);

    // Use XMLHttpRequest for real progress events
    return new Promise<StorageUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as StorageUploadResult);
          } catch {
            reject(new Error("Invalid response from storage endpoint"));
          }
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Upload network error"));

      xhr.open("POST", "/api/platform/storage/upload");
      xhr.send(formData);
    });
  }

  async delete(fileId: string, profile: string): Promise<void> {
    const res = await fetch(`/api/platform/storage/${fileId}?profile=${encodeURIComponent(profile)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`Delete failed: HTTP ${res.status}`);
  }

  async getUrl(fileId: string, profile: string): Promise<string> {
    const res = await fetch(`/api/platform/storage/${fileId}/url?profile=${encodeURIComponent(profile)}`);
    if (!res.ok) throw new Error(`GetUrl failed: HTTP ${res.status}`);
    const data = await res.json();
    return data.url as string;
  }
}

// ─── Default Provider Instance ────────────────────────────────────────────────
//
// Used by FileUpload/ImageUpload controls when no provider is injected
// via RuntimeContext.services.storage.
//
export const defaultStorageProvider = new LocalStorageProvider();
