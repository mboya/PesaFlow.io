// Next.js API route to proxy requests to the backend
// This allows the backend to remain on a private network while still being accessible
// to the browser through the frontend server

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000';
const EXCLUDED_REQUEST_HEADERS = ['host', 'connection', 'content-length'];
const EXCLUDED_RESPONSE_HEADERS = [
  'access-control-allow-origin', 
  'connection', 
  'content-encoding',  // Exclude Content-Encoding since response.text() decompresses automatically
  'content-length',    // Exclude Content-Length as it may be incorrect after decompression
  'transfer-encoding' // Exclude Transfer-Encoding as it's handled by fetch API
];
const TENANT_HEADERS = {
  SUBDOMAIN: 'X-Tenant-Subdomain',
  ID: 'X-Tenant-ID',
} as const;
const ALLOWED_CORS_ORIGINS = [
  process.env.FRONTEND_URL,
  ...((process.env.ALLOWED_CORS_ORIGINS || '').split(','))
]
  .map((origin) => normalizeOrigin(origin))
  .filter((origin): origin is string => Boolean(origin));

function normalizeOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function requestOrigin(request: NextRequest): string | null {
  const originHeader = request.headers.get('origin');
  if (originHeader) return normalizeOrigin(originHeader);

  const refererHeader = request.headers.get('referer');
  if (!refererHeader) return null;
  return normalizeOrigin(refererHeader);
}

function isOriginAllowed(request: NextRequest, origin: string): boolean {
  if (!origin) return false;
  if (origin === request.nextUrl.origin) return true;
  if (ALLOWED_CORS_ORIGINS.includes(origin)) return true;

  // Keep local development flexible without opening production.
  if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path, 'DELETE');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Handle CORS preflight requests
  // When credentials are included, we cannot use '*' for Access-Control-Allow-Origin
  // We must use the specific origin from the request
  const origin = requestOrigin(request);
  if (origin && !isOriginAllowed(request, origin)) {
    return NextResponse.json(
      { error: 'CORS origin not allowed' },
      { status: 403 }
    );
  }
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Subdomain, X-Tenant-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Authorization, X-Tenant-Subdomain, X-Tenant-ID',
  };
  
  // Only set Access-Control-Allow-Origin if we have a valid origin
  // For same-origin requests (no origin header), the browser doesn't need CORS headers
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  
  return new NextResponse(null, {
    status: 200,
    headers,
  });
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  const fullPath = pathSegments.join('/');
  let backendUrl = '';

  try {
    // Reconstruct the API path
    // When client requests /api/proxy/api/v1/subscriptions,
    // pathSegments will be ['api', 'v1', 'subscriptions']
    // We need to extract the actual endpoint path (everything after /api/v1/)

    // Remove 'api/v1' prefix if present (since client sends /api/proxy/api/v1/...)
    let apiPath = fullPath;
    if (fullPath.startsWith('api/v1/')) {
      apiPath = fullPath.substring('api/v1/'.length);
    } else if (fullPath === 'api/v1') {
      apiPath = '';
    } else if (fullPath.startsWith('api/v1')) {
      apiPath = fullPath.substring('api/v1'.length + 1); // +1 for the slash
    }
    
    const url = new URL(request.url);
    const queryString = url.search;
    
    // Build the backend URL with /api/v1/ prefix
    // If apiPath is empty, just use /api/v1
    const backendPath = apiPath ? `/api/v1/${apiPath}` : '/api/v1';
    backendUrl = `${BACKEND_URL}${backendPath}${queryString}`;


    // Get request body if present
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.text();
      } catch (e) {
        // No body
      }
    }

    // Forward headers (preserve exact casing for tenant headers)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (EXCLUDED_REQUEST_HEADERS.includes(lowerKey)) return;
      
      // Normalize tenant header casing for backend
      if (lowerKey === 'x-tenant-subdomain') {
        headers[TENANT_HEADERS.SUBDOMAIN] = value;
      } else if (lowerKey === 'x-tenant-id') {
        headers[TENANT_HEADERS.ID] = value;
      } else {
        headers[key] = value;
      }
    });

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });

    // Get response body
    let responseBody = await response.text();
    
    // Handle empty responses
    if (!responseBody && response.status === 200) {
      responseBody = '{}'; // Return empty JSON object for empty 200 responses
    }

    let statusCode = response.status;
    if (statusCode < 100 || statusCode >= 600) {
      // Invalid status code, default to gateway error.
      statusCode = 502;
    }

    // Create response with same status and headers
    const proxiedResponse = new NextResponse(statusCode === 304 ? null : responseBody, {
      status: statusCode,
      statusText: response.statusText,
    });

    // Extract Authorization header from response first (before forEach loop) to ensure we don't lose it
    // Note: Render/Cloudflare proxies may strip the Authorization header, so the backend also includes
    // the token in the response body as a fallback (see response.data.token)
    const isAuthEndpoint = backendPath.includes('/login') || backendPath.includes('/signup') || backendPath.includes('/otp/verify_login');
    const responseAuthHeader = response.headers.get('authorization') || response.headers.get('Authorization');
    if (responseAuthHeader) {
      // Only log in development to reduce production log noise
      if (process.env.NODE_ENV === 'development') {
        console.log('[Proxy] Found Authorization header from backend, forwarding to frontend');
      }
      proxiedResponse.headers.set('Authorization', responseAuthHeader);
    } else if (isAuthEndpoint) {
      // Authorization header may be stripped by Render/Cloudflare proxy
      // The backend includes the token in the response body as a fallback
      // The frontend will extract it from response.data.token
      // This is expected behavior on Render - no logging needed in production
      // Token extraction happens automatically in the frontend API client
    }

    // Forward response headers (excluding CORS and Authorization headers)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!EXCLUDED_RESPONSE_HEADERS.includes(lowerKey) && lowerKey !== 'authorization') {
        proxiedResponse.headers.set(key, value);
      }
    });

    // For authentication endpoints, explicitly disable caching at the proxy layer
    // to prevent browsers or intermediaries from caching responses that include
    // credentials or tokens.
    if (isAuthEndpoint) {
      proxiedResponse.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      proxiedResponse.headers.set('Pragma', 'no-cache');
      proxiedResponse.headers.set('Expires', '0');
    }

    // Set CORS headers for approved frontend origins only.
    const origin = requestOrigin(request);
    if (origin && isOriginAllowed(request, origin)) {
      proxiedResponse.headers.set('Access-Control-Allow-Origin', origin);
      proxiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      proxiedResponse.headers.set('Vary', 'Origin');
    }
    
    proxiedResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    proxiedResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Tenant-Subdomain, X-Tenant-ID'
    );
    
    // Expose Authorization header so Axios can read it from the response.
    // Browsers don't expose custom headers by default due to CORS restrictions.
    proxiedResponse.headers.set(
      'Access-Control-Expose-Headers',
      'Authorization, X-Tenant-Subdomain, X-Tenant-ID'
    );

    return proxiedResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    Sentry.withScope((scope) => {
      scope.setTag('proxy_route', 'api_proxy');
      scope.setTag('surface', 'frontend_server');
      scope.setContext('proxy_request', {
        method,
        path: fullPath,
        backend_url: backendUrl || null,
      });
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage('Unknown proxy error while forwarding request');
      }
    });

    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 502 }
    );
  }
}
