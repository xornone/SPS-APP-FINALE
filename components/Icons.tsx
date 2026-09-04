const PATHS: Record<string, string> = {
  home: '<path d="M4 11.5 12 4l8 7.5" stroke-linejoin="round"/><path d="M6.2 10v9a1 1 0 0 0 1 1h3.1v-6.2h3.4V20h3.1a1 1 0 0 0 1-1v-9"/>',
  bike: '<circle cx="6" cy="17" r="3.3"/><circle cx="18" cy="17" r="3.3"/><path d="M6 17 9.6 9h4.6l3 8" stroke-linejoin="round"/><path d="M9.6 9 8.2 6H6"/><path d="M12.5 9l2.6 3.7"/>',
  map: '<path d="M9 4.2 4 6.4v14L9 18l6 2.2 5-2.2v-14l-5 2.2-6-2.2Z" stroke-linejoin="round"/><path d="M9 4.2v13.8M15 6.4v13.8"/>',
  user: '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.5 20c1.4-4.1 4.2-6.1 7.5-6.1s6.1 2 7.5 6.1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.2v2.3M12 18.5v2.3M20.8 12h-2.3M5.5 12H3.2M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6M18.1 18.1l-1.6-1.6M7.5 7.5 5.9 5.9" stroke-linecap="round"/>',
  bell: '<path d="M6.2 9.2a5.8 5.8 0 1 1 11.6 0c0 4.2 1.4 5.6 1.4 5.6H4.8s1.4-1.4 1.4-5.6Z" stroke-linejoin="round"/><path d="M9.6 17.4a2.4 2.4 0 0 0 4.8 0"/>',
  chevL: '<path d="M15 5 8 12l7 7" stroke-linecap="round" stroke-linejoin="round"/>',
  chevR: '<path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>',
  download: '<path d="M12 4v11" stroke-linecap="round"/><path d="M8 11.5 12 15.5 16 11.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 18.5h13" stroke-linecap="round"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
  pencil: '<path d="M4.5 19.5 5.3 16 15.8 5.5l3.2 3.2L8.5 19.2l-4 .3Z" stroke-linejoin="round"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7" stroke-linecap="round"/><path d="M6.5 7.2 7.5 20h9l1-12.8" stroke-linejoin="round"/>',
  x: '<path d="M6 6l12 12M18 6 6 18" stroke-linecap="round"/>',
  mountain: '<path d="M3 19 8.6 8l3.6 6 1.7-2.6L21 19Z" stroke-linejoin="round"/>',
  flag: '<path d="M6.5 4v16" stroke-linecap="round"/><path d="M6.5 5.2h9.8l-2.3 3.3 2.3 3.3H6.5"/>',
  route: '<circle cx="6" cy="18" r="2.1"/><circle cx="18" cy="6" r="2.1"/><path d="M8 17c5.5-1 4-9 8-10"/>',
  target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
  check: '<path d="M5 13l4.5 4.5L19 8" stroke-linecap="round" stroke-linejoin="round"/>',
  members: '<circle cx="9" cy="8.3" r="3.1"/><circle cx="17" cy="9.3" r="2.5"/><path d="M3.3 19c1.1-3.4 3.2-5 5.7-5s4.6 1.6 5.7 5"/><path d="M15 14.4c2 .2 3.4 1.7 4.2 4.2"/>',
  gpx: '<rect x="4.5" y="3" width="15" height="18" rx="2.2"/><path d="M8 8.5h8M8 12h8M8 15.5h5"/>',
  minus: '<path d="M5 12h14" stroke-linecap="round"/>',
  logout: '<path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" stroke-linecap="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke-linecap="round" stroke-linejoin="round"/>',
  trophy: '<path d="M7 4.5h10v5a5 5 0 0 1-10 0v-5Z" stroke-linejoin="round"/><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 7 10.9M17 6h2.5v1.5A3.5 3.5 0 0 1 17 10.9" stroke-linecap="round"/><path d="M12 14.5v3M9 20h6M9.5 17.5h5" stroke-linecap="round"/>',
  external: '<path d="M9 6H6a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 6 19h10a1.5 1.5 0 0 0 1.5-1.5V15" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4.5h5.5V10M19.3 4.7l-8.6 8.6" stroke-linecap="round" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2.2M12 18.8V21M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M3 12h2.2M18.8 12H21M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" stroke-linecap="round"/>',
  cloudSun: '<path d="M9.3 8.2a3.4 3.4 0 1 1 3 5.1" stroke-linecap="round"/><path d="M9.5 3.2v1.6M5.3 5.7l1.1 1.1M3.6 10h1.6" stroke-linecap="round"/><path d="M8.3 19.8a3.6 3.6 0 0 1-.5-7.15 5 5 0 0 1 9.6-2.15 3.8 3.8 0 0 1-.7 9.3H8.3Z" stroke-linejoin="round"/>',
  cloud: '<path d="M7 18.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.3 9.2 4.2 4.2 0 0 1 16.5 18.5H7Z" stroke-linejoin="round"/>',
  rain: '<path d="M7 14.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.3 5.7 4.2 4.2 0 0 1 16.5 14.5H7Z" stroke-linejoin="round"/><path d="M9 17l-1 3.3M13 17l-1 3.3M17 17l-1 3.3" stroke-linecap="round"/>',
  storm: '<path d="M7 13a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.3 4.2 4.2 4.2 0 0 1 16.5 13H7Z" stroke-linejoin="round"/><path d="M13.2 13l-3 4.6h2.7L10.8 22" stroke-linecap="round" stroke-linejoin="round"/>',
  snow: '<path d="M7 13a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.3 4.2 4.2 4.2 0 0 1 16.5 13H7Z" stroke-linejoin="round"/><path d="M9 16.5v4.3M7 17.8l4 1.4M11 17.8l-4 1.4M15.5 16.5v4.3M13.5 17.8l4 1.4M17.5 17.8l-4 1.4" stroke-linecap="round"/>',
  fog: '<path d="M4 8.7h13" stroke-linecap="round"/><path d="M4 12.7h16" stroke-linecap="round"/><path d="M4 16.7h13" stroke-linecap="round"/>',
  arrowUp: '<path d="M12 20.5V5M6.3 10.3 12 4.5l5.7 5.8" stroke-linecap="round" stroke-linejoin="round"/>',
  send: '<path d="M4.2 11.8 19.5 4.5 15 19.5l-3.6-6.1-6.1-1.6Z" stroke-linejoin="round"/><path d="M11.4 13.4 19.5 4.5" stroke-linecap="round"/>',
};

export function Icon({
  name,
  size = 18,
  className,
}: {
  name: keyof typeof PATHS;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: PATHS[name] || "" }}
    />
  );
}
