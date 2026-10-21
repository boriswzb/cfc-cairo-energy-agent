import React from 'react';

const paths = {
  overview: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
    </>
  ),
  server: (
    <>
      <rect x="4" y="4" width="16" height="6" rx="1.5" />
      <rect x="4" y="14" width="16" height="6" rx="1.5" />
      <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" />
      <path d="M14 3.5v4h4M9 12h6M9 16h6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="m7.5 10 4.5 4.5 4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  chevronRight: <path d="m10 8 4 4-4 4" />,
  arrowRight: <path d="M4 12h15M14 7l5 5-5 5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  alert: (
    <>
      <path d="M12 4 3.5 19h17L12 4Z" />
      <path d="M12 9v4.5M12 16.8v.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.2" />
    </>
  ),
  building: (
    <>
      <path d="M5 21V4.5h9V21M14 9h5v12M3 21h18" />
      <path d="M8 8h3M8 11.5h3M8 15h3M8 18.5h3M17 12h.01M17 15.5h.01M17 19h.01" />
    </>
  ),
  mouse: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="5" />
      <path d="M12 6.5v4" />
    </>
  ),
  window: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="1" />
      <path d="M12 4v16M3.5 12h17" />
    </>
  ),
  shade: (
    <>
      <path d="M4 5h16M4 9h16M4 13h16M7 17h10" />
      <path d="M5 5 3 21M19 5l2 16" />
    </>
  ),
  solar: (
    <>
      <path d="m4 20 3-12h11l3 12H4Z" />
      <path d="M8 8h9M7 12h11M6.2 16h12.5M12 8v12" />
    </>
  ),
  elevator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M12 3v18M5 12h14M8 7l1-1 1 1M14 7l1-1 1 1" />
    </>
  ),
  zone: (
    <>
      <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h6M14 7h6M4 17h10M18 17h2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />,
  chart: (
    <>
      <path d="M4 20V5M4 20h16" />
      <path d="m7.5 15 4-4 3 2.5L19 8" />
    </>
  ),
  bolt: <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-10A1.5 1.5 0 0 0 3 5.5v10A1.5 1.5 0 0 0 4.5 17H8" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5" />
    </>
  ),
  snow: (
    <>
      <path d="M12 2v20M4 6l16 12M20 6 4 18M7 3.5 12 7l5-3.5M7 20.5 12 17l5 3.5" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />,
  sparkles: (
    <>
      <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" />
      <path d="m18.5 13.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" />
      <path d="m5 14 .7 1.8 1.8.7-1.8.7L5 19l-.7-1.8-1.8-.7 1.8-.7L5 14Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  external: (
    <>
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v6H4V6h6" />
    </>
  ),
  collapse: <path d="M5 12h14" />,
};

export function Icon({ name, size = 18, className = '', strokeWidth = 1.7, ...rest }) {
  const content = paths[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {content}
    </svg>
  );
}

export function BrandMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="brand-mark" aria-hidden="true">
      <defs>
        <linearGradient id="cfcGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f6b73c" />
          <stop offset="100%" stopColor="#e60012" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="61" height="61" rx="16" fill="rgba(6,17,28,.8)" stroke="rgba(255,255,255,.08)" />
      <path d="M15 47V23l17-9 17 9v24" fill="none" stroke="url(#cfcGold)" strokeWidth="2.6" />
      <path d="M22 47V31h20v16M15 47h34" fill="none" stroke="rgba(147,197,216,.55)" strokeWidth="1.4" />
      <circle cx="32" cy="22.5" r="3.6" fill="url(#cfcGold)" />
    </svg>
  );
}

export function PageGlyph({ page }) {
  return <Icon name={page} size={17} />;
}
