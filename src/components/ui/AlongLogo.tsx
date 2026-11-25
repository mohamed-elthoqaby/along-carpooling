import React from "react";

interface AlongLogoProps {
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
}

export function AlongLogo({
  size = 34,
  showWordmark = true,
  showTagline = false,
}: AlongLogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Along logo"
        className="shrink-0 rounded-[12px]"
      >
        <rect width="48" height="48" rx="12" fill="#050412" />
        {/* Stylized curved 'A' route stroke */}
        <path
          d="M14 35L22.2 14.5C23.1 12.2 26.3 12.2 27.2 14.5L34.5 35"
          stroke="#1E90FF"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Flowing shared path crossbar */}
        <path
          d="M17.5 27.5C21 25 25.5 25 29.5 27.5"
          stroke="#8DCCFF"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Circular node representing people traveling together */}
        <circle cx="34.5" cy="14.5" r="3.6" fill="#1E90FF" />
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[20px] font-extrabold tracking-[-0.02em] text-[#050412]">
            Along
          </span>
          {showTagline && (
            <span className="mt-0.5 text-[11px] font-medium text-[#5E6878]">
              Carpool your way.
            </span>
          )}
        </span>
      )}
    </span>
  );
}
