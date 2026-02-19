import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Mono, Sora } from "next/font/google";

import { ToastContainer } from "@/components";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "PesaFlow - Subscription Billing Powered by M-Pesa",
  description: "Automate recurring payments, manage subscriptions, and grow your business with Kenya's most trusted payment platform. Built for SaaS companies and service providers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${sora.variable} ${plusJakarta.variable} ${spaceMono.variable} antialiased font-sans`}
      >
        {/* Suppress HMR WebSocket connection errors in Docker - runs immediately */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Suppress WebSocket HMR errors - must run before Next.js scripts
                if (typeof window === 'undefined') return;
                
                const originalError = console.error;
                const originalWarn = console.warn;
                
                function shouldSuppress(message) {
                  if (typeof message !== 'string') return false;
                  return (
                    message.includes('WebSocket connection to') && 
                    (message.includes('_next/webpack-hmr') || message.includes('webpack-hmr'))
                  );
                }
                
                console.error = function(...args) {
                  const message = args.map(arg => String(arg)).join(' ');
                  if (shouldSuppress(message)) return;
                  originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                  const message = args.map(arg => String(arg)).join(' ');
                  if (shouldSuppress(message)) return;
                  originalWarn.apply(console, args);
                };
                
                // Intercept WebSocket creation to suppress HMR errors at source
                if (typeof WebSocket !== 'undefined') {
                  const OriginalWebSocket = WebSocket;
                  window.WebSocket = function(...args) {
                    const ws = new OriginalWebSocket(...args);
                    const url = args[0] || '';
                    if (url.includes('_next/webpack-hmr') || url.includes('webpack-hmr')) {
                      // Suppress all errors for HMR WebSocket
                      ws.onerror = function() { return false; };
                      ws.onclose = function() { return false; };
                    }
                    return ws;
                  };
                  // Copy static properties
                  Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
                  Object.setPrototypeOf(window.WebSocket.prototype, OriginalWebSocket.prototype);
                }
              })();
            `,
          }}
        />
        {/* Theme script removed - always use light mode */}
        <AuthProvider>
          <ToastProvider>
            {children}
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
