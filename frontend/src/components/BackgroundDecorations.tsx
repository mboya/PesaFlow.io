'use client';

export function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-zinc-200/10 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-zinc-200/10 to-transparent rounded-full blur-3xl"></div>
    </div>
  );
}
