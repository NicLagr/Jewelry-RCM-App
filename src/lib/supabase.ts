import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Storage bucket name for job photos
export const STORAGE_BUCKET = "job-photos";

// Lazy-initialized Supabase client
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// For backwards compatibility - lazy getter
export const supabase = {
  get storage() {
    return getSupabaseClient().storage;
  },
};

// Generate a unique filename for uploaded photos
export function generatePhotoFilename(
  jobId: string,
  originalFilename: string
): string {
  const timestamp = Date.now();
  const extension = originalFilename.split(".").pop()?.toLowerCase() || "jpg";
  return `${jobId}/${timestamp}.${extension}`;
}

// Get public URL for a stored photo
export function getPhotoUrl(path: string): string {
  const { data } = getSupabaseClient().storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

