
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
// R2_PUBLIC_URL_BASE is now read directly in getPublicUrlBase function

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
  console.error('Critical R2 configuration is missing in environment variables for presigned URL generation. Uploads will fail.');
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
  });
}

function getPublicUrlBase(): string | null {
    const customPublicUrlBase = process.env.R2_PUBLIC_URL_BASE;
    if (customPublicUrlBase) {
        console.log('[API Presigned URL] Using R2_PUBLIC_URL_BASE directly from process.env:', customPublicUrlBase);
        return customPublicUrlBase.endsWith('/') ? customPublicUrlBase.slice(0, -1) : customPublicUrlBase;
    }
    console.log('[API Presigned URL] R2_PUBLIC_URL_BASE is not set in environment. Attempting to derive from R2_ENDPOINT and R2_BUCKET_NAME.');
    if (R2_ENDPOINT && R2_BUCKET_NAME) {
        try {
            const endpointUrl = new URL(R2_ENDPOINT);
            const accountId = endpointUrl.hostname.split('.')[0];
            if (accountId && accountId.length > 0 && endpointUrl.hostname.includes('.r2.cloudflarestorage.com')) {
                 const derivedUrl = `https://${R2_BUCKET_NAME}.${accountId}.r2.cloudflarestorage.com`;
                 console.log('[API Presigned URL] Derived public URL base:', derivedUrl);
                 return derivedUrl;
            } else {
                 console.warn(`[API Presigned URL] Could not reliably derive account ID from R2_ENDPOINT: ${R2_ENDPOINT}. Hostname: ${endpointUrl.hostname}. Derived AccountID: ${accountId}`);
            }
        } catch (e) {
            console.warn('[API Presigned URL] Could not parse R2_ENDPOINT to derive public URL base:', e);
        }
    }
    console.warn('[API Presigned URL] Public URL base could not be determined. Public URLs for files might be incorrect or missing. Ensure R2 objects are publicly readable for direct viewing.');
    return null;
}


export async function GET(request: NextRequest) {
  // Log the raw environment variable value as seen by the server process
  console.log('[API Presigned URL Handler] Value of process.env.R2_PUBLIC_URL_BASE at request time:', process.env.R2_PUBLIC_URL_BASE);

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

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, '_');
    const uniqueKey = `uploads/${uuidv4()}-${sanitizedFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: uniqueKey,
      ContentType: contentType,
    });

    const expiresIn = 300; // 5 minutes
    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    let publicFileUrl = `${uniqueKey}`; 
    const publicUrlBase = getPublicUrlBase(); // This function now also logs its decision path
    let publicUrlNote = "";

    if (publicUrlBase) {
        publicFileUrl = `${publicUrlBase}/${uniqueKey}`;
    } else {
        publicUrlNote = `Public URL base for R2 could not be determined. Returning only file key: ${uniqueKey}. Ensure R2_PUBLIC_URL_BASE is set or R2_ENDPOINT and R2_BUCKET_NAME are correct for derivation, and that objects are publicly readable for viewing. If R2_PUBLIC_URL_BASE is set in .env.local, ensure the server was restarted.`;
        console.warn(`[API Presigned URL] ${publicUrlNote}`);
    }
    
    console.log('[API Presigned URL] Final constructed publicFileUrl:', publicFileUrl);

    return NextResponse.json({
      presignedUrl,
      fileKey: uniqueKey,
      bucket: R2_BUCKET_NAME,
      publicUrl: publicFileUrl,
      method: 'PUT',
      ...(publicUrlNote && { note: publicUrlNote })
    });

  } catch (error) {
    console.error('[API Presigned URL] Error generating presigned URL:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to generate presigned URL', details: errorMessage }, { status: 500 });
  }
}
