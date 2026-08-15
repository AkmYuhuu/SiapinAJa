import type { SVGProps } from "react";

// One consistent outline icon family (stroke 1.8, 24x24, round caps).
const paths: Record<string, React.ReactNode[]> = {
  home: [<path key="h" d="M3.5 10.5 12 3.5l8.5 7M5.5 9v11h13V9" />],
  tools: [
    <path key="t" d="M4 8.5A4 4 0 0 0 8 12.9V20h5v-7.1a4 4 0 0 0 4-4.4l-2.1 2.1-2.8-.7-.7-2.8L13.5 5a4 4 0 0 0-9.5 3.5Z" />,
  ],
  folder: [<path key="f" d="M3.5 6.5h6l2 2.5h9v9.5a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-12Z" />],
  star: [<path key="s" d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9L12 3.5Z" />],
  history: [
    <path key="h" d="M4 12a8 8 0 1 0 2.3-5.6M4 4.5V8h3.5" />,
    <path key="c" d="M12 8v4.2l2.8 1.7" />,
  ],
  wallet: [
    <path key="w" d="M4 7.5A2 2 0 0 1 6 5.5h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11Z" />,
    <path key="w2" d="M14 12h6" />,
  ],
  settings: [
    <path key="s" d="M4 7h10M18 7h2M4 17h2M10 17h10" />,
    <circle key="c1" cx="15.5" cy="7" r="2.2" />,
    <circle key="c2" cx="7.5" cy="17" r="2.2" />,
  ],
  logout: [
    <path key="l" d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14M10 12h10M17 8.5 20.5 12 17 15.5" />,
  ],
  help: [
    <circle key="c" cx="12" cy="12" r="8.25" />,
    <path key="p" d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2-2.5 3.5" />,
    <circle key="d" cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />,
  ],
  search: [
    <circle key="c" cx="10.5" cy="10.5" r="6.5" />,
    <path key="p" d="m15.5 15.5 5 5" />,
  ],
  plus: [<path key="p" d="M12 5v14M5 12h14" />],
  download: [
    <path key="d" d="M12 4v10M7.5 10.5 12 15l4.5-4.5M5 19.5h14" />,
  ],
  upload: [
    <path key="u" d="M12 15V5M7.5 9.5 12 5l4.5 4.5M5 19.5h14" />,
  ],
  copy: [
    <rect key="r" x="9" y="9" width="11" height="11" rx="1.5" />,
    <path key="p" d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />,
  ],
  trash: [
    <path key="t" d="M4.5 6.5h15M9.5 6.5V5h5v1.5M6.5 6.5l.8 13h9.4l.8-13M10 10.5v5.5M14 10.5v5.5" />,
  ],
  save: [
    <path key="s" d="M5 4.5h11l3 3V19.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" />,
    <path key="s2" d="M8 4.5V9h7V4.5M8.5 20v-5.5h7V20" />,
  ],
  print: [
    <path key="p" d="M7 8V4.5h10V8M5 8h14a1.5 1.5 0 0 1 1.5 1.5v6H17v4H7v-4H3.5v-6A1.5 1.5 0 0 1 5 8Z" />,
    <path key="p2" d="M7 14.5h10v5H7z" />,
  ],
  calculator: [
    <rect key="r" x="5.5" y="3.5" width="13" height="17" rx="2" />,
    <path key="p" d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01M8.5 19h.01M12 19h.01M15.5 19h.01" />,
  ],
  tag: [
    <path key="t" d="M11.3 3.5H20v8.7L10.8 21.4a1.7 1.7 0 0 1-2.4 0L3.4 16.3a1.7 1.7 0 0 1 0-2.4l7.9-10.4Z" />,
    <circle key="c" cx="15" cy="7.5" r="1.3" />,
  ],
  chart: [
    <path key="c" d="M4 4.5v15h16M8 15v-4.5M12 15V8M16 15v-6.5" />,
  ],
  target: [
    <circle key="c1" cx="12" cy="12" r="8" />,
    <circle key="c2" cx="12" cy="12" r="4.5" />,
    <circle key="c3" cx="12" cy="12" r="1.2" />,
  ],
  scale: [
    <path key="s" d="M12 4.5v15M5.5 19.5h13M7 8.5h10M7 8.5c-1.4 2-2 3.5-2 5a2 2 0 0 0 4 0c0-1.5-.6-3-2-5ZM17 8.5c-1.4 2-2 3.5-2 5a2 2 0 0 0 4 0c0-1.5-.6-3-2-5Z" />,
  ],
  clipboard: [
    <rect key="r" x="5.5" y="4.5" width="13" height="16" rx="1.5" />,
    <path key="p" d="M9 4.5A1 1 0 0 1 10 3.5h4a1 1 0 0 1 1 1V6H9V4.5ZM8.5 10h7M8.5 13.5h7M8.5 17h4.5" />,
  ],
  boxes: [
    <path key="b" d="M12 3.8 20 7.9v8.2l-8 4.1-8-4.1V7.9l8-4.1Z" />,
    <path key="b2" d="m3.8 8 8.2 4.2L20.2 8M12 12.2v8" />,
  ],
  receipt: [
    <path key="r" d="M6 3.5h12v17l-2.5-1.5-2.5 1.5-3-1.5-2.5 1.5L6 20.5v-17ZM9 8h6M9 11.5h6" />,
  ],
  stamp: [
    <path key="s" d="M8.5 7.5A2.5 2.5 0 0 1 11 5h2a2.5 2.5 0 0 1 2.5 2.5v2.5l2 2V15a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6.5 15v-3l2-2V7.5Z" />,
    <path key="s2" d="M12 4.5V3M8.5 18h7M8.5 20.5h7" />,
  ],
  truck: [
    <path key="t" d="M3 6.5h11v9.5H3V6.5ZM14 9.5h4l2.5 3v3.5H14V9.5Z" />,
    <circle key="c1" cx="7" cy="18.5" r="1.8" />,
    <circle key="c2" cx="17" cy="18.5" r="1.8" />,
  ],
  checklist: [
    <path key="c" d="M4 7l1.5 1.5L8.5 5.5M4 13l1.5 1.5L8.5 11.5M4 19l1.5 1.5L8.5 17.5M12 8h8M12 14h8M12 20h8" />,
  ],
  package: [
    <path key="p" d="M12 3.5 20 7.5v9l-8 4-8-4v-9l8-4Z" />,
    <path key="p2" d="M4 7.5l8 4 8-4M12 11.5v9" />,
    <path key="p3" d="M8 5.5l8 4" />,
  ],
  briefcase: [
    <rect key="r" x="3.5" y="7.5" width="17" height="12" rx="1.5" />,
    <path key="p" d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17M12 12v2.5" />,
  ],
  piggy: [
    <path key="p" d="M19 9.5a3.2 3.2 0 0 0-4.1-3.1 3.2 3.2 0 0 0-5.8 0A3.2 3.2 0 0 0 5 9.5c0 2.5 2.3 4 4.5 5l0 2.5h5v-2.5c2.2-1 4.5-2.5 4.5-5Z" />,
    <path key="p2" d="M14 19v1.5M9 19.5 8.5 21M17.5 8h.5" />,
    <path key="p3" d="M8 10.5c0-1 1-2 2-2" />,
  ],
  layers: [
    <path key="l" d="M12 3.5 20.5 8 12 12.5 3.5 8 12 3.5Z" />,
    <path key="l2" d="M4.5 12.5 12 16l7.5-3.5M4.5 16.5 12 20l7.5-3.5" />,
  ],
  file: [
    <path key="f" d="M6 3.5h7.5L17.5 7.5V20.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" />,
    <path key="f2" d="M13.5 3.5V7.5h4M8.5 12h7M8.5 15.5h7M8.5 19h4.5" />,
  ],
  coins: [
    <circle key="c1" cx="9" cy="9" r="5.5" />,
    <circle key="c2" cx="15" cy="15" r="5.5" />,
    <path key="p" d="M9 7v4M7 9h4M15 13v4M13 15h4" />,
  ],
  compress: [
    <path key="c" d="M9 4.5v4.5h-4.5M15 4.5V9h4.5M9 19.5v-4.5h-4.5M15 19.5V15h4.5" />,
    <path key="c2" d="M8 12h8" />,
  ],
  resize: [
    <path key="r" d="M20 9v6.5a1.5 1.5 0 0 1-1.5 1.5H12M4 15V8.5A1.5 1.5 0 0 1 5.5 7H12" />,
    <path key="p" d="M12 20l4-4-4-4M12 4l-4 4 4 4" />,
  ],
  camera: [
    <path key="c" d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />,
    <circle key="o" cx="12" cy="13" r="3.5" />,
  ],
  device: [
    <rect key="r" x="7" y="3.5" width="10" height="17" rx="1.5" />,
    <path key="p" d="M10.5 18h3" />,
  ],
  laptop: [
    <rect key="r" x="4.5" y="5" width="15" height="10.5" rx="1" />,
    <path key="p" d="M2.5 19.5h19l-1.8-2.5H4.3L2.5 19.5Z" />,
  ],
  grid: [
    <rect key="r" x="4" y="4" width="6.5" height="6.5" rx="1" />,
    <rect key="r2" x="13.5" y="4" width="6.5" height="6.5" rx="1" />,
    <rect key="r3" x="4" y="13.5" width="6.5" height="6.5" rx="1" />,
    <rect key="r4" x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />,
  ],
  pricetag: [
    <path key="p" d="M4.5 4.5H10L20 14.5a1.6 1.6 0 0 1 0 2.3l-3.2 3.2a1.6 1.6 0 0 1-2.3 0L4.5 10V4.5Z" />,
    <circle key="c" cx="8.5" cy="8.5" r="1" />,
  ],
  idcard: [
    <rect key="r" x="3.5" y="5" width="17" height="14" rx="1.5" />,
    <circle key="c" cx="9" cy="11" r="2.2" />,
    <path key="p" d="M5.8 16.5a3.3 3.3 0 0 1 6.4 0M14 10.5h4.5M14 14h4.5" />,
  ],
  store: [
    <path key="s" d="M4.5 10l1.3-5.5h12.4L19.5 10M4.5 10v1a1.8 1.8 0 0 0 3.6 0V10h3.2v1a1.8 1.8 0 0 0 3.6 0V10h3.2v1a1.8 1.8 0 0 0 3.6 0v-1M5.5 12.5V19h13v-6.5M9 19v-4.5h6V19" />,
  ],
  lock: [
    <rect key="r" x="5.5" y="10.5" width="13" height="9.5" rx="1.5" />,
    <path key="p" d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />,
  ],
  check: [<path key="c" d="m4.5 12.5 5 5 10-11" />],
  alert: [
    <path key="a" d="M12 3.8 21 19.5H3L12 3.8Z" />,
    <path key="a2" d="M12 9.5v4M12 16.2v.01" />,
  ],
  chevron: [<path key="c" d="m9 6 6 6-6 6" />],
  external: [
    <path key="e" d="M14 4.5h5.5V10M19.5 4.5 11 13" />,
    <path key="e2" d="M19.5 13.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5h5.5" />,
  ],
  image: [
    <rect key="r" x="3.5" y="4.5" width="17" height="15" rx="1.5" />,
    <circle key="c" cx="9" cy="9.5" r="1.5" />,
    <path key="p" d="m3.5 16 4.5-4 4 3.5 3-2.5 5.5 5" />,
  ],
  spark: [
    <path key="s" d="M12 3.5 13.7 10 20 12l-6.3 2L12 20.5 10.3 14 4 12l6.3-2L12 3.5ZM19 16.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" />,
  ],
  send: [<path key="s" d="m3.5 5 17 7-17 7 3-7-3-7ZM6.5 12h9" />],
  database: [
    <ellipse key="e" cx="12" cy="5.5" rx="7.5" ry="2.5" />,
    <path key="p" d="M4.5 5.5v13c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5v-13M4.5 12c0 1.4 3.4 2.5 7.5 2.5s7.5-1.1 7.5-2.5" />,
  ],
  refresh: [
    <path key="r" d="M4.5 12a7.5 7.5 0 0 1 12.9-5.1L19.5 9M19.5 4.5V9H15" />,
    <path key="r2" d="M19.5 12a7.5 7.5 0 0 1-12.9 5.1L4.5 15M4.5 19.5V15H9" />,
  ],
  pencil: [
    <path key="p" d="M4 20l.8-3.6L16 5.2a1.9 1.9 0 0 1 2.7 0l.1.1a1.9 1.9 0 0 1 0 2.7L7.6 19.2 4 20Z" />,
    <path key="l" d="M14 7.5l2.5 2.5" />,
  ],
  x: [<path key="x" d="M6 6l12 12M18 6 6 18" />],
};

export type IconName = keyof typeof paths;

export function Icon({
  name,
  className = "size-4",
  strokeWidth = 1.8,
  ...rest
}: { name: IconName; className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}