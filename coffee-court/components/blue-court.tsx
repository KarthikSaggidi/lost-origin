import { useId } from "react";
export default function BlueCourt({ className = "" }: { className?: string }) {
  const gradientId = `court-tile-${useId().replaceAll(":", "")}`;
  return (
    <svg
      className={`blue-court ${className}`}
      viewBox="0 0 120 94"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M29 9h62l22 73H7L29 9Z"
        fill="#eaf4fc"
        stroke="#adc7dd"
        strokeWidth="1.6"
      />
      <path d="M32 13h56l19 64H13L32 13Z" fill="#57b7df" />
      <path d="M32 13h56l19 64H13L32 13Z" fill={`url(#${gradientId})`} />
      <path
        d="M60 13v64M23 43h74M28 28h64M19 58h82"
        stroke="white"
        strokeWidth="1.2"
      />
      <path d="M23 43h74" stroke="#d6f1fc" strokeWidth="2.4" />
      <defs>
        <linearGradient
          id={gradientId}
          x1="24"
          y1="14"
          x2="105"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#81d0ed" stopOpacity=".8" />
          <stop offset="1" stopColor="#318dc7" stopOpacity=".55" />
        </linearGradient>
      </defs>
    </svg>
  );
}
