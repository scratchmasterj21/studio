
import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// These environment variables MUST be set in your .env.local (and in Netlify for deployment)
// They are SERVER-SIDE secrets and should NOT be prefixed with NEXT_PUBLIC_
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT; // e.g., https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const R2_CUSTOM_PUBLIC_URL_BASE = process.env.R2_PUBLIC_URL_BASE; // User-defined public base URL (optional)

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
  console.error('Critical R2 configuration is missing in environment variables for presigned URL generation. Uploads will fail.');
  // Do not throw here as it might expose internal details in a production environment's initial load
  // Instead, the request handler will fail if these are not set.
}

let s3Client: S3Client | null = null;
if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_ENDPOINT) {
  s3Client = new S3Client({
    region: 'auto', // Cloudflare R2 generally uses 'auto' or a specific region like 'wnam'
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    // forcePathStyle: true, // Not typically needed for R2 with custom endpoints
  });
}

function getPublicUrlBase(): string | null {
    if (R2_CUSTOM_PUBLIC_URL_BASE) {
        // Ensure no trailing slash for custom base URL
        return R2_CUSTOM_PUBLIC_URL_BASE.endsWith('/') ? R2_CUSTOM_PUBLIC_URL_BASE.slice(0, -1) : R2_CUSTOM_PUBLIC_URL_BASE;
    }
    if (R2_ENDPOINT && R2_BUCKET_NAME) {
        try {
            const endpointUrl = new URL(R2_ENDPOINT);
            // Account ID is typically the first part of the hostname for R2 default endpoints.
            // e.g., <account_id>.r2.cloudflarestorage.com
            const accountId = endpointUrl.hostname.split('.')[0]; 
            if (accountId && endpointUrl.hostname.includes('.r2.cloudflarestorage.com') && accountId.length > 0) { // Added check for accountId.length
                 // Standard R2 public URL format: https://<bucket>.<account_id>.r2.cloudflarestorage.com
                 return `https://${R2_BUCKET_NAME}.${accountId}.r2.cloudflarestorage.com`;
            } else {
                 console.warn(`[R2 Public URL] Could not reliably derive account ID from R2_ENDPOINT: ${R2_ENDPOINT}. Hostname: ${endpointUrl.hostname}. Derived AccountID: ${accountId}`);
            }
        } catch (e) {
            console.warn('[R2 Public URL] Could not parse R2_ENDPOINT to derive public URL base:', e);
        }
    }
    console.warn('[R2 Public URL] R2_PUBLIC_URL_BASE is not set and public URL could not be reliably derived from R2_ENDPOINT and R2_BUCKET_NAME. Public URLs for files might be incorrect or missing. Ensure R2 objects are publicly readable for direct viewing.');
    return null; // Fallback if derivation fails
}


export async function GET(request: NextRequest) {
  if (!s3Client || !R2_BUCKET_NAME) { 
    console.error('[API Presigned URL] R2 service is not configured or critical variables are missing on the server.');
    return NextResponse.json({ error: 'R2 service is not configured on the server. File uploads are disabled.' }, { status: 503 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    const contentType = searchParams.get('contentType');

    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and contentType query parameters are required' }, { status: 400 });
    }

    // Basic sanitization (you might want more robust sanitization)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, '_');
    const uniqueKey = `uploads/${uuidv4()}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
      // ContentDisposition: `inline; filename="${sanitizedFilename}"`, // Helps browser suggest filename on download/view
    });

    const expiresIn = 300; // 5 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    let publicFileUrl = `${uniqueKey}`; // Default to just the key if base URL cannot be determined
    const publicUrlBase = getPublicUrlBase();
    let publicUrlNote = "";

    if (publicUrlBase) {
        publicFileUrl = `${publicUrlBase}/${uniqueKey}`;
    } else {
        publicUrlNote = `Public URL base for R2 could not be determined. Returning only file key: ${uniqueKey}. Ensure R2_PUBLIC_URL_BASE is set or R2_ENDPOINT and R2_BUCKET_NAME are correct for derivation, and that objects are publicly readable for viewing.`;
        console.warn(`[API Presigned URL] ${publicUrlNote}`);
    }

    return NextResponse.json({
      presignedUrl,
      fileKey: uniqueKey, // Key within the bucket
      bucket: R2_BUCKET_NAME,
      publicUrl: publicFileUrl, // The constructed public URL for viewing/linking
      method: 'PUT',
      ...(publicUrlNote && { note: publicUrlNote }) // Add note if public URL derivation had issues
    });

  } catch (error) {
    console.error('[API Presigned URL] Error generating presigned URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to generate presigned URL', details: errorMessage }, { status: 500 });
  }
}


    