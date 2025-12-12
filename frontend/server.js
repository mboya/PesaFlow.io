// Custom Next.js server with WebSocket proxy support
// This allows proxying WebSocket connections to the backend while keeping it private

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { createProxyMiddleware } = require('http-proxy-middleware');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

// Backend URL from environment variable (internal Docker network)
const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000';
const WS_BACKEND_URL = BACKEND_URL.replace('http://', 'ws://').replace('https://', 'wss://');

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Create WebSocket proxy middleware
const wsProxy = createProxyMiddleware({
  target: WS_BACKEND_URL,
  ws: true,
  changeOrigin: true,
  pathRewrite: {
    '^/api/proxy/ws': '/cable', // Rewrite /api/proxy/ws to /cable
  },
  logLevel: dev ? 'debug' : 'warn',
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle WebSocket upgrade requests for /api/proxy/ws
      if (pathname === '/api/proxy/ws' || pathname.startsWith('/api/proxy/ws/')) {
        // For HTTP requests to WebSocket endpoint, return 426 Upgrade Required
        if (req.headers.upgrade !== 'websocket') {
          res.writeHead(426, { 'Upgrade': 'websocket' });
          res.end('WebSocket upgrade required');
          return;
        }
        // The actual WebSocket upgrade is handled in the 'upgrade' event
        return;
      }

      // Handle regular HTTP requests
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Handle WebSocket upgrade
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);

    if (pathname === '/api/proxy/ws' || pathname.startsWith('/api/proxy/ws/')) {
      // Proxy WebSocket upgrade to backend
      wsProxy.upgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> WebSocket proxy configured: ws://${hostname}:${port}/api/proxy/ws -> ${WS_BACKEND_URL}/cable`);
    });
});

