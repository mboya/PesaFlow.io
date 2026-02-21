import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Temporarily disabled to debug refresh loop
  
  reactStrictMode: true,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Explicitly use webpack (not turbopack) to avoid build errors
  // Turbopack is still experimental and can cause issues in Docker builds
  // We use --webpack flag in package.json build script to force webpack
  
  // Add empty turbopack config to silence Next.js 16 warning when webpack config is present
  turbopack: {},
  
  // Reduce file watching sensitivity in Docker
  webpack: (config, { dev, isServer }) => {
    // Increase memory limit for webpack builds
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };
    
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay rebuild after first change
        ignored: /node_modules/,
      };
    }
    
    // Increase memory for large builds
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
};

const canUploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT
);

const sentryWebpackPluginOptions = {
  silent: true,
  sourcemaps: {
    disable: !canUploadSourceMaps,
  },
  ...(process.env.SENTRY_AUTH_TOKEN
    ? { authToken: process.env.SENTRY_AUTH_TOKEN }
    : {}),
  ...(process.env.SENTRY_ORG ? { org: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT
    ? { project: process.env.SENTRY_PROJECT }
    : {}),
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
