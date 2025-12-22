// Next.js API route to proxy requests to the backend
// This allows the backend to remain on a private network while still being accessible
// to the browser through the frontend server

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000';
const EXCLUDED_REQUEST_HEADERS = ['host', 'connection', 'content-length'];
const EXCLUDED_RESPONSE_HEADERS = ['access-control-allow-origin', 'connection', 'etag', 'last-modified', 'cache-control'];
const TENANT_HEADERS = {
  SUBDOMAIN: 'X-Tenant-Subdomain',
  ID: 'X-Tenant-ID',
} as const;

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
  const origin = request.headers.get('origin') || 
                 (request.headers.get('referer') ? new URL(request.headers.get('referer')!).origin : null) ||
                 '*';
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Tenant-Subdomain, X-Tenant-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'Authorization, X-Tenant-Subdomain, X-Tenant-ID',
  };
  
  // Only set Access-Control-Allow-Origin if we have a valid origin
  // For same-origin requests (no origin header), the browser doesn't need CORS headers
  if (origin && origin !== '*') {
    headers['Access-Control-Allow-Origin'] = origin;
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
  try {
    // Reconstruct the API path
    // When client requests /api/proxy/api/v1/subscriptions,
    // pathSegments will be ['api', 'v1', 'subscriptions']
    // We need to extract the actual endpoint path (everything after /api/v1/)
    const fullPath = pathSegments.join('/');
    
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
    const backendUrl = `${BACKEND_URL}${backendPath}${queryString}`;


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

    // NextResponse doesn't accept certain status codes like 304
    // Map them to valid status codes or use 200 for 304 (Not Modified)
    let statusCode = response.status;
    if (statusCode === 304) {
      // 304 Not Modified - NextResponse doesn't support it, use 200 instead
      statusCode = 200;
    } else if (statusCode < 100 || statusCode >= 600) {
      // Invalid status code, default to 200
      statusCode = 200;
    }

    // Create response with same status and headers
    const proxiedResponse = new NextResponse(responseBody, {
      status: statusCode,
      statusText: response.statusText,
    });

    // Extract Authorization header from response first (before forEach loop) to ensure we don't lose it
    // Only log warnings for login/signup endpoints where we expect the header
    const isAuthEndpoint = backendPath.includes('/login') || backendPath.includes('/signup') || backendPath.includes('/otp/verify_login');
    const responseAuthHeader = response.headers.get('authorization') || response.headers.get('Authorization');
    if (responseAuthHeader) {
      console.log('[Proxy] Found Authorization header from backend, forwarding to frontend');
      proxiedResponse.headers.set('Authorization', responseAuthHeader);
    } else if (isAuthEndpoint) {
      // Only warn for auth endpoints where we expect the header
      console.warn('[Proxy] No Authorization header found in backend response for auth endpoint. Available headers:', Array.from(response.headers.keys()));
    }

    // Forward response headers (excluding CORS and cache headers)
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!EXCLUDED_RESPONSE_HEADERS.includes(lowerKey) && lowerKey !== 'authorization') {
        proxiedResponse.headers.set(key, value);
      }
    });
    
    // Set cache control to prevent caching issues
    proxiedResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    proxiedResponse.headers.set('Pragma', 'no-cache');
    proxiedResponse.headers.set('Expires', '0');

    // Set CORS headers for the frontend
    // When credentials are included, we cannot use '*' for Access-Control-Allow-Origin
    // We must use the specific origin from the request
    const origin = request.headers.get('origin') || 
                   (request.headers.get('referer') ? new URL(request.headers.get('referer')!).origin : null);
    
    if (origin) {
      proxiedResponse.headers.set('Access-Control-Allow-Origin', origin);
      proxiedResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    
    proxiedResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    proxiedResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Tenant-Subdomain, X-Tenant-ID'
    );
    
    // Expose Authorization header so Axios can read it from the response
    // Browsers don't expose custom headers by default due to CORS restrictions
    proxiedResponse.headers.set(
      'Access-Control-Expose-Headers',
      'Authorization, X-Tenant-Subdomain, X-Tenant-ID'
    );

    return proxiedResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to backend' },
      { status: 502 }
    );
  }
}

