import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // reactCompiler: true, // Temporarily disabled to debug refresh loop
  
  reactStrictMode: true,
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Explicitly use webpack (not turbopack) to avoid build errors
  // Turbopack is still experimental and can cause issues in Docker builds
  // Set empty turbopack config to disable it and use webpack instead
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

export default nextConfig;
