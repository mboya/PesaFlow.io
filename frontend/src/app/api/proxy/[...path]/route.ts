// Next.js API route to proxy requests to the backend
// This allows the backend to remain on a private network while still being accessible
// to the browser through the frontend server

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000';

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

    console.log(`[Proxy] ${method} ${request.url} -> ${backendUrl}`);

    // Get request body if present
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        body = await request.text();
      } catch (e) {
        // No body
      }
    }

    // Forward headers (excluding host and connection)
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (
        !['host', 'connection', 'content-length'].includes(key.toLowerCase())
      ) {
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

    // Forward response headers (excluding CORS, connection, and cache headers that might cause issues)
    // But explicitly include Authorization header for JWT tokens
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !['access-control-allow-origin', 'connection', 'etag', 'last-modified', 'cache-control'].includes(
          lowerKey
        ) || lowerKey === 'authorization'
      ) {
        proxiedResponse.headers.set(key, value);
      }
    });
    
    // Set cache control to prevent caching issues
    proxiedResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    proxiedResponse.headers.set('Pragma', 'no-cache');
    proxiedResponse.headers.set('Expires', '0');

    // Set CORS headers for the frontend
    proxiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    proxiedResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );
    proxiedResponse.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
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

