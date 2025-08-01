import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp'],
  
  // API body size limits
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Limit for image/video uploads
    },
  },
  
  // Disable ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript checking during production builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@radix-ui/react-dialog', '@radix-ui/react-select', 'lucide-react'],
  },
  
  // Turbopack configuration (now stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Bundle size optimizations
    if (!dev && !isServer) {
      // Tree shaking for large libraries
      config.resolve.alias = {
        ...config.resolve.alias,
        'lodash': 'lodash-es',
      };

      // Chunk splitting for better caching
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 10,
            reuseExistingChunk: true,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix',
            priority: 20,
            reuseExistingChunk: true,
          },
          templates: {
            test: /[\\/]src[\\/]lib[\\/]templates[\\/]/,
            name: 'templates',
            priority: 30,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Worker support for heavy computations
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          name: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    return config;
  },

  // Security and performance headers
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS (only in production)
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          }] : []),
          // CSP header
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
              "style-src 'self' 'unsafe-inline'", // For inline styles
              "img-src 'self' data: blob: https:",
              "font-src 'self'",
              "connect-src 'self' https://api.openai.com https://api.runwayml.com",
              "media-src 'self' blob:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Compression
  compress: true,
  
  // Always use standalone output for Docker deployment
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
};

export default nextConfig;
