import { supabase } from "@/integrations/supabase/client";

/**
 * ==========================================
 * SUPABASE SETUP INSTRUCTIONS
 * ==========================================
 * - Create two private buckets in Supabase dashboard: "certificates" and "photos"
 * - Both buckets: public = false
 * - RLS policy for upload: authenticated users with admin role only
 * - RLS policy for select: authenticated users (own record) + signed URL access
 * ==========================================
 */

/**
 * Uploads a degree certificate file to Supabase storage.
 * @param file The file to upload (PDF, image)
 * @param rollNumber The student's roll number to organize folders
 * @returns The storage path of the uploaded file
 */
export async function uploadCertificate(file: File, rollNumber: string): Promise<string> {
  if (!file) throw new Error("No certificate file provided");
  
  const ext = file.name.split('.').pop();
  const uuid = crypto.randomUUID();
  const path = `${rollNumber}/${uuid}.${ext}`;

  const { data, error } = await supabase.storage
    .from("certificates")
    .upload(path, file);

  if (error) {
    throw new Error(`Failed to upload certificate: ${error.message}`);
  }

  return data.path;
}

/**
 * Uploads a student photo to Supabase storage.
 * @param file The file to upload (JPG, PNG)
 * @param rollNumber The student's roll number to organize folders
 * @returns The storage path of the uploaded file
 */
export async function uploadPhoto(file: File, rollNumber: string): Promise<string> {
  if (!file) throw new Error("No photo file provided");
  
  const ext = file.name.split('.').pop();
  const uuid = crypto.randomUUID();
  const path = `${rollNumber}/${uuid}.${ext}`;

  const { data, error } = await supabase.storage
    .from("photos")
    .upload(path, file);

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  return data.path;
}

/**
 * Removes a file from a private Supabase storage bucket.
 * Used for best-effort cleanup when a multi-step registration fails.
 */
export async function deleteStoredFile(bucket: string, path: string): Promise<void> {
  if (!path) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete ${bucket} file: ${error.message}`);
  }
}

/**
 * Generates a signed URL for a file in a private bucket.
 * @param bucket The name of the bucket ("certificates" or "photos")
 * @param path The storage path of the file
 * @param expiresIn Time in seconds before the URL expires (default: 900s / 15m)
 * @returns The signed URL string
 */
export async function getSignedUrl(bucket: string, path: string, expiresIn = 900): Promise<string> {
  if (!path) return "";
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}
