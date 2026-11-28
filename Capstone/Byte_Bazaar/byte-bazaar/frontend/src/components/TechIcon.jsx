import React from "react";
export default function TechIcon({ type = "", size = 56 }) {
  const monitor = /Computers|Monitors|Workstation|Laptop|Build/.test(type),
    chip = /Components|Processors|Graphics|Memory/.test(type),
    network = /Network|Router|Security/.test(type),
    code = /Software|Digital|Development|Programming/.test(type);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {monitor ? (
        <>
          <rect x="7" y="9" width="50" height="34" rx="3" />
          <path d="M24 55h16M32 43v12M13 36h38" />
        </>
      ) : chip ? (
        <>
          <rect x="15" y="15" width="34" height="34" rx="3" />
          <rect x="23" y="23" width="18" height="18" rx="1" />
          {[22, 32, 42].map((n) => (
            <path key={n} d={`M${n} 7v8M${n} 49v8M7 ${n}h8M49 ${n}h8`} />
          ))}
        </>
      ) : network ? (
        <>
          <rect x="8" y="32" width="48" height="21" rx="4" />
          <path d="M17 32V15M47 32V15M18 43h1M26 43h1M38 43h8M24 20a12 12 0 0 1 16 0M20 13a19 19 0 0 1 24 0" />
        </>
      ) : code ? (
        <>
          <rect x="6" y="10" width="52" height="44" rx="4" />
          <path d="M6 20h52M15 15h1M22 15h1M24 29l-8 8 8 8M40 29l8 8-8 8M35 27l-6 20" />
        </>
      ) : (
        <>
          <rect x="9" y="16" width="46" height="33" rx="4" />
          <path d="M17 25h30M17 33h22M17 41h12M22 16v-5h20v5" />
        </>
      )}
    </svg>
  );
}
