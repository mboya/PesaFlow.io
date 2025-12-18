// Next.js API route to proxy webhook requests to the backend
// M-Pesa and other services send callbacks to /webhooks/* which need to reach the backend
// The backend is on a private network, so we proxy through the frontend

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyWebhook(request, path, 'POST');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyWebhook(request, path, 'GET');
}

async function proxyWebhook(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    // Build the webhook path (no /api/v1/ prefix for webhooks)
    const webhookPath = `/webhooks/${pathSegments.join('/')}`;
    const url = new URL(request.url);
    const queryString = url.search;
    
    const backendUrl = `${BACKEND_URL}${webhookPath}${queryString}`;

    console.log(`[Webhook Proxy] ${method} ${request.url} -> ${backendUrl}`);

    // Get request body
    let body: string | undefined;
    if (method === 'POST') {
      try {
        body = await request.text();
        console.log(`[Webhook Proxy] Body: ${body.substring(0, 500)}...`);
      } catch (e) {
        // No body
      }
    }

    // Forward headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
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
    const responseBody = await response.text();
    
    console.log(`[Webhook Proxy] Response: ${response.status} ${responseBody.substring(0, 200)}`);

    // Create response
    const proxiedResponse = new NextResponse(responseBody || '{}', {
      status: response.status,
      statusText: response.statusText,
    });

    // Forward response headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!['access-control-allow-origin', 'connection'].includes(lowerKey)) {
        proxiedResponse.headers.set(key, value);
      }
    });

    return proxiedResponse;
  } catch (error) {
    console.error('[Webhook Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy webhook to backend' },
      { status: 502 }
    );
  }
}

