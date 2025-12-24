# Adding Screenshots to Landing Page

This guide explains how to add real screenshots to the landing page's "See It In Action" section.

## Screenshot Locations

The landing page displays screenshots in the following order:

1. **Dashboard** (`/app/dashboard/page.tsx`)
2. **Subscriptions** (`/app/subscriptions/page.tsx`)
3. **Payment Methods** (`/app/payment-methods/page.tsx`)
4. **Invoices** (`/app/invoices/page.tsx`)

## How to Add Screenshots

### Option 1: Using Next.js Image Component (Recommended)

1. Take screenshots of each page and save them in `frontend/public/screenshots/`:
   - `dashboard.png` or `dashboard.jpg`
   - `subscriptions.png` or `subscriptions.jpg`
   - `payment-methods.png` or `payment-methods.jpg`
   - `invoices.png` or `invoices.jpg`

2. Update `LandingPage.tsx` to use the Image component:

```tsx
import Image from 'next/image';

// Replace the placeholder divs with:
<div className="relative rounded-2xl bg-white dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
  <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-700">
    <div className="w-3 h-3 rounded-full bg-red-500"></div>
    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
    <div className="w-3 h-3 rounded-full bg-green-500"></div>
    <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400">Dashboard - PesaFlow</div>
  </div>
  <div className="relative">
    <Image
      src="/screenshots/dashboard.png"
      alt="PesaFlow Dashboard"
      width={1200}
      height={800}
      className="w-full h-auto"
      priority={false}
    />
  </div>
</div>
```

### Option 2: Using External URLs

If screenshots are hosted elsewhere, use the `src` attribute directly:

```tsx
<img
  src="https://your-cdn.com/screenshots/dashboard.png"
  alt="PesaFlow Dashboard"
  className="w-full h-auto rounded-b-2xl"
/>
```

## Screenshot Guidelines

### Best Practices:
- **Resolution**: Use high-resolution screenshots (at least 1200px wide)
- **Format**: PNG for screenshots with text, JPG for photos
- **Aspect Ratio**: Maintain consistent aspect ratios (16:10 or 16:9 recommended)
- **Content**: Capture the full page or key sections
- **Dark Mode**: Consider taking screenshots in both light and dark modes
- **Privacy**: Blur or remove any sensitive customer data

### Taking Screenshots:

1. **Using Browser DevTools**:
   - Open the page in Chrome/Firefox
   - Press F12 to open DevTools
   - Press Cmd/Ctrl + Shift + P
   - Type "Capture screenshot" and select "Capture full size screenshot"

2. **Using Browser Extensions**:
   - Use extensions like "Full Page Screen Capture" for Chrome
   - Or "FireShot" for Firefox

3. **Using Screenshot Tools**:
   - macOS: Cmd + Shift + 4 (then select area)
   - Windows: Snipping Tool or Win + Shift + S
   - Linux: Various screenshot tools available

## Current Placeholder Structure

The current placeholders are located in `frontend/src/components/LandingPage.tsx` in the "See It In Action" section. Each placeholder includes:

- Browser window chrome (red/yellow/green dots)
- Page title in the address bar
- A gradient background with an icon
- Instructions on which screenshot to add

Simply replace the placeholder `<div>` content with your actual screenshot image.

## Example: Complete Screenshot Replacement

Replace this:
```tsx
<div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 min-h-[400px] flex items-center justify-center">
  <div className="text-center">
    <BarChart3 className="h-16 w-16 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
    <p className="text-sm text-zinc-500 dark:text-zinc-500">
      Dashboard Screenshot
      <br />
      <span className="text-xs">Add screenshot: /app/dashboard/page.tsx</span>
    </p>
  </div>
</div>
```

With this:
```tsx
<div className="relative">
  <Image
    src="/screenshots/dashboard.png"
    alt="PesaFlow Dashboard showing subscription metrics and revenue"
    width={1200}
    height={800}
    className="w-full h-auto"
  />
</div>
```

## Notes

- The browser chrome (red/yellow/green dots) is decorative and can be kept or removed
- Screenshots will automatically adapt to dark mode if you use Next.js Image component with proper styling
- Consider adding loading="lazy" for screenshots below the fold to improve performance
