
import { ExportFormat } from "./types.ts";

/**
 * Uploads a file to storage and returns public URL
 * @param supabaseAdmin Supabase admin client
 * @param filePath Storage file path
 * @param fileContent File content as string
 * @param contentType Content type
 * @returns Public URL for the file
 */
export async function uploadToStorage(
  supabaseAdmin: any,
  filePath: string,
  fileContent: string,
  contentType: string
): Promise<string> {
  console.log(`Uploading file to dataset_exports/${filePath} with content type ${contentType}`);
  
  // Check if the bucket exists
  const { data: buckets, error: bucketError } = await supabaseAdmin.storage
    .listBuckets();
    
  if (bucketError) {
    console.error("Error listing buckets:", bucketError);
    throw new Error(`Error listing buckets: ${bucketError.message}`);
  }
  
  const bucketExists = buckets.some((bucket: any) => bucket.name === "dataset_exports");
  
  if (!bucketExists) {
    console.log("dataset_exports bucket doesn't exist, creating it...");
    
    // Create the bucket
    const { error: createError } = await supabaseAdmin.storage
      .createBucket("dataset_exports", {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });
      
    if (createError) {
      console.error("Error creating bucket:", createError);
      throw new Error(`Error creating storage bucket: ${createError.message}`);
    }
    
    console.log("dataset_exports bucket created successfully");
  }
  
  // Create a proper Blob with the right content type
  const fileBlob = new Blob([fileContent], { type: contentType });
  
  // Upload to storage
  const { data: upload, error: uploadError } = await supabaseAdmin.storage
    .from("dataset_exports")
    .upload(filePath, fileBlob, {
      contentType,
      upsert: true,
    });
  
  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`Error saving file: ${uploadError.message}`);
  }
  
  console.log("File uploaded successfully, getting public URL");
  
  // Get public URL for the file
  const { data: publicURL } = supabaseAdmin.storage
    .from("dataset_exports")
    .getPublicUrl(filePath);
  
  console.log("Public URL:", publicURL.publicUrl);
  
  return publicURL.publicUrl;
}

/**
 * Generates a file name based on dataset name, timestamp and format
 * @param datasetName Dataset name
 * @param format Export format
 * @param customFileName Optional custom file name
 * @returns Generated file name
 */
export function generateFileName(datasetName: string, format: ExportFormat, customFileName?: string | null): string {
  if (customFileName) {
    return customFileName;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
  const sanitizedName = (datasetName || "dataset").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return `${sanitizedName}_${timestamp}.${format}`;
}

/**
 * Gets content type based on export format
 * @param format Export format
 * @returns Content type string
 */
export function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return "text/csv";
    case 'xlsx':
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case 'json':
    default:
      return "application/json";
  }
}

/**
 * Gets file extension based on export format
 * @param format Export format
 * @returns File extension
 */
export function getFileExtension(format: ExportFormat): string {
  return format;
}
