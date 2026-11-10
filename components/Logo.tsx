export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#1e40af" />
      <circle cx="32" cy="32" r="18" fill="#fff" />
      <path d="M32 14a18 18 0 0 1 0 36 9 9 0 0 1 0-18 9 9 0 0 0 0-18z" fill="#dc2626" />
      <path d="M32 50a18 18 0 0 1 0-36 9 9 0 0 1 0 18 9 9 0 0 0 0 18z" fill="#1e40af" />
    </svg>
  );
}
