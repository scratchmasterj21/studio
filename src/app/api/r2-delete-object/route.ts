
import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Environment variables (SERVER-SIDE ONLY - ensure these are set in .env.local or deployment environment)
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

let s3Client: S3Client | null = null;

if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && R2_ENDPOINT) {
  s3Client = new S3Client({
    region: 'auto', // Cloudflare R2 generally uses 'auto'
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.error('CRITICAL R2 Delete API: R2 client configuration variables are missing in environment variables. Object deletion will fail.');
}

export async function POST(request: NextRequest) {
  if (!s3Client || !R2_BUCKET_NAME) {
    console.error('[API R2 Delete] R2 service is not properly configured on the server due to missing env vars.');
    return NextResponse.json({ error: 'R2 service is not configured on the server. File deletion is disabled.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { fileKey } = body;

    if (!fileKey || typeof fileKey !== 'string') {
      return NextResponse.json({ error: 'fileKey is required in the request body and must be a string' }, { status: 400 });
    }

    console.log(`[API R2 Delete] Attempting to delete object with key: ${fileKey} from bucket: ${R2_BUCKET_NAME}`);

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    const response = await s3Client.send(command);

    // According to AWS S3 docs for DeleteObject, a 204 No Content is returned on successful deletion.
    // It doesn't error if the object doesn't exist (it's idempotent).
    if (response.$metadata.httpStatusCode === 204) {
      console.log(`[API R2 Delete] Successfully deleted object: ${fileKey} (or it did not exist).`);
      return NextResponse.json({ success: true, message: `Object ${fileKey} deleted successfully or did not exist.` });
    } else {
      // This path is less likely if the command itself doesn't throw for other AWS errors.
      // Log a warning if status code is not 204.
      console.warn(`[API R2 Delete] DeleteObject command for ${fileKey} returned status ${response.$metadata.httpStatusCode}. Response:`, response);
      return NextResponse.json({ success: false, message: `Deletion of ${fileKey} resulted in status ${response.$metadata.httpStatusCode}.` }, { status: response.$metadata.httpStatusCode || 500 });
    }

  } catch (error) {
    console.error('[API R2 Delete] Error deleting object from R2:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error during R2 object deletion.';
    // If the error is an S3 error, it might have more details
    if (error && typeof error === 'object' && 'name' in error) {
        console.error(`[API R2 Delete] S3 Error Name: ${error.name}`);
    }
    return NextResponse.json({ error: 'Failed to delete object from R2', details: errorMessage }, { status: 500 });
  }
}
