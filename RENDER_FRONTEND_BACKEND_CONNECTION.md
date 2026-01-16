# Connecting Frontend to Backend on Render

This guide explains how to configure the frontend to communicate with the backend when deploying to Render.

## Architecture Overview

Your application uses a **proxy pattern** where:
- The frontend acts as a proxy for all backend API requests
- Client-side code makes requests to `/api/proxy` (handled by Next.js API routes)
- Next.js API routes forward requests to the backend
- WebSocket connections are also proxied through the frontend

```
Browser → Frontend (/api/proxy) → Backend (/api/v1/...)
```

## Step-by-Step Configuration

### 1. Deploy Your Services

First, deploy both services using the `render.yaml` blueprint:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Select `render.yaml`
5. Render will create:
   - `pesaflow-backend` (Rails API)
   - `pesaflow-frontend` (Next.js)
   - `pesaflow-redis` (Redis)
   - `pesaflow-sidekiq` (Background worker)

### 2. Get Your Service URLs

After deployment, Render will provide URLs for each service:
- Backend: `https://pesaflow-backend.onrender.com`
- Frontend: `https://pesaflow-frontend.onrender.com`

**Note:** Your actual URLs will be different. Replace these examples with your actual Render URLs.

### 3. Configure Frontend Environment Variables

Go to your **Frontend Service** (`pesaflow-frontend`) in Render Dashboard:

1. Click on the service
2. Go to "Environment" tab
3. Set the following environment variables:

#### `NEXT_PUBLIC_API_URL`
**Value:** `https://pesaflow-frontend.onrender.com/api/proxy`

**Why:** This is the URL that client-side code uses to make API requests. It points to the frontend's proxy endpoint, not directly to the backend.

**Example:**
```
NEXT_PUBLIC_API_URL=https://pesaflow-frontend.onrender.com/api/proxy
```

#### `BACKEND_INTERNAL_URL`
**Value:** `https://pesaflow-backend.onrender.com`

**Why:** This is used by Next.js API routes (server-side) to proxy requests to the backend. On Render, services communicate via their public URLs.

**Example:**
```
BACKEND_INTERNAL_URL=https://pesaflow-backend.onrender.com
```

#### `NEXT_PUBLIC_WS_URL`
**Value:** `wss://pesaflow-frontend.onrender.com/api/proxy/ws`

**Why:** This is the WebSocket URL for real-time connections. It also goes through the frontend proxy.

**Example:**
```
NEXT_PUBLIC_WS_URL=wss://pesaflow-frontend.onrender.com/api/proxy/ws
```

### 4. Configure Backend Environment Variables

Go to your **Backend Service** (`pesaflow-backend`) in Render Dashboard:

1. Click on the service
2. Go to "Environment" tab
3. Set the following important variables:

#### `FRONTEND_URL`
**Value:** `https://pesaflow-frontend.onrender.com`

**Why:** Used for CORS configuration and generating callback URLs.

**Example:**
```
FRONTEND_URL=https://pesaflow-frontend.onrender.com
```

#### `APP_HOST`
**Value:** `pesaflow-backend.onrender.com`

**Why:** Used for generating webhook callback URLs.

**Example:**
```
APP_HOST=pesaflow-backend.onrender.com
```

#### `MPESA_CALLBACK_URL`
**Value:** `https://pesaflow-backend.onrender.com/webhooks/stk_push/callback`

**Why:** M-Pesa webhooks must go directly to the backend, not through the frontend proxy.

**Example:**
```
MPESA_CALLBACK_URL=https://pesaflow-backend.onrender.com/webhooks/stk_push/callback
```

### 5. Verify the Connection

After setting all environment variables:

1. **Restart both services** (Render will auto-restart, but you can manually restart)
2. **Test the backend:**
   ```bash
   curl https://pesaflow-backend.onrender.com/up
   # Should return: {"status":"ok"}
   ```
3. **Test the frontend:**
   - Visit: `https://pesaflow-frontend.onrender.com`
   - Try logging in or making an API request
   - Check browser console for any errors

## How It Works

### HTTP Requests Flow

1. **Client-side request:**
   ```javascript
   // Frontend code makes request
   fetch('/api/proxy/subscriptions')
   ```

2. **Next.js API route receives:**
   - Route: `/api/proxy/[...path]/route.ts`
   - Extracts path: `subscriptions`
   - Prepends `/api/v1/`: `/api/v1/subscriptions`

3. **Proxies to backend:**
   ```javascript
   // Uses BACKEND_INTERNAL_URL
   fetch('https://pesaflow-backend.onrender.com/api/v1/subscriptions')
   ```

4. **Backend responds:**
   - Response is forwarded back through the proxy
   - Client receives the response

### WebSocket Connections Flow

1. **Client connects:**
   ```javascript
   // Frontend code connects
   new WebSocket('wss://pesaflow-frontend.onrender.com/api/proxy/ws')
   ```

2. **Frontend server.js handles:**
   - WebSocket upgrade request
   - Proxies to backend: `wss://pesaflow-backend.onrender.com/cable`

3. **Backend ActionCable:**
   - Receives WebSocket connection
   - Handles real-time updates

## Troubleshooting

### Frontend can't connect to backend

**Symptoms:**
- API requests fail
- 502 Bad Gateway errors
- Network errors in browser console

**Solutions:**
1. Verify `BACKEND_INTERNAL_URL` is set correctly
2. Check backend is running: `https://pesaflow-backend.onrender.com/up`
3. Check backend logs in Render dashboard
4. Ensure backend has `FRONTEND_URL` set for CORS

### CORS Errors

**Symptoms:**
- Browser console shows CORS errors
- Requests blocked by browser

**Solutions:**
1. Verify `FRONTEND_URL` is set in backend environment variables
2. Check backend CORS configuration allows the frontend URL
3. Ensure `NEXT_PUBLIC_API_URL` uses the correct frontend URL

### WebSocket Connection Fails

**Symptoms:**
- WebSocket connection errors
- Real-time features not working

**Solutions:**
1. Verify `NEXT_PUBLIC_WS_URL` uses `wss://` (secure WebSocket)
2. Check `BACKEND_INTERNAL_URL` is correct
3. Ensure backend ActionCable is configured correctly
4. Check both frontend and backend logs

### Environment Variables Not Updating

**Symptoms:**
- Changes to env vars don't take effect
- Old values still being used

**Solutions:**
1. Restart the service after changing environment variables
2. Check for typos in variable names
3. Verify values are set (not empty)
4. Check service logs for environment variable values

## Quick Reference

### Frontend Environment Variables

| Variable | Example Value | Purpose |
|----------|--------------|---------|
| `NEXT_PUBLIC_API_URL` | `https://pesaflow-frontend.onrender.com/api/proxy` | Client-side API endpoint |
| `BACKEND_INTERNAL_URL` | `https://pesaflow-backend.onrender.com` | Server-side backend URL |
| `NEXT_PUBLIC_WS_URL` | `wss://pesaflow-frontend.onrender.com/api/proxy/ws` | WebSocket endpoint |

### Backend Environment Variables

| Variable | Example Value | Purpose |
|----------|--------------|---------|
| `FRONTEND_URL` | `https://pesaflow-frontend.onrender.com` | CORS and callback URLs |
| `APP_HOST` | `pesaflow-backend.onrender.com` | Webhook callback host |
| `MPESA_CALLBACK_URL` | `https://pesaflow-backend.onrender.com/webhooks/stk_push/callback` | M-Pesa webhook URL |

## Additional Notes

- **Render Services Communication:** On Render, services communicate via their public URLs. There's no special internal network URL needed.
- **HTTPS Required:** Always use `https://` URLs in production. Render provides free SSL certificates.
- **WebSocket Protocol:** Use `wss://` (secure WebSocket) for production, `ws://` only for local development.
- **Environment Variable Updates:** After changing environment variables, Render will automatically restart the service.

## Support

If you encounter issues:
1. Check Render service logs
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Ensure both services are running and healthy
