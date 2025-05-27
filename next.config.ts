
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      // Add R2 public URL hostname here.
      // This is derived from your R2 bucket name and account ID.
      // For bucket 'firedesk' and endpoint 'https://d3e43595bd209aa38cafdb692da9e636.r2.cloudflarestorage.com',
      // the likely public hostname pattern for objects will be related to:
      // 'firedesk.<derived-account-id>.r2.cloudflarestorage.com'
      // or your custom domain if you've set one up and configured R2_PUBLIC_URL_BASE
      // Based on your R2_ENDPOINT (d3e43595bd209aa38cafdb692da9e636.r2.cloudflarestorage.com)
      // and R2_BUCKET_NAME (firedesk), if the account ID is the first part of the endpoint hostname,
      // the public object URLs might be like:
      // https://firedesk.d3e43595bd209aa38cafdb692da9e636.r2.cloudflarestorage.com/your-file-key
      // So the hostname would be: firedesk.d3e43595bd209aa38cafdb692da9e636.r2.cloudflarestorage.com
      // If R2_PUBLIC_URL_BASE is used, its hostname should be added here.
      // For the provided R2_ENDPOINT, the account ID is d3e43595bd209aa38cafdb692da9e636
      {
        protocol: 'https',
        hostname: `${process.env.R2_BUCKET_NAME}.${process.env.R2_ENDPOINT?.split('//')[1]?.split('.')[0]}.r2.cloudflarestorage.com`,
      },
       // Fallback for custom domain if R2_PUBLIC_URL_BASE is used (and its hostname is different)
       // This pattern is a bit generic, refine if you know the exact custom hostname.
      ...(process.env.R2_PUBLIC_URL_BASE ? [{
        protocol: 'https',
        hostname: new URL(process.env.R2_PUBLIC_URL_BASE).hostname,
      }] : []),
    ],
  },
};

export default nextConfig;
