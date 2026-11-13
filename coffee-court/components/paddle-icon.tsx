export default function PaddleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m8.1 17.6-5.2 5.2a1.8 1.8 0 0 0 2.6 2.6l5.2-5.2M9 16.7l2.3 2.3c1 1 2.5 1.3 3.7.7l7.7-4.1c1.3-.7 1.8-2.3 1.2-3.6a20 20 0 0 0-8-8c-1.3-.6-2.9-.1-3.6 1.2l-4.1 7.7c-.6 1.2-.3 2.7.8 3.8Z" />
      <path d="m7 18.7 2.3 2.3M13.5 5.3l9.2 9.2" />
    </svg>
  );
}
