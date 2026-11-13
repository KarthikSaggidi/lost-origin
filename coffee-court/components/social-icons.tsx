const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  "aria-hidden": true as const,
};
export function InstagramIcon() {
  return (
    <svg {...base} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function YoutubeIcon() {
  return (
    <svg {...base} fill="currentColor">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="m10 8 6 4-6 4V8Z" fill="white" />
    </svg>
  );
}
export function LinkedinIcon() {
  return (
    <svg {...base} fill="currentColor">
      <circle cx="5" cy="5" r="2" />
      <path d="M3.3 9h3.4v12H3.3zM10 9h3.2v1.6c.9-1.2 2-1.9 3.6-1.9 3 0 4.1 1.8 4.1 4.9V21h-3.5v-6.6c0-1.7-.4-2.8-1.9-2.8-1.6 0-2.1 1.2-2.1 2.8V21H10V9Z" />
    </svg>
  );
}
