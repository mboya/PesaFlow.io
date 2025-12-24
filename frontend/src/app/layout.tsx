import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeScript } from "@/components/theme-script";
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
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
        <ThemeScript />
        <TenantProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
