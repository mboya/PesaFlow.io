'use client';

export function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="landing-grid absolute inset-0 opacity-55" aria-hidden="true" />
      <div className="landing-noise absolute inset-0 opacity-45" aria-hidden="true" />
      <div
        className="landing-orb landing-orb-one absolute -left-20 top-12 h-72 w-72 rounded-full blur-3xl"
        aria-hidden="true"
      />
      <div
        className="landing-orb landing-orb-two absolute -right-12 top-28 h-[22rem] w-[22rem] rounded-full blur-3xl"
        aria-hidden="true"
      />
    </div>
  );
}
